import { getSessionUser } from "@/lib/auth/session";

const config = () => ({ url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""), key: process.env.SUPABASE_SERVICE_ROLE_KEY });
const headers = (key: string, extra?: Record<string, string>) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra });

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const { url, key } = config();
  if (!url || !key) return Response.json({ rivals: [] });
  const response = await fetch(`${url}/rest/v1/rpc/get_competitive_rivals`, { method: "POST", headers: headers(key), body: JSON.stringify({ requested_user: user.id }), cache: "no-store" });
  if (!response.ok) return Response.json({ rivals: [] });
  return Response.json({ rivals: await response.json() });
}

async function resolveRival(url: string, key: string, slug: string) {
  const response = await fetch(`${url}/rest/v1/competitive_profiles?public_slug=eq.${encodeURIComponent(slug)}&leaderboard_opt_in=eq.true&select=user_id&limit=1`, { headers: headers(key), cache: "no-store" });
  const [profile] = response.ok ? await response.json() as Array<{ user_id: string }> : [];
  return profile?.user_id ?? null;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const slug = typeof body?.slug === "string" ? body.slug.trim().slice(0, 100) : "";
  const { url, key } = config();
  if (!url || !key || !slug) return Response.json({ error: "A public analyst is required." }, { status: 400 });
  const rivalUserId = await resolveRival(url, key, slug);
  if (!rivalUserId || rivalUserId === user.id) return Response.json({ error: "That analyst cannot be added as a rival." }, { status: 400 });
  const response = await fetch(`${url}/rest/v1/competitive_rivals?on_conflict=user_id,rival_user_id`, {
    method: "POST", headers: headers(key, { Prefer: "resolution=ignore-duplicates,return=minimal" }),
    body: JSON.stringify({ user_id: user.id, rival_user_id: rivalUserId }), cache: "no-store",
  });
  return response.ok ? Response.json({ saved: true }) : Response.json({ error: "Rival could not be saved." }, { status: 503 });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const slug = new URL(request.url).searchParams.get("slug")?.slice(0, 100) ?? "";
  const { url, key } = config();
  if (!url || !key || !slug) return Response.json({ error: "A public analyst is required." }, { status: 400 });
  const rivalUserId = await resolveRival(url, key, slug);
  if (!rivalUserId) return Response.json({ removed: true });
  const response = await fetch(`${url}/rest/v1/competitive_rivals?user_id=eq.${user.id}&rival_user_id=eq.${rivalUserId}`, { method: "DELETE", headers: headers(key), cache: "no-store" });
  return response.ok ? Response.json({ removed: true }) : Response.json({ error: "Rival could not be removed." }, { status: 503 });
}
