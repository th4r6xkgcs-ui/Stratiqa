import { createHash, randomUUID } from "node:crypto";
import { getSessionUser } from "@/lib/auth/session";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Sign in to import a ticket." }, { status: 401 });
  const form = await request.formData();
  const sportsbook = String(form.get("sportsbook") ?? "").trim().slice(0, 60);
  const pickId = String(form.get("pickId") ?? "").trim();
  const ticketId = String(form.get("ticketId") ?? "").trim().slice(0, 120) || null;
  const image = form.get("image");
  if (!pickId || !sportsbook || (!ticketId && !(image instanceof File))) return Response.json({ error: "Choose a locked pick and add a ticket ID or screenshot." }, { status: 400 });
  if (image instanceof File && (image.size > 5_242_880 || !["image/jpeg", "image/png", "image/webp"].includes(image.type))) return Response.json({ error: "Use a JPG, PNG, or WebP image under 5 MB." }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Response.json({ error: "Secure evidence storage is not configured." }, { status: 503 });
  const serviceHeaders = { apikey: key, Authorization: `Bearer ${key}` };
  const pickResponse = await fetch(`${url}/rest/v1/graded_betting_activity?id=eq.${encodeURIComponent(pickId)}&user_id=eq.${user.id}&source=eq.provider&select=id,sportsbook,event_commence_at,certification_status&limit=1`, { headers: serviceHeaders, cache: "no-store" });
  const pick = pickResponse.ok ? (await pickResponse.json() as Array<{ id: string; sportsbook: string; event_commence_at: string | null; certification_status: string }>)[0] : null;
  if (!pick) return Response.json({ error: "That locked pick could not be found." }, { status: 404 });
  if (pick.certification_status === "certified") return Response.json({ error: "That pick is already STRATIQA Certified." }, { status: 409 });
  if (pick.sportsbook.toLowerCase() !== sportsbook.toLowerCase()) return Response.json({ error: `Use the ticket from ${pick.sportsbook}, where this line was locked.` }, { status: 409 });
  if (!pick.event_commence_at) return Response.json({ error: "This older pick has no verifiable start time and cannot become certified." }, { status: 409 });
  if (new Date(pick.event_commence_at).getTime() <= Date.now()) return Response.json({ error: "Evidence must be submitted before the event starts." }, { status: 409 });
  const bytes = image instanceof File ? Buffer.from(await image.arrayBuffer()) : Buffer.from(`${sportsbook}:${ticketId}`);
  const contentHash = createHash("sha256").update(bytes).digest("hex");
  let objectPath: string | null = null;
  const headers = serviceHeaders;

  if (image instanceof File) {
    objectPath = `${user.id}/${randomUUID()}.${image.type.split("/")[1]}`;
    const upload = await fetch(`${url}/storage/v1/object/pick-evidence/${objectPath}`, { method: "POST", headers: { ...headers, "Content-Type": image.type, "x-upsert": "false" }, body: bytes });
    if (!upload.ok) return Response.json({ error: "The screenshot could not be stored securely." }, { status: 503 });
  }

  const insert = await fetch(`${url}/rest/v1/pick_evidence`, {
    method: "POST", headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ user_id: user.id, pick_id: pickId, sportsbook, ticket_id: ticketId, object_path: objectPath, content_hash: contentHash, verification_status: "pending", rating_eligible: false }),
  });
  if (!insert.ok) {
    if (objectPath) await fetch(`${url}/storage/v1/object/pick-evidence/${objectPath}`, { method: "DELETE", headers });
    return Response.json({ error: insert.status === 409 ? "That ticket or screenshot was already submitted." : "The evidence could not be recorded." }, { status: insert.status === 409 ? 409 : 503 });
  }
  return Response.json({ evidence: (await insert.json() as unknown[])[0], message: "Submitted for independent verification of your real-world financial stats." }, { status: 201 });
}
