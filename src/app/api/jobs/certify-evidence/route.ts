import { timingSafeEqual } from "node:crypto";

function authorized(request: Request) {
  const expected = process.env.STRATIQA_CERTIFICATION_WEBHOOK_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!expected || !supplied || expected.length !== supplied.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
}

export async function POST(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const evidenceId = typeof body?.evidenceId === "string" ? body.evidenceId : "";
  const providerReference = typeof body?.providerReference === "string" ? body.providerReference.trim().slice(0, 160) : "";
  const matched = body?.matched === true;
  const realStake = Number(body?.realStake);
  const realPayout = Number(body?.realPayout);
  const hasMoney = matched && Number.isFinite(realStake) && realStake > 0 && Number.isFinite(realPayout) && realPayout >= 0;
  if (!evidenceId || !providerReference) return Response.json({ error: "Evidence ID and provider reference are required." }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Response.json({ error: "Certification storage unavailable." }, { status: 503 });
  const response = await fetch(`${url}/rest/v1/pick_evidence?id=eq.${encodeURIComponent(evidenceId)}&verification_status=eq.pending`, {
    method: "PATCH", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ verification_status: matched ? "matched" : "rejected", rating_eligible: matched, matched_at: matched ? new Date().toISOString() : null, rejection_reason: matched ? null : `Provider did not match reference ${providerReference}` }),
  });
  if (!response.ok) return Response.json({ error: "Certification update failed." }, { status: 503 });
  const rows = await response.json() as Array<{ pick_id: string | null }>;
  if (!rows.length) return Response.json({ error: "Pending evidence not found." }, { status: 404 });
  if (hasMoney && rows[0].pick_id) {
    const moneyUpdate = await fetch(`${url}/rest/v1/graded_betting_activity?id=eq.${encodeURIComponent(rows[0].pick_id)}`, {
      method: "PATCH", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ real_stake_amount: realStake, real_payout_amount: realPayout, real_profit_amount: realPayout - realStake }),
    });
    if (!moneyUpdate.ok) return Response.json({ error: "Evidence matched, but real-money totals could not be saved." }, { status: 503 });
  }
  return Response.json({ updated: true, realMoneyRecorded: hasMoney });
}
