import { getSessionUser } from "@/lib/auth/session";

const config = () => ({ url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""), key: process.env.SUPABASE_SERVICE_ROLE_KEY });
const headers = (key: string, extra?: Record<string, string>) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra });
const sends = new Map<string, number[]>();
const clean = (value: unknown, max: number) => typeof value === "string" ? value.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "";
const roomKey = (value: unknown) => clean(value, 220);

async function aliases(url: string, key: string, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const response = await fetch(`${url}/rest/v1/competitive_profiles?user_id=in.(${ids.join(",")})&select=user_id,public_alias`, { headers: headers(key), cache: "no-store" });
  const profiles = response.ok ? await response.json() as Array<{ user_id: string; public_alias: string | null }> : [];
  return new Map(profiles.map((profile) => [profile.user_id, profile.public_alias?.trim() || "STRATIQA analyst"]));
}

export async function GET(request: Request) {
  const user = await getSessionUser(); if (!user) return Response.json({ error: "Sign in to join a game room." }, { status: 401 });
  const eventId = roomKey(new URL(request.url).searchParams.get("eventId")); if (!eventId) return Response.json({ error: "Choose a game room first." }, { status: 400 });
  const { url, key } = config(); if (!url || !key) return Response.json({ messages: [], currentUserId: user.id, roomAvailable: false });
  const response = await fetch(`${url}/rest/v1/game_room_messages?event_id=eq.${encodeURIComponent(eventId)}&is_hidden=eq.false&select=id,user_id,body,created_at&order=created_at.asc&limit=80`, { headers: headers(key), cache: "no-store" });
  if (!response.ok) return Response.json({ messages: [], currentUserId: user.id, roomAvailable: false });
  const rows = await response.json() as Array<{ id: string; user_id: string; body: string; created_at: string }>;
  const names = await aliases(url, key, [...new Set(rows.map((row) => row.user_id))]);
  return Response.json({ currentUserId: user.id, roomAvailable: true, messages: rows.map((row) => ({ id: row.id, userId: row.user_id, alias: names.get(row.user_id) ?? "STRATIQA analyst", body: row.body, createdAt: row.created_at })) });
}

export async function POST(request: Request) {
  const user = await getSessionUser(); if (!user) return Response.json({ error: "Sign in to join a game room." }, { status: 401 });
  const body = await request.json().catch(() => null); const { url, key } = config();
  if (!url || !key) return Response.json({ error: "Game Rooms need database configuration." }, { status: 503 });
  if (body?.action === "report") {
    const messageId = clean(body.messageId, 80); if (!messageId) return Response.json({ error: "Message not found." }, { status: 400 });
    const response = await fetch(`${url}/rest/v1/game_room_reports`, { method: "POST", headers: headers(key, { Prefer: "resolution=ignore-duplicates,return=minimal" }), body: JSON.stringify({ message_id: messageId, reporter_id: user.id }) });
    return response.ok ? Response.json({ ok: true }) : Response.json({ error: "Report could not be sent." }, { status: 503 });
  }
  const eventId = roomKey(body?.eventId); const eventName = clean(body?.eventName, 160); const message = clean(body?.body, 400);
  if (!eventId || !eventName || message.length < 1) return Response.json({ error: "A room and message are required." }, { status: 400 });
  const now = Date.now(); const recent = (sends.get(user.id) ?? []).filter((time) => now - time < 60_000);
  if (recent.length >= 6) return Response.json({ error: "Slow down—Game Rooms allow six messages per minute." }, { status: 429 });
  sends.set(user.id, [...recent, now]);
  const response = await fetch(`${url}/rest/v1/game_room_messages`, { method: "POST", headers: headers(key, { Prefer: "return=representation" }), body: JSON.stringify({ event_id: eventId, event_name: eventName, user_id: user.id, body: message }) });
  if (!response.ok) return Response.json({ error: "Game room is not ready yet. Run the Game Rooms SQL migration." }, { status: 503 });
  const row = (await response.json() as Array<{ id: string; user_id: string; body: string; created_at: string }>)[0];
  return Response.json({ message: { id: row.id, userId: row.user_id, alias: user.displayName, body: row.body, createdAt: row.created_at } }, { status: 201 });
}
