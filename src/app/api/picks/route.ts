import { getSessionUser } from "@/lib/auth/session";
import { validatePick } from "@/lib/picks/validation";
import { picksRepository } from "@/repositories/picks";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  try {
    const [picks, ratings, cards] = await Promise.all([picksRepository.list(user.id), picksRepository.listRatings(user.id), picksRepository.listCards(user.id)]);
    return Response.json({ picks, ratings, cards });
  }
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

export async function PATCH() {
  return Response.json(
    { error: "Results are locked and can only be settled by a verified data provider." },
    { status: 403 },
  );
}
