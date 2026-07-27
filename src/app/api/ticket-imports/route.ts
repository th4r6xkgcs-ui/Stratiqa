import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in to view ticket imports." }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Response.json({ tickets: [] });
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const response = await fetch(`${url}/rest/v1/pick_evidence?user_id=eq.${user.id}&claim_type=eq.external_ticket&select=id,sportsbook,ticket_id,verification_status,rating_eligible,submitted_at,reviewed_at,review_note,rejection_reason,provider_reference,pick_id&order=submitted_at.desc&limit=50`, {
    headers, cache: "no-store", signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return Response.json({ tickets: [] });
  return Response.json({ tickets: await response.json() }, { headers: { "Cache-Control": "no-store" } });
}
