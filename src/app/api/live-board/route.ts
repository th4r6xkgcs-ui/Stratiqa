import { getLiveBoard, isLiveBoardSport } from "@/services";

export async function GET(request: Request) {
  const sport = new URL(request.url).searchParams.get("sport") ?? "baseball_mlb";
  if (!isLiveBoardSport(sport)) return Response.json({ error: "That league is not supported." }, { status: 400 });
  try {
    const result = await getLiveBoard(sport);
    return Response.json({
      events: result.data, provider: result.provider, mode: result.mode,
      updatedAt: result.updatedAt, stale: Boolean(result.stale),
    });
  } catch (error) {
    console.error("Live board unavailable", error);
    return Response.json({ events: [], mode: "unavailable", updatedAt: new Date().toISOString(), stale: true }, { status: 503 });
  }
}
