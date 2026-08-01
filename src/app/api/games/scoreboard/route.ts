import { getScoreboard, scoreboardSports, type ScoreboardSport } from "@/services/scoreboard-provider";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const sport = params.get("sport") ?? "baseball_mlb";
  const date = params.get("date");
  if (!scoreboardSports.includes(sport as ScoreboardSport)) return Response.json({ error: "Unsupported league." }, { status: 400 });
  if (date && !/^\d{8}$/.test(date)) return Response.json({ error: "Invalid scoreboard date." }, { status: 400 });
  try {
    const events = await getScoreboard(sport as ScoreboardSport, date ?? undefined);
    return Response.json({ events, provider: "ESPN public scoreboard", updatedAt: new Date().toISOString(), refreshAfterSeconds: 30 });
  } catch {
    return Response.json({ error: "Public scoreboard is temporarily unavailable." }, { status: 503 });
  }
}
