import test from "node:test";
import assert from "node:assert/strict";
import { validateLogin } from "../src/lib/auth/validation.js";

test("normalizes a valid identity request", () => {
  assert.deepEqual(validateLogin({ email: " USER@Example.com ", displayName: " Heriberto " }), { ok: true, value: { email: "user@example.com", displayName: "Heriberto" } });
});

test("rejects malformed email and display names", () => {
  assert.equal(validateLogin({ email: "bad", displayName: "H" }).ok, false);
  assert.equal(validateLogin({ email: "user@example.com", displayName: "x".repeat(41) }).ok, false);
});
