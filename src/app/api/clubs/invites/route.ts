import { getSessionUser } from "@/lib/auth/session";
const config = () => ({ url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""), key: process.env.SUPABASE_SERVICE_ROLE_KEY });
const headers = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });

export async function POST(request: Request) {
  const user = await getSessionUser(); if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null); const inviteId = typeof body?.inviteId === "string" ? body.inviteId : "";
  const { url, key } = config(); if (!url || !key) return Response.json({ error: "Club storage is not configured." }, { status: 503 });
  if (!inviteId) {
    const clubId = typeof body?.clubId === "string" ? body.clubId : "";
    const slug = typeof body?.slug === "string" ? body.slug.trim().slice(0, 100) : "";
    if (!clubId || !slug) return Response.json({ error: "Choose a club and public analyst profile." }, { status: 400 });
    const [ownerResponse, profileResponse] = await Promise.all([
      fetch(`${url}/rest/v1/model_club_members?club_id=eq.${encodeURIComponent(clubId)}&user_id=eq.${user.id}&role=eq.owner&select=club_id&limit=1`, { headers: headers(key), cache: "no-store" }),
      fetch(`${url}/rest/v1/competitive_profiles?public_slug=eq.${encodeURIComponent(slug)}&leaderboard_opt_in=eq.true&select=user_id&limit=1`, { headers: headers(key), cache: "no-store" }),
    ]);
    const owner = ownerResponse.ok ? await ownerResponse.json() as unknown[] : [];
    const [profile] = profileResponse.ok ? await profileResponse.json() as Array<{ user_id: string }> : [];
    if (!owner.length || !profile || profile.user_id === user.id) return Response.json({ error: "That analyst cannot be invited to this club." }, { status: 400 });
    const response = await fetch(`${url}/rest/v1/model_club_invites?on_conflict=club_id,invited_user_id`, { method: "POST", headers: { ...headers(key), Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ club_id: clubId, invited_user_id: profile.user_id, invited_by: user.id, status: "pending", responded_at: null }), cache: "no-store" });
    return response.ok ? Response.json({ invited: true }) : Response.json({ error: "The invitation could not be sent." }, { status: 503 });
  }
  const response = await fetch(`${url}/rest/v1/rpc/accept_model_club_invite`, { method: "POST", headers: headers(key), body: JSON.stringify({ target_invite: inviteId, target_user: user.id }), cache: "no-store" });
  return response.ok && await response.json() ? Response.json({ accepted: true }) : Response.json({ error: "That invite is no longer available." }, { status: 409 });
}
