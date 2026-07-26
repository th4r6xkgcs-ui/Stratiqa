import { getSessionUser } from "@/lib/auth/session";
import { picksRepository } from "@/repositories/picks";
import { getMatchupIntelligence } from "@/services";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in to track a verified pick." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const slug = typeof body?.slug === "string" ? body.slug : "";
  const book = typeof body?.book === "string" ? body.book : "";
  const line = typeof body?.line === "string" ? body.line : "";
  const stakeUnits = Number(body?.stakeUnits);
  const attributionType = body?.attributionType === "model" ? "model" : "judgment";
  const modelName = attributionType === "model" && typeof body?.modelName === "string" ? body.modelName.trim().slice(0, 60) : null;
  if (!slug || !book || !line || !Number.isFinite(stakeUnits) || stakeUnits <= 0 || stakeUnits > 10) return Response.json({ error: "Choose a valid pick and unit size." }, { status: 400 });
  if (attributionType === "model" && !modelName) return Response.json({ error: "Name the model responsible for this pick." }, { status: 400 });

  const matchup = await getMatchupIntelligence(slug);
  const quote = matchup?.alternateLines.find((item) => item.book === book && item.line === line);
  if (!matchup || !quote) return Response.json({ error: "That line is no longer available. Refresh and try again." }, { status: 409 });
  if (matchup.providerMode !== "live" || !matchup.providerEventId || !matchup.providerSportKey || !quote.marketKey || !quote.outcomeName) {
    return Response.json({ error: "Verified tracking is available when the live odds feed has this market." }, { status: 409 });
  }
  if (matchup.providerCommenceTime && new Date(matchup.providerCommenceTime).getTime() <= Date.now()) {
    return Response.json({ error: "This event has started, so the pick can no longer be locked." }, { status: 409 });
  }

  try {
    const pick = await picksRepository.createProvider(user.id, {
      sport: matchup.providerSportKey, category: quote.marketKey === "h2h" ? "moneyline" : quote.marketKey === "spreads" ? "spread" : "total",
      eventName: `${matchup.away} at ${matchup.home}`, selection: quote.line, market: quote.marketKey,
      sportsbook: quote.book, americanOdds: quote.price, stakeUnits, confidence: matchup.confidence,
      providerEventId: matchup.providerEventId, providerSportKey: matchup.providerSportKey, marketKey: quote.marketKey,
      outcomeName: quote.outcomeName, linePoint: quote.point ?? null, attributionType, modelName,
      pickOrigin: attributionType === "model" ? "model" : "personal",
    });
    return Response.json({ pick }, { status: 201 });
  } catch (error) {
    console.error("Verified pick creation failed", error);
    return Response.json({ error: "The pick could not be locked. It may already be tracked." }, { status: 503 });
  }
}
