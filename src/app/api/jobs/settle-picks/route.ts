import { profitForResult } from "@/lib/picks/validation";
import { settleGameMarket, settlePlayerProp } from "@/lib/picks/settlement.js";
import { picksRepository } from "@/repositories/picks";
import { configuredPlayerStatLeagues, getPlayerStatsProvider } from "@/services/player-stats-provider";
import { LiveResultsProvider } from "@/services/results-provider";

async function settlePicks(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const apiKey = process.env.STRATIQA_ODDS_API_KEY;
  if (!apiKey) return Response.json({ error: "Results provider is not configured." }, { status: 503 });

  const pending = await picksRepository.listPendingProvider();
  const gameMarkets = pending.filter((pick) => ["h2h", "spreads", "totals"].includes(pick.marketKey ?? ""));
  const bySport = new Map<string, typeof gameMarkets>();
  for (const pick of gameMarkets) {
    if (!pick.providerSportKey || !pick.providerEventId) continue;
    bySport.set(pick.providerSportKey, [...(bySport.get(pick.providerSportKey) ?? []), pick]);
  }
  const provider = new LiveResultsProvider(apiKey);
  let settled = 0;
  let settledProps = 0;

  for (const [sportKey, picks] of bySport) {
    const scores = await provider.getCompleted(sportKey, [...new Set(picks.map((pick) => pick.providerEventId!))]);
    const scoreById = new Map(scores.map((score) => [score.eventId, score]));
    for (const pick of picks) {
      const result = settleGameMarket(pick, scoreById.get(pick.providerEventId!));
      if (result === "pending") continue;
      const profit = profitForResult(pick.americanOdds, pick.stakeUnits, result);
      if (await picksRepository.settleProvider(pick.id, result, profit)) settled += 1;
    }
  }

  const props = pending.filter((pick) => !["h2h", "spreads", "totals"].includes(pick.marketKey ?? ""));
  let propProviderError: string | null = null;
  if (props.length) {
    try {
      const bySport = new Map<string, typeof props>();
      for (const pick of props) {
        if (pick.providerSportKey) bySport.set(pick.providerSportKey, [...(bySport.get(pick.providerSportKey) ?? []), pick]);
      }
      for (const [sportKey, sportPicks] of bySport) {
        const statsProvider = getPlayerStatsProvider(sportKey);
        if (!statsProvider) continue;
        const stats = await statsProvider.getFinal(sportPicks.flatMap((pick) => pick.providerEventId ? [pick.providerEventId] : []));
        for (const pick of sportPicks) {
          const stat = stats.find((item) =>
            item.eventId === pick.providerEventId &&
            item.marketKey.toLowerCase() === pick.marketKey?.toLowerCase() &&
            item.participant.trim().toLowerCase() === pick.participantName?.trim().toLowerCase(),
          );
          if (!stat) continue;
          const settlement = settlePlayerProp(pick, stat);
          if (settlement.result === "pending") continue;
          const profit = profitForResult(pick.americanOdds, pick.stakeUnits, settlement.result);
          if (await picksRepository.settleProvider(pick.id, settlement.result, profit, {
            provider: `player-stats:${sportKey}`,
            reason: settlement.reason,
            statValue: settlement.actual,
            revision: stat.revision,
          })) settledProps += 1;
        }
      }
    } catch (error) {
      console.error("Player prop settlement provider failed", error);
      propProviderError = "temporarily-unavailable";
    }
  }

  return Response.json({
    checkedGames: gameMarkets.length,
    checkedProps: props.length,
    settledGames: settled,
    settledProps,
    propProvider: propProviderError ?? (configuredPlayerStatLeagues().length ? "configured" : "waiting-for-provider"),
    configuredLeagues: configuredPlayerStatLeagues(),
  });
}

export const GET = settlePicks;
export const POST = settlePicks;
