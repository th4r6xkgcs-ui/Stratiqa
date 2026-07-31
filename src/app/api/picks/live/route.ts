import { getSessionUser } from "@/lib/auth/session";
import { pickLifecycle } from "@/lib/picks/lifecycle.js";
import { picksRepository } from "@/repositories/picks";
import { LiveResultsProvider } from "@/services/results-provider";
import { settleGameMarket } from "@/lib/picks/settlement.js";
import { profitForResult } from "@/lib/picks/validation";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in to follow your picks during games." }, { status: 401 });
  const apiKey = process.env.STRATIQA_ODDS_API_KEY;
  const picks = (await picksRepository.list(user.id)).filter((pick) => pick.source === "provider");
  const pending = picks.filter((pick) => pick.result === "pending" && pick.providerEventId && pick.providerSportKey);
  const scoreByEvent = new Map();
  const unavailableSports: string[] = [];

  if (apiKey) {
    const historicalProvider = new LiveResultsProvider(apiKey);
    const bySport = new Map<string, string[]>();
    for (const pick of pending) {
      bySport.set(pick.providerSportKey!, [...new Set([...(bySport.get(pick.providerSportKey!) ?? []), pick.providerEventId!])]);
    }
    await Promise.all([...bySport].map(async ([sport, eventIds]) => {
      try {
        for (const score of await historicalProvider.getScores(sport, eventIds)) scoreByEvent.set(score.eventId, score);
      } catch {
        unavailableSports.push(sport);
      }
    }));
    const settled = new Map<string, string>();
    for (const pick of pending.filter((item) => ["h2h", "spreads", "totals"].includes(item.marketKey ?? ""))) {
      let score = scoreByEvent.get(pick.providerEventId!);
      let historical = false;
      if (!score && pick.eventCommenceAt && Date.now() - new Date(pick.eventCommenceAt).getTime() > 3 * 86_400_000) {
        score = await historicalProvider.getHistoricalByMatchup(pick.providerSportKey!, pick.eventCommenceAt, pick.eventName) ?? undefined;
        historical = Boolean(score);
      }
      if (score) scoreByEvent.set(pick.providerEventId!, score);
      const result = settleGameMarket(pick, score);
      if (result === "pending") continue;
      const profit = profitForResult(pick.americanOdds, pick.stakeUnits, result);
      if (await picksRepository.settleProvider(pick.id, result, profit, historical ? { provider: "espn-historical-score", reason: "Historical final score reconciled from Game Center." } : undefined)) settled.set(pick.id, result);
    }
    for (const pick of picks) if (settled.has(pick.id)) {
      pick.result = settled.get(pick.id)! as typeof pick.result;
      pick.verificationStatus = "verified";
    }
  }

  const tracked = picks.map((pick) => {
      const score = pick.providerEventId ? scoreByEvent.get(pick.providerEventId) : undefined;
      return {
        pickId: pick.id,
        eventId: pick.providerEventId,
        sportKey: pick.providerSportKey,
        eventName: pick.eventName,
        selection: pick.selection,
        marketKey: pick.marketKey,
        outcomeName: pick.outcomeName,
        linePoint: pick.linePoint,
        participantName: pick.participantName,
        pickCardId: pick.pickCardId,
        providerStatValue: pick.providerStatValue,
        settlementReason: pick.settlementReason,
        confidence: pick.confidence,
        americanOdds: pick.americanOdds,
        eventCommenceAt: pick.eventCommenceAt,
        result: pick.result,
        state: pickLifecycle(pick, score),
        completed: Boolean(score?.completed),
        homeTeam: score?.homeTeam ?? null,
        awayTeam: score?.awayTeam ?? null,
        homeScore: score?.homeScore ?? null,
        awayScore: score?.awayScore ?? null,
      };
    });
  const hasLive = tracked.some((pick) => pick.state === "live");
  const hasUpcoming = tracked.some((pick) => pick.state === "upcoming");
  return Response.json({
    updatedAt: new Date().toISOString(),
    refreshAfterSeconds: hasLive ? 45 : hasUpcoming ? 120 : 0,
    provider: apiKey ? "live" : "schedule",
    unavailableSports,
    picks: tracked,
  });
}
