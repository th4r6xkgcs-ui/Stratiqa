import { getSessionUser } from "@/lib/auth/session";

const config = () => ({ url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""), key: process.env.SUPABASE_SERVICE_ROLE_KEY });
const headers = (key: string, extra?: Record<string, string>) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra });

type PublicModel = { id: string; user_id: string };

async function resolvePublicModel(url: string, key: string, modelId: string) {
  const response = await fetch(`${url}/rest/v1/rpc/get_public_model_leaderboard`, {
    method: "POST", headers: headers(key), cache: "no-store",
    body: JSON.stringify({ requested_user: null, result_limit: 100 }),
  });
  if (!response.ok) return null;
  const rows = await response.json() as Array<{ model_id: string }>;
  if (!rows.some((row) => row.model_id === modelId)) return null;
  const modelResponse = await fetch(`${url}/rest/v1/analyst_models?id=eq.${encodeURIComponent(modelId)}&select=id,user_id&limit=1`, { headers: headers(key), cache: "no-store" });
  return modelResponse.ok ? (await modelResponse.json() as PublicModel[])[0] ?? null : null;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const modelId = typeof body?.modelId === "string" ? body.modelId.trim() : "";
  const { url, key } = config();
  if (!url || !key || !modelId) return Response.json({ error: "A public model is required." }, { status: 400 });
  const model = await resolvePublicModel(url, key, modelId);
  if (!model || model.user_id === user.id) return Response.json({ error: "That model cannot be followed." }, { status: 400 });
  const response = await fetch(`${url}/rest/v1/model_follows?on_conflict=follower_id,model_id`, {
    method: "POST", headers: headers(key, { Prefer: "resolution=ignore-duplicates,return=minimal" }), cache: "no-store",
    body: JSON.stringify({ follower_id: user.id, model_id: modelId }),
  });
  return response.ok ? Response.json({ following: true }) : Response.json({ error: "The model could not be followed." }, { status: 503 });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const modelId = new URL(request.url).searchParams.get("modelId")?.trim() ?? "";
  const { url, key } = config();
  if (!url || !key || !modelId) return Response.json({ error: "A model is required." }, { status: 400 });
  const response = await fetch(`${url}/rest/v1/model_follows?follower_id=eq.${encodeURIComponent(user.id)}&model_id=eq.${encodeURIComponent(modelId)}`, { method: "DELETE", headers: headers(key), cache: "no-store" });
  return response.ok ? Response.json({ following: false }) : Response.json({ error: "The model could not be unfollowed." }, { status: 503 });
}
