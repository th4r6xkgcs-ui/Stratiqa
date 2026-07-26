import { getSessionUser } from "@/lib/auth/session";
import { picksRepository, type ProviderPick } from "@/repositories/picks";
import { getMatchupIntelligence } from "@/services";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in to lock your picks." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const units = Number(body?.units);
  if (!Array.isArray(body?.legs) || body.legs.length < 1 || body.legs.length > 12 || !Number.isFinite(units) || units <= 0 || units > 10) return Response.json({ error: "Add 1–12 valid selections and choose a unit size." }, { status: 400 });
  const locked: ProviderPick[] = [];
  for (const leg of body.legs) {
    const slug = typeof leg?.slug === "string" ? leg.slug : "";
    const book = typeof leg?.book === "string" ? leg.book : "";
    const line = typeof leg?.line === "string" ? leg.line : "";
    const matchup = await getMatchupIntelligence(slug);
    const quote = matchup?.alternateLines.find((item) => item.book === book && item.line === line);
    if (!matchup || !quote || matchup.providerMode !== "live" || !matchup.providerEventId || !matchup.providerSportKey || !quote.marketKey || !quote.outcomeName) return Response.json({ error: `${line || "A selection"} is no longer available as a live verified line.` }, { status: 409 });
    if (matchup.providerCommenceTime && new Date(matchup.providerCommenceTime).getTime() <= Date.now()) return Response.json({ error: `${line} has already started and cannot be locked.` }, { status: 409 });
    const modelName = typeof leg.modelName === "string" && leg.modelName.trim() ? leg.modelName.trim().slice(0, 60) : null;
    locked.push({ sport: matchup.providerSportKey, category: quote.marketKey === "h2h" ? "moneyline" : quote.marketKey === "spreads" ? "spread" : "total", eventName: `${matchup.away} at ${matchup.home}`, selection: quote.line, market: quote.marketKey, sportsbook: quote.book, americanOdds: quote.price, stakeUnits: units, confidence: matchup.confidence, providerEventId: matchup.providerEventId, providerSportKey: matchup.providerSportKey, marketKey: quote.marketKey, outcomeName: quote.outcomeName, linePoint: quote.point ?? null, attributionType: modelName ? "model" : "judgment", modelName });
  }
  try {
    return Response.json({ picks: await picksRepository.createProviderBatch(user.id, locked) }, { status: 201 });
  } catch (error) {
    console.error("Pick card lock failed", error);
    return Response.json({ error: "The card could not be locked. Refresh any moved lines and try again." }, { status: 503 });
  }
}
