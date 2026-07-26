import test from "node:test";
import assert from "node:assert/strict";
import { factorWeights, modelIdentity } from "../src/lib/models/profile.js";

test("creates category-specific model identities", () => {
  assert.equal(modelIdentity("player_prop", ["player_usage", "recent_form"], "balanced").archetype, "Usage Alchemist");
  assert.equal(modelIdentity("moneyline", ["bullpen", "matchup"], "selective").archetype, "Precision Ninth-Inning Warden");
  assert.equal(modelIdentity("total", ["weather", "recent_form"], "opportunistic").archetype, "Asymmetric Atmosphere Reader");
});

test("creates readable automatic factor weights", () => {
  const weights = factorWeights(["market_value", "matchup", "recent_form"], "matchup");
  assert.deepEqual(weights, { market_value: 30, matchup: 35, recent_form: 24 });
});
