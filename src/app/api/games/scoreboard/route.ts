import { getScoreboard, scoreboardSports, type ScoreboardSport } from "@/services/scoreboard-provider";

export async function GET(request: Request) {
  const sport = new URL(request.url).searchParams.get("sport") ?? "baseball_mlb";
  if (!scoreboardSports.includes(sport as ScoreboardSport)) return Response.json({ error: "Unsupported league." }, { status: 400 });
  try {
    const events = await getScoreboard(sport as ScoreboardSport);
    return Response.json({ events, provider: "ESPN public scoreboard", updatedAt: new Date().toISOString(), refreshAfterSeconds: 30 });
  } catch {
    return Response.json({ error: "Public scoreboard is temporarily unavailable." }, { status: 503 });
  }
}
