import { profitForResult } from "@/lib/picks/validation";
import { settleGameMarket } from "@/lib/picks/settlement.js";
import { picksRepository } from "@/repositories/picks";
import { LiveResultsProvider } from "@/services/results-provider";

async function settlePicks(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const apiKey = process.env.STRATIQA_ODDS_API_KEY;
  if (!apiKey) return Response.json({ error: "Results provider is not configured." }, { status: 503 });

  const pending = await picksRepository.listPendingProvider();
  const bySport = new Map<string, typeof pending>();
  for (const pick of pending) {
    if (!pick.providerSportKey || !pick.providerEventId) continue;
    bySport.set(pick.providerSportKey, [...(bySport.get(pick.providerSportKey) ?? []), pick]);
  }
  const provider = new LiveResultsProvider(apiKey);
  let settled = 0;

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

  return Response.json({ checked: pending.length, settled });
}

export const GET = settlePicks;
export const POST = settlePicks;
