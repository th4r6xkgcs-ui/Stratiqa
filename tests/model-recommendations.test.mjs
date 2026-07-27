import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRecommendation, recommendationDesk, recommendationReasons, recommendationScore } from "../src/lib/models/recommendations.js";

const model = { factors: ["market_value", "recent_form", "matchup"], strategy: "market_value", risk_profile: "balanced", weights: { market_value: 35, recent_form: 24, matchup: 27 } };

test("scores stronger markets above weaker ones", () => {
  assert.ok(recommendationScore(model, { confidence: 82, expectedValue: 10 }) > recommendationScore(model, { confidence: 63, expectedValue: 3 }));
});

test("explains recommendations using the model's own signals", () => {
  const reasons = recommendationReasons(model, { confidence: 82, expectedValue: 10 });
  assert.equal(reasons.length, 3);
  assert.match(reasons[0], /current price/);
});

test("different weights create different scores from the same market", () => {
  const market = { confidence: 70, expectedValue: 5, hitRate: 82, market: { moneyPercent: 48, ticketPercent: 55 } };
  const usage = { ...model, weights: { market_value: 5, recent_form: 5, matchup: 5, player_usage: 60 }, factors: [...model.factors, "player_usage"] };
  const marketLed = { ...usage, weights: { market_value: 5, recent_form: 5, matchup: 5, player_usage: 5, line_movement: 60 }, factors: [...usage.factors, "line_movement"] };
  assert.ok(recommendationScore(usage, market) > recommendationScore(marketLed, market));
});

test("selective models pass when evidence misses their threshold", () => {
  const evaluation = evaluateRecommendation({ ...model, risk_profile: "selective" }, { confidence: 55, expectedValue: 2 });
  assert.equal(evaluation.decision, "pass");
});

test("builds consensus only when models independently match", () => {
  const desk = recommendationDesk([
    { decision: "recommend", eventName: "A at B", selection: "A ML", confidence: 80, expectedValue: 8 },
    { decision: "recommend", eventName: "A at B", selection: "A ML", confidence: 76, expectedValue: 7 },
    { decision: "pass", eventName: "C at D", selection: "C ML", confidence: 50, expectedValue: 1 },
  ]);
  assert.equal(desk.consensus.length, 2);
  assert.equal(desk.passes, 1);
});
