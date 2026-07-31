import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Response.json({ updates: [] });
  const response = await fetch(`${url}/rest/v1/rpc/get_public_model_pulse`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ requested_user: user.id, result_limit: 8 }),
  });
  if (!response.ok) return Response.json({ error: "Model updates are temporarily unavailable." }, { status: 503 });
  return Response.json({ updates: await response.json() });
}
