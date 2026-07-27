import test from "node:test";
import assert from "node:assert/strict";
import { calibrationSummary, linkRecommendationOutcomes, recommendationIdentity } from "../src/lib/models/calibration.js";

test("creates stable recommendation identity from provider fields", () => {
  assert.equal(recommendationIdentity({ providerEventId: "E1", marketKey: "h2h", outcomeName: "SEA" }), "e1|h2h|sea|");
});

test("links only exact model and market outcomes", () => {
  const linked = linkRecommendationOutcomes(
    [{ id: "s1", model_id: "m1", provider_event_id: "e1", market_key: "h2h", outcome_name: "SEA" }],
    [{ model_id: "m1", provider_event_id: "e1", market_key: "h2h", outcome_name: "SEA", result: "win", graded_at: "now" }],
  );
  assert.equal(linked[0].result, "win");
});

test("calibration excludes passes and unresolved recommendations", () => {
  const summary = calibrationSummary([
    { decision: "recommend", model_score: 80, result: "win" },
    { decision: "recommend", model_score: 82, result: null },
    { decision: "pass", model_score: 60, result: "loss" },
  ]);
  assert.equal(summary.resolved, 1);
  assert.equal(summary.unresolved, 1);
  assert.equal(summary.passes, 1);
});
