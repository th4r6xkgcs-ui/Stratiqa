import { getProviderHealth } from "@/services";
import { validateEnvironment } from "@/lib/config/environment";

export async function GET() {
  const environment = validateEnvironment(process.env, false);
  const health = await getProviderHealth();
  const unavailable = health.providers.filter((provider) => provider.status === "unavailable");
  const ready = environment.valid && unavailable.length === 0;
  return Response.json({
    status: ready ? "ready" : "not_ready",
    version: "16.3",
    providerMode: health.environment.mode,
    unavailableProviders: unavailable.map((provider) => provider.name),
    environmentWarnings: environment.warnings,
  }, { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
