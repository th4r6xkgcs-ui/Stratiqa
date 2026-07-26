import { profitForResult } from "@/lib/picks/validation";
import { settleGameMarket, settlePlayerProp } from "@/lib/picks/settlement.js";
import { settlementRunStatus } from "@/lib/settlement/operations.js";
import { getSessionUser } from "@/lib/auth/session";
import { picksRepository } from "@/repositories/picks";
import { configuredPlayerStatLeagues, getPlayerStatsProvider } from "@/services/player-stats-provider";
import { LiveResultsProvider } from "@/services/results-provider";
import { settlementOperations, type SettlementFailure } from "@/services/settlement-operations";

async function settlePicks(request: Request) {
  const runId = crypto.randomUUID();
  const startedAt = new Date();
  const secret = process.env.CRON_SECRET;
  const cronAuthorized = Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
  const user = request.method === "POST" && !cronAuthorized ? await getSessionUser() : null;
  const adminEmails = (process.env.STRATIQA_ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  const manualAuthorized = Boolean(user && adminEmails.includes(user.email.toLowerCase()));
  if (!cronAuthorized && !manualAuthorized) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const apiKey = process.env.STRATIQA_ODDS_API_KEY;
  if (!apiKey) return Response.json({ error: "Results provider is not configured." }, { status: 503 });

  let operationsActive = false;
  let lockAcquired = false;
  try {
    lockAcquired = settlementOperations.configured() && await settlementOperations.acquire(runId);
    operationsActive = lockAcquired;
    if (settlementOperations.configured() && !lockAcquired) {
      return Response.json({ runId, status: "already-running", error: "A settlement run is already active." }, { status: 409 });
    }
    if (operationsActive) await settlementOperations.start(runId, cronAuthorized ? "cron" : "manual");
  } catch (error) {
    console.error("Settlement operations storage unavailable; continuing in compatibility mode", error);
    if (lockAcquired) {
      try { await settlementOperations.release(runId); } catch (releaseError) { console.error("Failed to release compatibility lock", releaseError); }
    }
    operationsActive = false;
    lockAcquired = false;
  }

  const failures: SettlementFailure[] = [];
  let checkedGames = 0;
  let checkedProps = 0;
  let settled = 0;
  let settledProps = 0;
  let deferredGames = 0;
  let deferredProps = 0;
  let propProviderError: string | null = null;
  try {
    const [pending, recentSettledProps] = await Promise.all([
      picksRepository.listPendingProvider(),
      picksRepository.listRecentSettledProps(),
    ]);
  const gameMarkets = pending.filter((pick) => ["h2h", "spreads", "totals"].includes(pick.marketKey ?? ""));
  checkedGames = gameMarkets.length;
  const bySport = new Map<string, typeof gameMarkets>();
  for (const pick of gameMarkets) {
    if (!pick.providerSportKey || !pick.providerEventId) continue;
    bySport.set(pick.providerSportKey, [...(bySport.get(pick.providerSportKey) ?? []), pick]);
  }
  const provider = new LiveResultsProvider(apiKey);

  for (const [sportKey, picks] of bySport) {
    try {
      const scores = await provider.getCompleted(sportKey, [...new Set(picks.map((pick) => pick.providerEventId!))]);
      const scoreById = new Map(scores.map((score) => [score.eventId, score]));
      for (const pick of picks) {
        const result = settleGameMarket(pick, scoreById.get(pick.providerEventId!));
        if (result === "pending") {
          deferredGames += 1;
          continue;
        }
        const profit = profitForResult(pick.americanOdds, pick.stakeUnits, result);
        if (await picksRepository.settleProvider(pick.id, result, profit)) settled += 1;
      }
    } catch (error) {
      deferredGames += picks.length;
      failures.push({ scope: `game-results:${sportKey}`, reason: error instanceof Error ? error.message : "Provider unavailable" });
    }
  }

  const props = [
    ...pending.filter((pick) => !["h2h", "spreads", "totals"].includes(pick.marketKey ?? "")),
    ...recentSettledProps,
  ];
  checkedProps = props.length;
  if (props.length) {
    try {
      const bySport = new Map<string, typeof props>();
      for (const pick of props) {
        if (pick.providerSportKey) bySport.set(pick.providerSportKey, [...(bySport.get(pick.providerSportKey) ?? []), pick]);
      }
      for (const [sportKey, sportPicks] of bySport) {
        const statsProvider = getPlayerStatsProvider(sportKey);
        if (!statsProvider) {
          deferredProps += sportPicks.length;
          failures.push({ scope: `player-stats:${sportKey}`, reason: "No free official-stat adapter is configured." });
          continue;
        }
        try {
          const stats = await statsProvider.getFinal(sportPicks.flatMap((pick) => pick.providerEventId ? [pick.providerEventId] : []));
          for (const pick of sportPicks) {
            const stat = stats.find((item) =>
              item.eventId === pick.providerEventId &&
              item.marketKey.toLowerCase() === pick.marketKey?.toLowerCase() &&
              item.participant.trim().toLowerCase() === pick.participantName?.trim().toLowerCase(),
            );
            if (!stat) {
              deferredProps += 1;
              continue;
            }
            const settlement = settlePlayerProp(pick, stat);
            if (settlement.result === "pending") {
              deferredProps += 1;
              continue;
            }
            const profit = profitForResult(pick.americanOdds, pick.stakeUnits, settlement.result);
            const metadata = {
              provider: `player-stats:${sportKey}`,
              reason: settlement.reason,
              statValue: settlement.actual,
              revision: stat.revision,
            };
            if (pick.verificationStatus === "pending") {
              if (await picksRepository.settleProvider(pick.id, settlement.result, profit, metadata)) settledProps += 1;
            } else if (stat.revision && stat.revision !== pick.settlementRevision) {
              if (await picksRepository.reviseProvider(pick.id, settlement.result, profit, { ...metadata, revision: stat.revision })) settledProps += 1;
            }
          }
        } catch (error) {
          deferredProps += sportPicks.length;
          failures.push({ scope: `player-stats:${sportKey}`, reason: error instanceof Error ? error.message : "Provider unavailable" });
        }
      }
    } catch (error) {
      console.error("Player prop settlement provider failed", error);
      propProviderError = "temporarily-unavailable";
      failures.push({ scope: "player-stats", reason: error instanceof Error ? error.message : "Provider unavailable" });
    }
  }

    const status = settlementRunStatus({ failures: failures.length, settled: settled + settledProps, deferred: deferredGames + deferredProps });
    const metrics = { checkedGames, checkedProps, settledGames: settled, settledProps, deferredGames, deferredProps, failures };
    if (operationsActive) await settlementOperations.finish(runId, status, metrics);
    return Response.json({
      runId, status, startedAt: startedAt.toISOString(), finishedAt: new Date().toISOString(),
      ...metrics,
      propProvider: propProviderError ?? (configuredPlayerStatLeagues().length ? "configured" : "waiting-for-provider"),
      configuredLeagues: configuredPlayerStatLeagues(),
    });
  } catch (error) {
    failures.push({ scope: "settlement-job", reason: error instanceof Error ? error.message : "Settlement job failed" });
    const metrics = { checkedGames, checkedProps, settledGames: settled, settledProps, deferredGames, deferredProps, failures };
    if (operationsActive) {
      try { await settlementOperations.finish(runId, "failed", metrics); } catch (storageError) { console.error("Failed to persist settlement failure", storageError); }
    }
    return Response.json({ runId, status: "failed", ...metrics, error: "Settlement run failed safely." }, { status: 503 });
  } finally {
    if (lockAcquired) {
      try { await settlementOperations.release(runId); } catch (error) { console.error("Failed to release settlement lock", error); }
    }
  }
}

export const GET = settlePicks;
export const POST = settlePicks;
