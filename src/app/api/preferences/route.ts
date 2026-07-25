import { getSessionUser } from "@/lib/auth/session";
import { preferencesRepository, type RiskProfile } from "@/repositories/preferences";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  return Response.json({ preferences: await preferencesRepository.get(user.id) });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const risks = new Set<RiskProfile>(["conservative", "balanced", "aggressive"]);
  if (!body || !risks.has(body.riskProfile) || !Array.isArray(body.leagues) || !Array.isArray(body.sportsbooks) || typeof body.maxUnitSize !== "number" || body.maxUnitSize <= 0 || body.maxUnitSize > 10) {
    return Response.json({ error: "Invalid preference values." }, { status: 400 });
  }
  return Response.json({ preferences: await preferencesRepository.save(user.id, { riskProfile: body.riskProfile, leagues: body.leagues.slice(0, 10), sportsbooks: body.sportsbooks.slice(0, 10), maxUnitSize: body.maxUnitSize }) });
}
