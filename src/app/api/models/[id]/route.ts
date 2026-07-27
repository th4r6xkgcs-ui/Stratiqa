import { getSessionUser } from "@/lib/auth/session";
import { modelValidationSummary } from "@/lib/models/validation.js";

const factors = new Set(["market_value", "recent_form", "injuries", "weather", "matchup", "line_movement", "player_usage", "bullpen"]);
const risks = new Set(["selective", "balanced", "opportunistic"]);
const config = () => ({ url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""), key: process.env.SUPABASE_SERVICE_ROLE_KEY });
const headers = (key: string, extra?: Record<string, string>) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra });
type Context = { params: Promise<{ id: string }> };
type ModelRow = { id: string; user_id: string; name: string; sport: string; category: string; description: string; factors: string[]; strategy: string; risk_profile: string; weights: Record<string, number>; version: number; status: string };

async function ownedModel(url: string, key: string, userId: string, id: string) {
  const response = await fetch(`${url}/rest/v1/analyst_models?id=eq.${encodeURIComponent(id)}&user_id=eq.${userId}&select=*&limit=1`, { headers: headers(key), cache: "no-store" });
  return response.ok ? (await response.json() as ModelRow[])[0] ?? null : null;
}

export async function GET(_: Request, context: Context) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await context.params;
  const { url, key } = config();
  if (!url || !key) return Response.json({ versions: [] });
  const model = await ownedModel(url, key, user.id, id);
  if (!model) return Response.json({ error: "Model not found." }, { status: 404 });
  const [response, picksResponse] = await Promise.all([
    fetch(`${url}/rest/v1/analyst_model_versions?model_id=eq.${id}&user_id=eq.${user.id}&select=*&order=version.desc`, { headers: headers(key), cache: "no-store" }),
    fetch(`${url}/rest/v1/graded_betting_activity?model_id=eq.${id}&user_id=eq.${user.id}&verification_status=eq.verified&result=in.(win,loss,push)&select=model_version,result,stake_units,profit_units,graded_at`, { headers: headers(key), cache: "no-store" }),
  ]);
  if (!response.ok) return Response.json({ error: "Version history is unavailable." }, { status: 503 });
  const archived = await response.json() as Array<Record<string, unknown> & { version: number }>;
  const picks = picksResponse.ok ? await picksResponse.json() as Array<{ model_version: number | null; result: string; stake_units: number | null; profit_units: number | null; graded_at: string | null }> : [];
  const withPerformance = (version: Record<string, unknown> & { version: number }, current = false) => ({
    ...version, current, performance: modelValidationSummary(picks.filter((pick) => pick.model_version === version.version)),
  });
  return Response.json({ versions: [withPerformance(model, true), ...archived.map((version) => withPerformance(version))] });
}

export async function PATCH(request: Request, context: Context) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const { url, key } = config();
  if (!url || !key) return Response.json({ error: "Model storage is not configured." }, { status: 503 });
  const model = await ownedModel(url, key, user.id, id);
  if (!model) return Response.json({ error: "Model not found." }, { status: 404 });
  let update: Record<string, unknown>;
  if (body?.action === "promote") {
    const picksResponse = await fetch(`${url}/rest/v1/graded_betting_activity?model_id=eq.${id}&user_id=eq.${user.id}&verification_status=eq.verified&select=id&limit=5`, { headers: headers(key), cache: "no-store" });
    const samples = picksResponse.ok ? (await picksResponse.json() as unknown[]).length : 0;
    if (samples < 5) return Response.json({ error: `${5 - samples} more verified model pick${5 - samples === 1 ? "" : "s"} needed before promotion.` }, { status: 409 });
    update = { status: "live" };
  } else if (body?.action === "retire") update = { status: "retired" };
  else if (body?.action === "restore") update = { status: "testing" };
  else {
    const selectedFactors = Array.isArray(body?.factors) ? [...new Set<string>(body.factors.filter((factor: unknown): factor is string => typeof factor === "string" && factors.has(factor)))].slice(0, 8) : model.factors;
    if (selectedFactors.length < 2) return Response.json({ error: "Keep at least two signals in the model." }, { status: 400 });
    const strategy = typeof body?.strategy === "string" && selectedFactors.includes(body.strategy) ? body.strategy : selectedFactors[0];
    const risk = typeof body?.riskProfile === "string" && risks.has(body.riskProfile) ? body.riskProfile : model.risk_profile;
    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : model.name;
    if (!name) return Response.json({ error: "Model name is required." }, { status: 400 });
    update = {
      name, description: typeof body?.description === "string" ? body.description.trim().slice(0, 300) : model.description,
      factors: selectedFactors, strategy, risk_profile: risk,
      weights: Object.fromEntries(selectedFactors.map((factor) => [factor, Math.max(0, Math.min(100, Number(body?.weights?.[factor]) || Number(model.weights?.[factor]) || 20))])),
    };
  }
  const response = await fetch(`${url}/rest/v1/analyst_models?id=eq.${id}&user_id=eq.${user.id}`, {
    method: "PATCH", headers: headers(key, { Prefer: "return=representation" }), body: JSON.stringify(update),
  });
  if (!response.ok) return Response.json({ error: response.status === 409 ? "That model name is already in use." : "The model could not be updated." }, { status: response.status === 409 ? 409 : 503 });
  return Response.json({ model: (await response.json() as ModelRow[])[0] });
}

export async function POST(request: Request, context: Context) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const { id } = await context.params;
  const { url, key } = config();
  if (!url || !key) return Response.json({ error: "Model storage is not configured." }, { status: 503 });
  const model = await ownedModel(url, key, user.id, id);
  if (!model) return Response.json({ error: "Model not found." }, { status: 404 });
  const body = await request.json().catch(() => null);
  const suffix = crypto.randomUUID().slice(0, 4).toUpperCase();
  const suggestedWeights = body?.suggestedWeights && typeof body.suggestedWeights === "object"
    ? Object.fromEntries(model.factors.map((factor) => [factor, Math.max(5, Math.min(60, Number(body.suggestedWeights[factor]) || Number(model.weights[factor]) || 20))]))
    : model.weights;
  const requestedName = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
  const response = await fetch(`${url}/rest/v1/analyst_models`, {
    method: "POST", headers: headers(key, { Prefer: "return=representation" }),
    body: JSON.stringify({ user_id: user.id, name: requestedName || `${model.name} Challenger ${suffix}`, sport: model.sport, category: model.category, description: `Challenger based on ${model.name} v${model.version}. Champion history remains unchanged.`, factors: model.factors, strategy: model.strategy, risk_profile: model.risk_profile, weights: suggestedWeights, status: "testing" }),
  });
  if (!response.ok) return Response.json({ error: "The experiment could not be created." }, { status: 503 });
  return Response.json({ model: (await response.json() as ModelRow[])[0] }, { status: 201 });
}
