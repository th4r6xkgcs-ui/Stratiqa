export function validateEnvironment(env, strict = false) {
  const errors = [];
  const warnings = [];
  const mode = env.STRATIQA_PROVIDER_MODE ?? "mock";
  if (!["mock", "live"].includes(mode)) errors.push("STRATIQA_PROVIDER_MODE must be mock or live.");
  if (mode === "live" && !env.STRATIQA_ODDS_API_KEY) errors.push("STRATIQA_ODDS_API_KEY is required in live mode.");
  const secret = env.STRATIQA_SESSION_SECRET ?? "";
  if (strict && secret.length < 32) errors.push("STRATIQA_SESSION_SECRET must contain at least 32 characters.");
  if (!strict && secret.length < 32) warnings.push("Development sessions use a fallback secret; configure STRATIQA_SESSION_SECRET before deployment.");
  const appUrl = env.NEXT_PUBLIC_APP_URL ?? "";
  if (strict && !appUrl.startsWith("https://")) errors.push("NEXT_PUBLIC_APP_URL must use HTTPS in production.");
  if (!appUrl) warnings.push("NEXT_PUBLIC_APP_URL defaults to localhost.");
  return { valid: errors.length === 0, mode, errors, warnings };
}
