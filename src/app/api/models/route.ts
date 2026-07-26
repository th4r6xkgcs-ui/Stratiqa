import { getSessionUser } from "@/lib/auth/session";

const categories = new Set(["player_prop", "moneyline", "spread", "total", "live"]);
const factors = new Set(["market_value", "recent_form", "injuries", "weather", "matchup", "line_movement", "player_usage", "bullpen"]);
const config = () => ({ url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""), key: process.env.SUPABASE_SERVICE_ROLE_KEY });
const headers = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const { url, key } = config();
  if (!url || !key) return Response.json({ models: [] });
  const response = await fetch(`${url}/rest/v1/analyst_models?user_id=eq.${user.id}&select=*&order=updated_at.desc`, { headers: headers(key), cache: "no-store" });
  if (!response.ok) return Response.json({ error: "Models are temporarily unavailable." }, { status: 503 });
  return Response.json({ models: await response.json() });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
  const sport = typeof body?.sport === "string" ? body.sport.trim().toUpperCase().slice(0, 20) : "";
  const category = typeof body?.category === "string" ? body.category : "";
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 300) : "";
  const selectedFactors = Array.isArray(body?.factors) ? body.factors.filter((factor: unknown) => typeof factor === "string" && factors.has(factor)).slice(0, 8) : [];
  if (!name || !sport || !categories.has(category) || selectedFactors.length < 2) return Response.json({ error: "Name the model and choose at least two valid factors." }, { status: 400 });
  const { url, key } = config();
  if (!url || !key) return Response.json({ error: "Model storage is not configured." }, { status: 503 });
  const response = await fetch(`${url}/rest/v1/analyst_models`, { method: "POST", headers: { ...headers(key), Prefer: "return=representation" }, body: JSON.stringify({ user_id: user.id, name, sport, category, description, factors: selectedFactors, status: "draft" }) });
  if (!response.ok) return Response.json({ error: response.status === 409 ? "You already have a model with that name." : "The model could not be saved." }, { status: response.status === 409 ? 409 : 503 });
  return Response.json({ model: (await response.json() as unknown[])[0] }, { status: 201 });
}
