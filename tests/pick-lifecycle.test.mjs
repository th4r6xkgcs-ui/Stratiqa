import test from "node:test";
import assert from "node:assert/strict";
import { pickLifecycle, lifecycleLabel } from "../src/lib/picks/lifecycle.js";

const future = { result: "pending", eventCommenceAt: "2030-01-01T00:00:00Z" };

test("classifies the complete pick lifecycle", () => {
  assert.equal(pickLifecycle(future, undefined, Date.parse("2029-01-01T00:00:00Z")), "upcoming");
  assert.equal(pickLifecycle(future, { completed: false, homeScore: 2, awayScore: 1 }, Date.parse("2029-01-01T00:00:00Z")), "live");
  assert.equal(pickLifecycle(future, { completed: true, homeScore: 2, awayScore: 1 }), "awaiting");
  assert.equal(pickLifecycle({ ...future, result: "win" }), "settled");
});

test("uses the event start when a live score is delayed", () => {
  assert.equal(pickLifecycle(future, undefined, Date.parse("2030-01-01T00:01:00Z")), "live");
  assert.equal(lifecycleLabel("awaiting"), "Awaiting official result");
});
