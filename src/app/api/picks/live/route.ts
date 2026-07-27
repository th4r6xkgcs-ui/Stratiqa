import { getSessionUser } from "@/lib/auth/session";
import { pickLifecycle } from "@/lib/picks/lifecycle.js";
import { picksRepository } from "@/repositories/picks";
import { LiveResultsProvider } from "@/services/results-provider";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in to follow your picks during games." }, { status: 401 });
  const apiKey = process.env.STRATIQA_ODDS_API_KEY;
  const picks = (await picksRepository.list(user.id)).filter((pick) => pick.source === "provider");
  const pending = picks.filter((pick) => pick.result === "pending" && pick.providerEventId && pick.providerSportKey);
  const scoreByEvent = new Map();
  const unavailableSports: string[] = [];

  if (apiKey) {
    const provider = new LiveResultsProvider(apiKey);
    const bySport = new Map<string, string[]>();
    for (const pick of pending) {
      bySport.set(pick.providerSportKey!, [...new Set([...(bySport.get(pick.providerSportKey!) ?? []), pick.providerEventId!])]);
    }
    await Promise.all([...bySport].map(async ([sport, eventIds]) => {
      try {
        for (const score of await provider.getScores(sport, eventIds)) scoreByEvent.set(score.eventId, score);
      } catch {
        unavailableSports.push(sport);
      }
    }));
  }

  return Response.json({
    updatedAt: new Date().toISOString(),
    refreshAfterSeconds: 90,
    provider: apiKey ? "live" : "schedule",
    unavailableSports,
    picks: picks.map((pick) => {
      const score = pick.providerEventId ? scoreByEvent.get(pick.providerEventId) : undefined;
      return {
        pickId: pick.id,
        state: pickLifecycle(pick, score),
        completed: Boolean(score?.completed),
        homeTeam: score?.homeTeam ?? null,
        awayTeam: score?.awayTeam ?? null,
        homeScore: score?.homeScore ?? null,
        awayScore: score?.awayScore ?? null,
      };
    }),
  });
}
