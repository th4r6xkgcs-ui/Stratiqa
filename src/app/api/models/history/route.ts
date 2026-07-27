import { getSessionUser } from "@/lib/auth/session";
import { calibrationSummary, linkRecommendationOutcomes } from "@/lib/models/calibration.js";

const config = () => ({ url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""), key: process.env.SUPABASE_SERVICE_ROLE_KEY });

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const { url, key } = config();
  if (!url || !key) return Response.json({ history: [], calibration: calibrationSummary([]) });
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const [snapshotsResponse, picksResponse] = await Promise.all([
    fetch(`${url}/rest/v1/model_recommendation_snapshots?user_id=eq.${user.id}&select=*&order=observed_at.desc&limit=100`, { headers, cache: "no-store" }),
    fetch(`${url}/rest/v1/graded_betting_activity?user_id=eq.${user.id}&model_id=not.is.null&verification_status=eq.verified&result=in.(win,loss,push)&select=model_id,category,event_name,selection,provider_event_id,market_key,outcome_name,line_point,result,graded_at`, { headers, cache: "no-store" }),
  ]);
  if (!snapshotsResponse.ok) return Response.json({ history: [], calibration: calibrationSummary([]), available: false });
  const snapshots = await snapshotsResponse.json();
  const picks = picksResponse.ok ? await picksResponse.json() : [];
  const history = linkRecommendationOutcomes(snapshots, picks);
  return Response.json({ history, calibration: calibrationSummary(history), available: true });
}
