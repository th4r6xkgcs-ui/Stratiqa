import { getSessionUser } from "@/lib/auth/session";

const emptyStatus = { available: false, lastRun: null, lastSuccessfulAt: null, openIssues: [], canRetry: false };

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const admins = (process.env.STRATIQA_ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  const canRetry = admins.includes(user.email.toLowerCase());
  if (!url || !key) return Response.json({ ...emptyStatus, canRetry });
  try {
    const response = await fetch(`${url}/rest/v1/rpc/get_settlement_operations_status`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return Response.json({ ...emptyStatus, canRetry });
    const status = await response.json();
    return Response.json({ available: true, ...status, canRetry }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ...emptyStatus, canRetry });
  }
}
