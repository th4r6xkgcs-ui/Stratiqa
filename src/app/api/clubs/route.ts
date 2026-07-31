import { getSessionUser } from "@/lib/auth/session";

const config = () => ({ url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""), key: process.env.SUPABASE_SERVICE_ROLE_KEY });
const headers = (key: string, extra?: Record<string, string>) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra });
type Club = { id: string; owner_id: string; name: string; description: string; created_at: string };
type Member = { club_id: string; user_id: string; role: "owner" | "member"; joined_at: string };
type Profile = { user_id: string; public_alias: string | null; public_slug: string | null };
type Rating = { user_id: string; rating: number; graded_picks: number; wins: number; losses: number; roi_percent: number | null };

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const { url, key } = config();
  if (!url || !key) return Response.json({ clubs: [], invites: [] });
  const membershipResponse = await fetch(`${url}/rest/v1/model_club_members?user_id=eq.${user.id}&select=club_id,role`, { headers: headers(key), cache: "no-store" });
  const memberships = membershipResponse.ok ? await membershipResponse.json() as Array<{ club_id: string; role: "owner" | "member" }> : [];
  const clubIds = memberships.map((member) => member.club_id);
  const [clubsResponse, rosterResponse, invitesResponse] = await Promise.all([
    clubIds.length ? fetch(`${url}/rest/v1/model_clubs?id=in.(${clubIds.join(",")})&select=*`, { headers: headers(key), cache: "no-store" }) : Promise.resolve(null),
    clubIds.length ? fetch(`${url}/rest/v1/model_club_members?club_id=in.(${clubIds.join(",")})&select=*`, { headers: headers(key), cache: "no-store" }) : Promise.resolve(null),
    fetch(`${url}/rest/v1/model_club_invites?invited_user_id=eq.${user.id}&status=eq.pending&select=*,model_clubs(name,description)&order=created_at.desc`, { headers: headers(key), cache: "no-store" }),
  ]);
  const clubs = clubsResponse?.ok ? await clubsResponse.json() as Club[] : [];
  const members = rosterResponse?.ok ? await rosterResponse.json() as Member[] : [];
  const memberIds = [...new Set(members.map((member) => member.user_id))];
  const [profilesResponse, ratingsResponse] = await Promise.all([
    memberIds.length ? fetch(`${url}/rest/v1/competitive_profiles?user_id=in.(${memberIds.join(",")})&select=user_id,public_alias,public_slug`, { headers: headers(key), cache: "no-store" }) : Promise.resolve(null),
    memberIds.length ? fetch(`${url}/rest/v1/category_ratings?user_id=in.(${memberIds.join(",")})&select=user_id,rating,graded_picks,wins,losses,roi_percent`, { headers: headers(key), cache: "no-store" }) : Promise.resolve(null),
  ]);
  const profiles = profilesResponse?.ok ? await profilesResponse.json() as Profile[] : [];
  const ratings = ratingsResponse?.ok ? await ratingsResponse.json() as Rating[] : [];
  const result = clubs.map((club) => {
    const roster = members.filter((member) => member.club_id === club.id).map((member) => {
      const profile = profiles.find((item) => item.user_id === member.user_id);
      const memberRatings = ratings.filter((rating) => rating.user_id === member.user_id);
      return { role: member.role, alias: profile?.public_alias ?? "Private analyst", slug: profile?.public_slug ?? null, rating: memberRatings.length ? Math.round(memberRatings.reduce((sum, rating) => sum + rating.rating, 0) / memberRatings.length) : 1500, verified: memberRatings.reduce((sum, rating) => sum + rating.graded_picks, 0) };
    });
    const clubRatings = ratings.filter((rating) => members.some((member) => member.club_id === club.id && member.user_id === rating.user_id));
    const verified = clubRatings.reduce((sum, rating) => sum + rating.graded_picks, 0);
    const wins = clubRatings.reduce((sum, rating) => sum + rating.wins, 0);
    const losses = clubRatings.reduce((sum, rating) => sum + rating.losses, 0);
    return { ...club, role: memberships.find((member) => member.club_id === club.id)?.role, roster, performance: { rating: clubRatings.length ? Math.round(clubRatings.reduce((sum, rating) => sum + rating.rating, 0) / clubRatings.length) : 1500, verified, wins, losses } };
  });
  return Response.json({ clubs: result, invites: invitesResponse.ok ? await invitesResponse.json() : [] });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 48) : "";
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 180) : "";
  const { url, key } = config();
  if (!url || !key || name.length < 3) return Response.json({ error: "Give your club a name with at least 3 characters." }, { status: 400 });
  const response = await fetch(`${url}/rest/v1/model_clubs`, { method: "POST", headers: headers(key, { Prefer: "return=representation" }), cache: "no-store", body: JSON.stringify({ owner_id: user.id, name, description }) });
  return response.ok ? Response.json({ club: (await response.json())[0] }, { status: 201 }) : Response.json({ error: "The club could not be created." }, { status: 503 });
}
