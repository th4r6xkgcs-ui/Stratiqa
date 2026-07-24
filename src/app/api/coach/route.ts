import { answerCoach } from "@/lib/coach/service";
import { validateCoachPrompt } from "@/lib/coach/validation";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const result = validateCoachPrompt(body);
  if (!result.ok || !result.value) {
    return Response.json({ error: result.error ?? "Invalid coach request." }, { status: 400 });
  }

  try {
    return Response.json(await answerCoach(result.value));
  } catch (error) {
    console.error("AI Coach request failed", error);
    return Response.json({ error: "Coach data is temporarily unavailable." }, { status: 503 });
  }
}
