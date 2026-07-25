import test from "node:test";
import assert from "node:assert/strict";
import { validateEnvironment } from "../src/lib/config/environment.js";

test("accepts production-safe mock configuration", () => {
  const result = validateEnvironment({ NEXT_PUBLIC_APP_URL: "https://stratiqa.example", STRATIQA_PROVIDER_MODE: "mock", STRATIQA_SESSION_SECRET: "x".repeat(32) }, true);
  assert.equal(result.valid, true);
});

test("rejects missing live credentials and insecure production URL", () => {
  const result = validateEnvironment({ NEXT_PUBLIC_APP_URL: "http://example.com", STRATIQA_PROVIDER_MODE: "live", STRATIQA_SESSION_SECRET: "short" }, true);
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 3);
});
