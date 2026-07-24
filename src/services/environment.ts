import "server-only";

const supportedModes = new Set(["mock", "live"]);

export function getProviderEnvironment() {
  const requestedMode = process.env.STRATIQA_PROVIDER_MODE ?? "mock";
  const mode = supportedModes.has(requestedMode) ? requestedMode : "mock";
  const hasOddsCredentials = Boolean(process.env.STRATIQA_ODDS_API_KEY);
  return {
    requestedMode,
    mode: mode === "live" && !hasOddsCredentials ? "mock" as const : mode as "mock" | "live",
    fallbackReason: mode === "live" && !hasOddsCredentials ? "Live mode requested without STRATIQA_ODDS_API_KEY." : null,
  };
}
