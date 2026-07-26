import { getProviderHealth } from "@/services";
import { configuredPlayerStatLeagues } from "@/services/player-stats-provider";

export async function GET() {
  const health = await getProviderHealth();
  const degraded = health.providers.some((provider) => provider.status !== "healthy");
  return Response.json({
    status: degraded ? "degraded" : "healthy",
    ...health,
    policy: {
      liveLabels: ["live", "delayed", "unavailable"],
      mockLabel: "simulation",
      oddsCacheSeconds: 90,
      propsCacheSeconds: 120,
      staleFallbackMinutes: 15,
      paidProviderRequired: false,
    },
    settlement: { playerStatLeagues: configuredPlayerStatLeagues(), correctionWindowHours: 72 },
  }, { headers: { "Cache-Control": "no-store" } });
}
