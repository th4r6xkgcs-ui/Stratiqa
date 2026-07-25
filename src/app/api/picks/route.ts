import { getSessionUser } from "@/lib/auth/session";
import { profitForResult, validateGrade, validatePick } from "@/lib/picks/validation";
import { picksRepository } from "@/repositories/picks";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  try { return Response.json({ picks: await picksRepository.list(user.id) }); }
  catch (error) { console.error("Pick list failed", error); return Response.json({ error: "Pick history is temporarily unavailable." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const parsed = validatePick(await request.json().catch(() => null));
  if (!parsed.ok || !parsed.value) return Response.json({ error: parsed.error }, { status: 400 });
  try { return Response.json({ pick: await picksRepository.create(user.id, parsed.value) }, { status: 201 }); }
  catch (error) { console.error("Pick creation failed", error); return Response.json({ error: "The pick could not be saved." }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const parsed = validateGrade(await request.json().catch(() => null));
  if (!parsed.ok || !parsed.value) return Response.json({ error: parsed.error }, { status: 400 });
  try {
    const existing = (await picksRepository.list(user.id)).find((pick) => pick.id === parsed.value.id);
    if (!existing) return Response.json({ error: "Pick not found." }, { status: 404 });
    const profit = profitForResult(existing.americanOdds, existing.stakeUnits, parsed.value.result);
    const pick = await picksRepository.grade(user.id, existing.id, parsed.value.result, parsed.value.closingOdds, profit);
    return Response.json({ pick });
  } catch (error) { console.error("Pick grading failed", error); return Response.json({ error: "The result could not be saved." }, { status: 503 }); }
}
