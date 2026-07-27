import { getSessionUser } from "@/lib/auth/session";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Response.json({ leaders: [] });
  const params = new URL(request.url).searchParams;
  const season = params.get("season") === "current";
  const now = new Date();
  const seasonStart = season ? new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1)).toISOString() : null;
  const response = await fetch(`${url}/rest/v1/rpc/get_model_arena_v2`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      requested_user: user.id,
      requested_sport: params.get("sport") || null,
      requested_category: params.get("category") || null,
      requested_season_start: seasonStart,
      result_limit: 50,
    }),
  });
  if (!response.ok) return Response.json({ error: "Model Arena is temporarily unavailable." }, { status: 503 });
  return Response.json({ leaders: await response.json(), season: season ? { key: `${now.getUTCFullYear()}-Q${Math.floor(now.getUTCMonth() / 3) + 1}`, startsAt: seasonStart } : null });
}
