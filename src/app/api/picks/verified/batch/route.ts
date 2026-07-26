import { getSessionUser } from "@/lib/auth/session";
import { resolveOwnedModel } from "@/lib/models/resolve-model";
import { picksRepository, type ProviderPick } from "@/repositories/picks";
import { getMatchupIntelligence, getPropsBoard } from "@/services";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in to lock your picks." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const units = Number(body?.units);
  if (!Array.isArray(body?.legs) || body.legs.length < 1 || body.legs.length > 12 || !Number.isFinite(units) || units <= 0 || units > 10) return Response.json({ error: "Add 1–12 valid selections. Automatic stake sizing could not be calculated." }, { status: 400 });
  const locked: ProviderPick[] = [];
  const modelCache = new Map<string, Awaited<ReturnType<typeof resolveOwnedModel>>>();
  for (const leg of body.legs) {
    const requestedModelId = typeof leg?.modelId === "string" ? leg.modelId : "";
    if (requestedModelId && !modelCache.has(requestedModelId)) modelCache.set(requestedModelId, await resolveOwnedModel(user.id, requestedModelId));
    const ownedModel = requestedModelId ? modelCache.get(requestedModelId) ?? null : null;
    if (requestedModelId && !ownedModel) return Response.json({ error: "That model is unavailable. Choose one of your active models and try again." }, { status: 409 });
    if (leg?.kind === "prop") {
      const board = await getPropsBoard();
      const prop = board.data.find((item) => item.id === leg.propId);
      const outcomeQuotes = prop?.quotes?.filter((item) => item.outcomeName === leg.outcomeName) ?? [];
      const quote = outcomeQuotes.reduce((best, item) => !best || item.price > best.price ? item : best, undefined as (typeof outcomeQuotes[number] | undefined));
      if (!prop?.live || !quote || !prop.providerEventId || !prop.providerSportKey || !prop.marketKey || prop.point === undefined) return Response.json({ error: "A prop line moved or is no longer provider-verifiable. Refresh Props and try again." }, { status: 409 });
      if (prop.providerCommenceTime && new Date(prop.providerCommenceTime).getTime() <= Date.now()) return Response.json({ error: `${prop.player} has already started and cannot be locked.` }, { status: 409 });
      if (ownedModel && ownedModel.category !== "player_prop") return Response.json({ error: `${ownedModel.name} is built for ${ownedModel.category.replace("_", " ")} picks, not player props.` }, { status: 409 });
      locked.push({ sport: prop.providerSportKey, category: "player_prop", eventName: prop.matchup, selection: `${quote.outcomeName} ${prop.point} ${prop.market}`, market: prop.marketKey, sportsbook: quote.book, americanOdds: quote.price, stakeUnits: units, confidence: prop.confidence, providerEventId: prop.providerEventId, providerSportKey: prop.providerSportKey, marketKey: prop.marketKey, outcomeName: quote.outcomeName, linePoint: prop.point, participantName: prop.player, attributionType: ownedModel ? "model" : "judgment", modelId: ownedModel?.id ?? null, modelVersion: ownedModel?.version ?? null, modelName: ownedModel?.name ?? null, pickOrigin: "personal", coachRecommendationId: null, eventCommenceAt: prop.providerCommenceTime ?? null });
      continue;
    }
    const slug = typeof leg?.slug === "string" ? leg.slug : "";
    const line = typeof leg?.line === "string" ? leg.line : "";
    const matchup = await getMatchupIntelligence(slug);
    const lineQuotes = matchup?.alternateLines.filter((item) => item.line === line) ?? [];
    const quote = lineQuotes.reduce((best, item) => !best || item.price > best.price ? item : best, undefined as (typeof lineQuotes[number] | undefined));
    if (!matchup || !quote || matchup.providerMode !== "live" || !matchup.providerEventId || !matchup.providerSportKey || !quote.marketKey || !quote.outcomeName) return Response.json({ error: `${line || "A selection"} is no longer available as a live verified line.` }, { status: 409 });
    if (matchup.providerCommenceTime && new Date(matchup.providerCommenceTime).getTime() <= Date.now()) return Response.json({ error: `${line} has already started and cannot be locked.` }, { status: 409 });
    const category = quote.marketKey === "h2h" ? "moneyline" : quote.marketKey === "spreads" ? "spread" : "total";
    if (ownedModel && ownedModel.category !== category) return Response.json({ error: `${ownedModel.name} is built for ${ownedModel.category.replace("_", " ")} picks, not this ${category}.` }, { status: 409 });
    locked.push({ sport: matchup.providerSportKey, category, eventName: `${matchup.away} at ${matchup.home}`, selection: quote.line, market: quote.marketKey, sportsbook: quote.book, americanOdds: quote.price, stakeUnits: units, confidence: matchup.confidence, providerEventId: matchup.providerEventId, providerSportKey: matchup.providerSportKey, marketKey: quote.marketKey, outcomeName: quote.outcomeName, linePoint: quote.point ?? null, attributionType: ownedModel ? "model" : "judgment", modelId: ownedModel?.id ?? null, modelVersion: ownedModel?.version ?? null, modelName: ownedModel?.name ?? null, pickOrigin: "personal", coachRecommendationId: null, eventCommenceAt: matchup.providerCommenceTime });
  }
  try {
    return Response.json({ picks: await picksRepository.createProviderBatch(user.id, locked) }, { status: 201 });
  } catch (error) {
    console.error("Pick card lock failed", error);
    return Response.json({ error: "The card could not be locked. Refresh any moved lines and try again." }, { status: 503 });
  }
}
