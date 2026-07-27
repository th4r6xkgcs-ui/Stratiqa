import { getSessionUser } from "@/lib/auth/session";
import { strategyPortfolioRepository } from "@/repositories/strategy-portfolio";
import { validateStrategyPortfolio } from "@/lib/strategies/validation.js";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  return Response.json({ portfolio: await strategyPortfolioRepository.get(user.id) }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const validation = validateStrategyPortfolio(await request.json().catch(() => null));
  if (!validation.ok) return Response.json({ error: validation.error }, { status: 400 });
  return Response.json({ portfolio: await strategyPortfolioRepository.save(user.id, validation.value) });
}
