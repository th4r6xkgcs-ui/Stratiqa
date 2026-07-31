import { getSessionUser } from "@/lib/auth/session";

function currentSeason() {
  const now = new Date();
  const quarter = Math.floor(now.getUTCMonth() / 3);
  const start = new Date(Date.UTC(now.getUTCFullYear(), quarter * 3, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), (quarter + 1) * 3, 1));
  return { key: `${now.getUTCFullYear()}-Q${quarter + 1}`, startsAt: start.toISOString(), endsAt: end.toISOString() };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const season = currentSeason();
  if (!url || !key) return Response.json({ races: [], archive: [], season });
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const [raceResponse, archiveResponse] = await Promise.all([
    fetch(`${url}/rest/v1/rpc/get_season_championship_race`, { method: "POST", headers, cache: "no-store", body: JSON.stringify({ requested_user: user.id, requested_season_start: season.startsAt, result_limit: 3 }) }),
    fetch(`${url}/rest/v1/season_championships?select=season_key,scope,scope_label,category,champion_alias,rating,graded_picks,wins,losses,roi_percent,finalized_at&order=finalized_at.desc&limit=12`, { headers, cache: "no-store" }),
  ]);
  return Response.json({ races: raceResponse.ok ? await raceResponse.json() : [], archive: archiveResponse.ok ? await archiveResponse.json() : [], season });
}
