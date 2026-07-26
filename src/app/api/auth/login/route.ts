import { createHash } from "node:crypto";
import { createSession } from "@/lib/auth/session";
import { authenticateWithSupabase, isSupabaseAuthConfigured } from "@/lib/auth/supabase";
import { validateLogin } from "@/lib/auth/validation";
import { rateLimit, requestIdentity } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const limit = rateLimit(`login:${requestIdentity(request)}`, 5, 60_000);
  if (!limit.allowed) return Response.json({ error: "Too many login attempts. Try again shortly." }, { status: 429 });
  const body = await request.json().catch(() => null);
  const result = validateLogin(body);
  if (!result.ok || !result.value) return Response.json({ error: result.error }, { status: 400 });
  try {
    if (isSupabaseAuthConfigured()) {
      if (!result.value.password) return Response.json({ error: "Enter your password." }, { status: 400 });
      const auth = await authenticateWithSupabase({
        ...result.value,
        action: result.value.action === "signup" ? "signup" : "login",
      });
      if (!auth.user || auth.confirmationRequired) {
        return Response.json({ user: null, confirmationRequired: true, message: "Check your email to confirm your STRATIQA account." }, { status: 202 });
      }
      await createSession(auth.user);
      return Response.json({ user: auth.user });
    }
    const { email } = result.value;
    const displayName = result.value.displayName || email.split("@")[0];
    const user = { id: createHash("sha256").update(email).digest("hex").slice(0, 16), email, displayName, role: "analyst" as const };
    await createSession(user);
    return Response.json({ user });
  } catch (error) {
    console.error("Authentication request failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Authentication is unavailable." }, { status: 503 });
  }
}
