import { getSessionUser } from "@/lib/auth/session";

const config = () => ({ url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""), key: process.env.SUPABASE_SERVICE_ROLE_KEY });
const headers = (key: string, extra?: Record<string, string>) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra });

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const { url, key } = config();
  if (!url || !key) return Response.json({ profile: null });
  const response = await fetch(`${url}/rest/v1/competitive_profiles?user_id=eq.${user.id}&select=*&limit=1`, { headers: headers(key), cache: "no-store" });
  return response.ok ? Response.json({ profile: (await response.json() as unknown[])[0] ?? null }) : Response.json({ error: "Competitive profile unavailable." }, { status: 503 });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const alias = typeof body?.publicAlias === "string" ? body.publicAlias.trim().replace(/[^\p{L}\p{N}_ .-]/gu, "").slice(0, 30) : "";
  const country = typeof body?.countryCode === "string" ? body.countryCode.trim().toUpperCase().slice(0, 2) : "";
  const region = typeof body?.regionCode === "string" ? body.regionCode.trim().toUpperCase().slice(0, 12) : "";
  const locality = typeof body?.locality === "string" ? body.locality.trim().slice(0, 60) : "";
  const optIn = body?.leaderboardOptIn === true;
  if (optIn && (alias.length < 2 || !country)) return Response.json({ error: "Add a public name and country before joining rankings." }, { status: 400 });
  const { url, key } = config();
  if (!url || !key) return Response.json({ error: "Competitive profile storage is not configured." }, { status: 503 });
  const response = await fetch(`${url}/rest/v1/competitive_profiles?on_conflict=user_id`, {
    method: "POST", headers: headers(key, { Prefer: "resolution=merge-duplicates,return=representation" }),
    body: JSON.stringify({ user_id: user.id, public_alias: alias || null, country_code: country || null, region_code: region || null, locality: locality || null, leaderboard_opt_in: optIn, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) return Response.json({ error: "Competitive profile could not be saved." }, { status: 503 });
  return Response.json({ profile: (await response.json() as unknown[])[0] });
}
