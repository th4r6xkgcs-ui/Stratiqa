import { getSessionUser } from "@/lib/auth/session";

const categories = new Set(["player_prop", "moneyline", "spread", "total", "live"]);
const factors = new Set(["market_value", "recent_form", "injuries", "weather", "matchup", "line_movement", "player_usage", "bullpen"]);
const risks = new Set(["selective", "balanced", "opportunistic"]);
const config = () => ({ url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""), key: process.env.SUPABASE_SERVICE_ROLE_KEY });
const headers = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });

type ModelRow = { id: string; name: string; sport: string; category: string; description: string; factors: string[]; strategy: string; risk_profile: string; weights: Record<string, number>; version: number; status: string };
type PickRow = { model_id: string; american_odds: number; result: "win" | "loss" | "push"; verification_status: string };

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const { url, key } = config();
  if (!url || !key) return Response.json({ models: [] });
  const authHeaders = headers(key);
  const [modelsResponse, picksResponse] = await Promise.all([
    fetch(`${url}/rest/v1/analyst_models?user_id=eq.${user.id}&select=*&order=updated_at.desc`, { headers: authHeaders, cache: "no-store" }),
    fetch(`${url}/rest/v1/graded_betting_activity?user_id=eq.${user.id}&model_id=not.is.null&verification_status=eq.verified&result=in.(win,loss,push)&select=model_id,american_odds,result`, { headers: authHeaders, cache: "no-store" }),
  ]);
  if (!modelsResponse.ok) return Response.json({ error: "Models are temporarily unavailable." }, { status: 503 });
  const models = await modelsResponse.json() as ModelRow[];
  const picks = picksResponse.ok ? await picksResponse.json() as PickRow[] : [];
  return Response.json({ models: models.map((model) => {
    const samples = picks.filter((pick) => pick.model_id === model.id);
    const decisions = samples.filter((pick) => pick.result !== "push");
    const wins = decisions.filter((pick) => pick.result === "win").length;
    const rating = Math.round(samples.reduce((score, pick) => {
      if (pick.result === "push") return score;
      const expected = pick.american_odds > 0 ? 100 / (pick.american_odds + 100) : Math.abs(pick.american_odds) / (Math.abs(pick.american_odds) + 100);
      return score + 28 * ((pick.result === "win" ? 1 : 0) - expected);
    }, 1500));
    return { ...model, performance: { verified: samples.length, wins, losses: decisions.length - wins, accuracy: decisions.length ? Math.round(wins / decisions.length * 100) : null, rating } };
  }) });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
  const sport = typeof body?.sport === "string" ? body.sport.trim().toUpperCase().slice(0, 20) : "";
  const category = typeof body?.category === "string" ? body.category : "";
  const strategy = typeof body?.strategy === "string" && factors.has(body.strategy) ? body.strategy : "market_value";
  const riskProfile = typeof body?.riskProfile === "string" && risks.has(body.riskProfile) ? body.riskProfile : "balanced";
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 300) : "";
  const selectedFactors = Array.isArray(body?.factors) ? [...new Set<string>(body.factors.filter((factor: unknown): factor is string => typeof factor === "string" && factors.has(factor)))].slice(0, 8) : [];
  const weights = typeof body?.weights === "object" && body.weights ? Object.fromEntries(selectedFactors.map((factor) => [factor, Math.max(0, Math.min(100, Number(body.weights[factor]) || 0))])) : {};
  if (!name || !sport || !categories.has(category) || selectedFactors.length < 2) return Response.json({ error: "Complete the model identity and choose at least two signals." }, { status: 400 });
  const { url, key } = config();
  if (!url || !key) return Response.json({ error: "Model storage is not configured." }, { status: 503 });
  const response = await fetch(`${url}/rest/v1/analyst_models`, {
    method: "POST", headers: { ...headers(key), Prefer: "return=representation" },
    body: JSON.stringify({ user_id: user.id, name, sport, category, description, factors: selectedFactors, strategy, risk_profile: riskProfile, weights, status: "testing" }),
  });
  if (!response.ok) return Response.json({ error: response.status === 409 ? "You already have a model with that name." : "The model could not be saved." }, { status: response.status === 409 ? 409 : 503 });
  const model = (await response.json() as ModelRow[])[0];
  return Response.json({ model: { ...model, performance: { verified: 0, wins: 0, losses: 0, accuracy: null, rating: 1500 } } }, { status: 201 });
}
