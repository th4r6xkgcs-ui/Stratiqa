import { getSessionUser } from "@/lib/auth/session";
import { recommendationReasons, recommendationScore } from "@/lib/models/recommendations";
import { getMatchupIntelligence, getPropsBoard, getSupportedMatchupSlugs } from "@/services";

type ModelRow = { id: string; name: string; sport: string; category: string; factors: string[]; strategy: string; risk_profile: string; weights: Record<string, number>; status: string };
type RecommendationRow = { id: string; modelId: string; modelName: string; category: string; title: string; selection: string; eventName: string; book: string; price: number; confidence: number; expectedValue: number; reasons: string[]; live: boolean; kind: "prop" | "matchup"; propId?: string; slug?: string; outcomeName?: string };
const config = () => ({ url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""), key: process.env.SUPABASE_SERVICE_ROLE_KEY });

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const { url, key } = config();
  if (!url || !key) return Response.json({ recommendations: [] });
  const modelsResponse = await fetch(`${url}/rest/v1/analyst_models?user_id=eq.${user.id}&status=neq.retired&select=id,name,sport,category,factors,strategy,risk_profile,weights`, {
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
      return propsResult.data.map((prop) => {
        const quote = prop.quotes?.[0];
        return {
          id: `${model.id}:prop:${prop.id}`, modelId: model.id, modelName: model.name, category: model.category,
          title: `${prop.player} ${quote?.outcomeName ?? prop.line.split(" ")[0]} ${prop.point ?? prop.line.split(" ")[1]} ${prop.market}`,
          eventName: prop.matchup, book: quote?.book ?? propsResult.provider, price: quote?.price ?? prop.price,
          confidence: recommendationScore(model, prop), expectedValue: prop.expectedValue,
          reasons: recommendationReasons(model), live: Boolean(prop.live), kind: "prop" as const, propId: prop.id,
          outcomeName: quote?.outcomeName ?? prop.line.split(" ")[0], selection: `${quote?.outcomeName ?? prop.line.split(" ")[0]} ${prop.point ?? prop.line.split(" ")[1]} ${prop.market}`,
        };
      }).sort((a, b) => b.confidence - a.confidence).slice(0, 2);
    }
    return matchupsResult.filter((matchup) => matchup && matchup.alternateLines.some((quote) => {
      const category = quote.marketKey === "h2h" ? "moneyline" : quote.marketKey === "spreads" ? "spread" : quote.marketKey === "totals" ? "total" : "";
      return category === model.category;
    })).map((matchup) => {
      const quote = matchup!.alternateLines.find((item) => {
        const category = item.marketKey === "h2h" ? "moneyline" : item.marketKey === "spreads" ? "spread" : item.marketKey === "totals" ? "total" : "";
        return category === model.category;
      })!;
      return {
        id: `${model.id}:game:${matchup!.id}:${quote.book}:${quote.line}`, modelId: model.id, modelName: model.name, category: model.category,
        title: quote.line, eventName: `${matchup!.away} at ${matchup!.home}`, book: quote.book, price: quote.price,
        confidence: recommendationScore(model, matchup), expectedValue: matchup!.expectedValue,
        reasons: recommendationReasons(model), live: matchup!.providerMode === "live", kind: "matchup" as const, slug: matchup!.id,
        selection: quote.line,
      };
    }).sort((a, b) => b.confidence - a.confidence).slice(0, 2);
  }).sort((a, b) => b.confidence - a.confidence);
  return Response.json({ recommendations, updatedAt: new Date().toISOString() });
}
