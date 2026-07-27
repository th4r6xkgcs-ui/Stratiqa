import { getSessionUser } from "@/lib/auth/session";

const config = () => ({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""),
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
});
function isAdmin(email: string) {
  return (process.env.STRATIQA_ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
}
async function authorize() {
  const user = await getSessionUser();
  return user && isAdmin(user.email) ? user : null;
}

export async function GET() {
  const user = await authorize();
  if (!user) return Response.json({ error: "Admin access required." }, { status: 403 });
  const { url, key } = config();
  if (!url || !key) return Response.json({ error: "Review storage is unavailable." }, { status: 503 });
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const response = await fetch(`${url}/rest/v1/pick_evidence?claim_type=eq.external_ticket&verification_status=eq.pending&select=*&order=submitted_at.asc&limit=100`, {
    headers, cache: "no-store", signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return Response.json({ error: "Review queue could not be loaded." }, { status: 503 });
  const tickets = await response.json() as Array<Record<string, unknown> & { object_path?: string | null }>;
  const withUrls = await Promise.all(tickets.map(async (ticket) => {
    if (!ticket.object_path) return { ...ticket, imageUrl: null };
    const signed = await fetch(`${url}/storage/v1/object/sign/pick-evidence/${ticket.object_path}`, {
      method: "POST", headers, body: JSON.stringify({ expiresIn: 300 }),
    });
    if (!signed.ok) return { ...ticket, imageUrl: null };
    const result = await signed.json() as { signedURL?: string };
    return { ...ticket, imageUrl: result.signedURL ? `${url}/storage/v1${result.signedURL}` : null };
  }));
  return Response.json({ tickets: withUrls, reviewer: user.email }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await authorize();
  if (!user) return Response.json({ error: "Admin access required." }, { status: 403 });
  const { url, key } = config();
  if (!url || !key) return Response.json({ error: "Review storage is unavailable." }, { status: 503 });
  const body = await request.json().catch(() => null);
  const action = body?.action === "approved" ? "approved" : body?.action === "rejected" ? "rejected" : "";
  if (!body?.evidenceId || !action || !String(body?.note ?? "").trim() || !String(body?.providerReference ?? "").trim()) {
    return Response.json({ error: "Evidence, action, review note, and provider reference are required." }, { status: 400 });
  }
  const payload = {
    requested_evidence_id: body.evidenceId, requested_reviewer_id: user.id,
    requested_action: action, requested_note: String(body.note).trim().slice(0, 500),
    requested_provider_reference: String(body.providerReference).trim().slice(0, 160),
    requested_sport: body.sport || null, requested_category: body.category || null,
    requested_event_name: body.eventName || null, requested_selection: body.selection || null,
    requested_market: body.market || null, requested_american_odds: body.americanOdds ? Number(body.americanOdds) : null,
    requested_stake_units: body.stakeUnits ? Number(body.stakeUnits) : null, requested_result: body.result || null,
    requested_placed_at: body.placedAt || null, requested_event_commence_at: body.eventCommenceAt || null,
    requested_provider_event_id: body.providerEventId || null, requested_provider_sport_key: body.providerSportKey || null,
    requested_market_key: body.marketKey || null, requested_outcome_name: body.outcomeName || null,
    requested_line_point: body.linePoint === "" || body.linePoint == null ? null : Number(body.linePoint),
    requested_confidence: body.confidence ? Number(body.confidence) : 65,
    requested_real_stake: body.realStake === "" || body.realStake == null ? null : Number(body.realStake),
    requested_real_payout: body.realPayout === "" || body.realPayout == null ? null : Number(body.realPayout),
  };
  const response = await fetch(`${url}/rest/v1/rpc/review_external_ticket`, {
    method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload), cache: "no-store", signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("Ticket review failed", detail);
    return Response.json({ error: "The review could not be completed. Verify all official market fields." }, { status: 409 });
  }
  return Response.json({ reviewed: true, action, pickId: await response.json() });
}
