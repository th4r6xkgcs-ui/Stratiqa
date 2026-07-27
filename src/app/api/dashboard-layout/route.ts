import { getSessionUser } from "@/lib/auth/session";
import { normalizeDashboardLayout } from "@/lib/dashboard/layout";
import { dashboardLayoutRepository } from "@/repositories/dashboard-layout";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  return Response.json({ layout: await dashboardLayoutRepository.get(user.id) });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body?.layout || typeof body.layout !== "object") return Response.json({ error: "A dashboard layout is required." }, { status: 400 });
  return Response.json({ layout: await dashboardLayoutRepository.save(user.id, normalizeDashboardLayout(body.layout)) });
}
