import "server-only";
import { cookies } from "next/headers";

export type SessionUser = { id: string; email: string; displayName: string; role: "analyst" };
const COOKIE_NAME = "stratiqa_session";
const encoder = new TextEncoder();

function secret() {
  const configured = process.env.STRATIQA_SESSION_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") return null;
  return "stratiqa-development-session-secret-change-me";
}

async function signature(payload: string, keyValue: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(keyValue), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Buffer.from(bytes).toString("base64url");
}

export async function createSession(user: SessionUser) {
  const key = secret();
  if (!key) throw new Error("STRATIQA_SESSION_SECRET is required in production.");
  const payload = Buffer.from(JSON.stringify({ user, expiresAt: Date.now() + 7 * 86_400_000 })).toString("base64url");
  const token = `${payload}.${await signature(payload, key)}`;
  (await cookies()).set(COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 7 * 86_400, priority: "high" });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const key = secret();
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!key || !token) return null;
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature || await signature(payload, key) !== suppliedSignature) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as { user: SessionUser; expiresAt: number };
    return parsed.expiresAt > Date.now() ? parsed.user : null;
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}
