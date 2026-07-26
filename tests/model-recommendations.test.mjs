import test from "node:test";
import assert from "node:assert/strict";
import { recommendationReasons, recommendationScore } from "../src/lib/models/recommendations.js";

const model = { factors: ["market_value", "recent_form", "matchup"], strategy: "market_value", risk_profile: "balanced", weights: { market_value: 35, recent_form: 24, matchup: 27 } };

test("scores stronger markets above weaker ones", () => {
  assert.ok(recommendationScore(model, { confidence: 82, expectedValue: 10 }) > recommendationScore(model, { confidence: 63, expectedValue: 3 }));
});

test("explains recommendations using the model's own signals", () => {
  const reasons = recommendationReasons(model);
  assert.equal(reasons.length, 3);
  assert.match(reasons[0], /current price/);
});
