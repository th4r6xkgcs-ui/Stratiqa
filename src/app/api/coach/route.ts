import { answerCoach } from "@/lib/coach/service";
import { validateCoachPrompt } from "@/lib/coach/validation";
import { logger, requestId } from "@/lib/observability/logger";
import { rateLimit, requestIdentity } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const id = requestId(request);
  const limit = rateLimit(`coach:${requestIdentity(request)}`, 30, 60_000);
  if (!limit.allowed) return Response.json({ error: "Coach request limit reached." }, { status: 429, headers: { "X-Request-Id": id } });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400, headers: { "X-Request-Id": id } });
  }

  const result = validateCoachPrompt(body);
  if (!result.ok || !result.value) {
    return Response.json({ error: result.error ?? "Invalid coach request." }, { status: 400, headers: { "X-Request-Id": id } });
  }

  try {
    const reply = await answerCoach(result.value);
    logger.info("coach_request_completed", { requestId: id, dataMode: reply.snapshot.mode });
    return Response.json(reply, { headers: { "X-Request-Id": id } });
  } catch (error) {
    logger.error("coach_request_failed", error, { requestId: id });
    return Response.json({ error: "Coach data is temporarily unavailable." }, { status: 503, headers: { "X-Request-Id": id } });
  }
}
