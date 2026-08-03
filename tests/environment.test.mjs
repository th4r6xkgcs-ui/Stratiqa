import test from "node:test";
import assert from "node:assert/strict";
import { validateEnvironment } from "../src/lib/config/environment.js";

test("accepts production-safe mock configuration", () => {
  const result = validateEnvironment({ NEXT_PUBLIC_APP_URL: "https://stratiqa.example", STRATIQA_PROVIDER_MODE: "mock", STRATIQA_SESSION_SECRET: "x".repeat(32), NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key", SUPABASE_SERVICE_ROLE_KEY: "service-role-key" }, true);
  assert.equal(result.valid, true);
});

test("rejects missing live credentials and insecure production URL", () => {
  const result = validateEnvironment({ NEXT_PUBLIC_APP_URL: "http://example.com", STRATIQA_PROVIDER_MODE: "live", STRATIQA_SESSION_SECRET: "short" }, true);
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, [
    "STRATIQA_ODDS_API_KEY is required in live mode.",
    "STRATIQA_SESSION_SECRET must contain at least 32 characters.",
    "NEXT_PUBLIC_APP_URL must use HTTPS in production.",
    "NEXT_PUBLIC_SUPABASE_URL must use an HTTPS project URL in production.",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required for production sign-in.",
    "SUPABASE_SERVICE_ROLE_KEY is required for verified picks, ratings, and settlement.",
  ]);
});
