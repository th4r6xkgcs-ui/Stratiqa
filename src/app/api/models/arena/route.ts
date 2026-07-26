import { getSessionUser } from "@/lib/auth/session";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Response.json({ leaders: [] });
  const params = new URL(request.url).searchParams;
  const response = await fetch(`${url}/rest/v1/rpc/get_model_arena`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      requested_sport: params.get("sport") || null,
      requested_category: params.get("category") || null,
      result_limit: 50,
    }),
  });
  if (!response.ok) return Response.json({ error: "Model Arena is temporarily unavailable." }, { status: 503 });
  return Response.json({ leaders: await response.json() });
}
