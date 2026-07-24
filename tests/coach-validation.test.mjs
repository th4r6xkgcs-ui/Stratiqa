import test from "node:test";
import assert from "node:assert/strict";
import { validateCoachPrompt } from "../src/lib/coach/validation.js";

test("accepts and normalizes a valid coach prompt", () => {
  assert.deepEqual(validateCoachPrompt({ message: "  Find an edge  ", focus: "props" }), {
    ok: true,
    value: { message: "Find an edge", focus: "props" },
  });
});

test("rejects empty and oversized prompts", () => {
  assert.equal(validateCoachPrompt({ message: " " }).ok, false);
  assert.equal(validateCoachPrompt({ message: "x".repeat(501) }).ok, false);
});

test("falls back to slate focus for unknown values", () => {
  assert.equal(validateCoachPrompt({ message: "Help", focus: "unknown" }).value.focus, "slate");
});
