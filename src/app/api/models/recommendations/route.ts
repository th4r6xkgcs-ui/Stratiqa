import { getSessionUser } from "@/lib/auth/session";
import { recommendationIdentity } from "@/lib/models/calibration.js";
import { evaluateRecommendation, recommendationDesk, recommendationReasons } from "@/lib/models/recommendations";
import { getMatchupIntelligence, getPropsBoard, getSupportedMatchupSlugs } from "@/services";

type ModelRow = { id: string; name: string; sport: string; category: string; factors: string[]; strategy: string; risk_profile: string; weights: Record<string, number>; status: string; version: number };
type Signal = { factor: string; weight: number; signal: number; contribution: number };
type RecommendationRow = { id: string; modelId: string; modelName: string; modelVersion: number; sport: string; category: string; title: string; selection: string; eventName: string; book: string; price: number; confidence: number; expectedValue: number; reasons: string[]; signals: Signal[]; signalAgreement: number; threshold: number; decision: "recommend" | "pass"; live: boolean; kind: "prop" | "matchup"; propId?: string; slug?: string; outcomeName?: string; providerEventId?: string | null; providerSportKey?: string | null; marketKey?: string | null; linePoint?: number | null; eventCommenceAt?: string | null };
const config = () => ({ url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""), key: process.env.SUPABASE_SERVICE_ROLE_KEY });
const sportKeys: Record<string, string> = { MLB: "baseball_mlb", NBA: "basketball_nba", NFL: "americanfootball_nfl", NHL: "icehockey_nhl", WNBA: "basketball_wnba", NCAAF: "americanfootball_ncaaf", NCAAB: "basketball_ncaab" };
const supportsSport = (model: ModelRow, providerSportKey?: string | null) => providerSportKey ? sportKeys[model.sport] === providerSportKey : model.sport === "MLB";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const { url, key } = config();
  if (!url || !key) return Response.json({ recommendations: [] });
  const modelsResponse = await fetch(`${url}/rest/v1/analyst_models?user_id=eq.${user.id}&status=neq.retired&select=id,name,sport,category,factors,strategy,risk_profile,weights,version`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store", signal: AbortSignal.timeout(8_000),
  });
  if (!modelsResponse.ok) return Response.json({ error: "Model recommendations are temporarily unavailable." }, { status: 503 });
  const models = await modelsResponse.json() as ModelRow[];
  const needsProps = models.some((model) => model.category === "player_prop");
  const needsGames = models.some((model) => ["moneyline", "spread", "total"].includes(model.category));
  const [propsResult, matchupsResult] = await Promise.all([
    needsProps ? getPropsBoard() : null,
    needsGames ? Promise.all(getSupportedMatchupSlugs().map((slug) => getMatchupIntelligence(slug))) : [],
  ]);
  const recommendations = models.flatMap<RecommendationRow>((model) => {
    if (model.category === "player_prop" && propsResult) {
      return propsResult.data.filter((prop) => supportsSport(model, prop.providerSportKey)).map((prop) => {
        const quote = prop.quotes?.[0];
        const evaluation = evaluateRecommendation(model, prop);
        return {
          id: `${model.id}:prop:${prop.id}`, modelId: model.id, modelName: model.name, modelVersion: model.version, sport: model.sport, category: model.category,
          title: `${prop.player} ${quote?.outcomeName ?? prop.line.split(" ")[0]} ${prop.point ?? prop.line.split(" ")[1]} ${prop.market}`,
          eventName: prop.matchup, book: quote?.book ?? propsResult.provider, price: quote?.price ?? prop.price,
          confidence: evaluation.score, expectedValue: prop.expectedValue, threshold: evaluation.threshold, decision: evaluation.decision as "recommend" | "pass",
          reasons: recommendationReasons(model, prop), signals: evaluation.contributions, signalAgreement: evaluation.signalAgreement, live: Boolean(prop.live), kind: "prop" as const, propId: prop.id,
          outcomeName: quote?.outcomeName ?? prop.line.split(" ")[0], selection: `${quote?.outcomeName ?? prop.line.split(" ")[0]} ${prop.point ?? prop.line.split(" ")[1]} ${prop.market}`,
          providerEventId: prop.providerEventId ?? null, providerSportKey: prop.providerSportKey ?? null, marketKey: prop.marketKey ?? null, linePoint: prop.point ?? null, eventCommenceAt: prop.providerCommenceTime ?? null,
        };
      });
    }
    return matchupsResult.filter((matchup) => matchup && supportsSport(model, matchup.providerSportKey) && matchup.alternateLines.some((quote) => {
      const category = quote.marketKey === "h2h" ? "moneyline" : quote.marketKey === "spreads" ? "spread" : quote.marketKey === "totals" ? "total" : "";
      return category === model.category;
    })).map((matchup) => {
      const quote = matchup!.alternateLines.find((item) => {
        const category = item.marketKey === "h2h" ? "moneyline" : item.marketKey === "spreads" ? "spread" : item.marketKey === "totals" ? "total" : "";
        return category === model.category;
      })!;
      const evaluation = evaluateRecommendation(model, matchup);
      return {
        id: `${model.id}:game:${matchup!.id}:${quote.book}:${quote.line}`, modelId: model.id, modelName: model.name, modelVersion: model.version, sport: model.sport, category: model.category,
        title: quote.line, eventName: `${matchup!.away} at ${matchup!.home}`, book: quote.book, price: quote.price,
        confidence: evaluation.score, expectedValue: matchup!.expectedValue, threshold: evaluation.threshold, decision: evaluation.decision as "recommend" | "pass",
        reasons: recommendationReasons(model, matchup), signals: evaluation.contributions, signalAgreement: evaluation.signalAgreement, live: matchup!.providerMode === "live", kind: "matchup" as const, slug: matchup!.id,
        selection: quote.line,
        outcomeName: quote.outcomeName, providerEventId: matchup!.providerEventId, providerSportKey: matchup!.providerSportKey, marketKey: quote.marketKey ?? null, linePoint: quote.point ?? null, eventCommenceAt: matchup!.providerCommenceTime,
      };
    });
  }).sort((a, b) => b.confidence - a.confidence);
  const desk = recommendationDesk(recommendations);
  const snapshots = recommendations.map((item) => ({
    user_id: user.id, model_id: item.modelId, model_version: item.modelVersion,
    snapshot_key: recommendationIdentity(item), sport: item.sport, category: item.category,
    event_name: item.eventName, selection: item.selection, provider_event_id: item.providerEventId ?? null,
    provider_sport_key: item.providerSportKey ?? null, market_key: item.marketKey ?? null,
    outcome_name: item.outcomeName ?? null, line_point: item.linePoint ?? null,
    american_odds: item.price, model_score: item.confidence, qualification_threshold: item.threshold,
    decision: item.decision, signal_agreement: item.signalAgreement, expected_value: item.expectedValue,
    signals: item.signals, reasons: item.reasons, event_commence_at: item.eventCommenceAt ?? null,
  }));
  if (snapshots.length) {
    await fetch(`${url}/rest/v1/model_recommendation_snapshots?on_conflict=model_id,model_version,snapshot_key,observed_on`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify(snapshots),
      signal: AbortSignal.timeout(5_000),
    }).catch(() => undefined);
  }
  const accepted = recommendations.filter((item) => item.decision === "recommend").slice(0, 12);
  const passes = recommendations.filter((item) => item.decision === "pass").sort((a, b) => b.confidence - a.confidence).slice(0, 6);
  const agreement = new Map<string, number>();
  for (const item of accepted) {
    const key = `${item.eventName}|${item.selection}`.toLowerCase();
    agreement.set(key, (agreement.get(key) ?? 0) + 1);
  }
  return Response.json({
    recommendations: accepted.map((item) => ({ ...item, modelAgreement: agreement.get(`${item.eventName}|${item.selection}`.toLowerCase()) ?? 1 })),
    passes, desk, updatedAt: new Date().toISOString(),
  });
}
