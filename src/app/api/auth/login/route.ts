import { createHash } from "node:crypto";
import { createSession } from "@/lib/auth/session";
import { validateLogin } from "@/lib/auth/validation";
import { rateLimit, requestIdentity } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const limit = rateLimit(`login:${requestIdentity(request)}`, 5, 60_000);
  if (!limit.allowed) return Response.json({ error: "Too many login attempts. Try again shortly." }, { status: 429 });
  const body = await request.json().catch(() => null);
  const result = validateLogin(body);
  if (!result.ok || !result.value) return Response.json({ error: result.error }, { status: 400 });
  const user = { id: createHash("sha256").update(result.value.email).digest("hex").slice(0, 16), ...result.value, role: "analyst" as const };
  try {
    await createSession(user);
    return Response.json({ user });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Authentication is not configured for this environment." }, { status: 503 });
  }
}
