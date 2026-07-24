import { getProviderHealth } from "@/services";

export async function GET() {
  const health = await getProviderHealth();
  const degraded = health.providers.some((provider) => provider.status !== "healthy");
  return Response.json({ status: degraded ? "degraded" : "healthy", ...health }, { headers: { "Cache-Control": "no-store" } });
}
