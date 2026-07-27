import test from "node:test";
import assert from "node:assert/strict";
import { portfolioMetrics } from "../src/lib/strategies/math.js";
import { validateStrategyPortfolio } from "../src/lib/strategies/validation.js";

const build = { id: "custom", name: "Custom", description: "", minimumConfidence: 70, weights: { confidence: 40, value: 35, market: 25 } };
const pick = { id: "pick-1", matchupId: "sea-vs-sf", selection: "Seattle ML", price: -120, units: 1, buildId: "custom", buildName: "Custom", buildScore: 84, trackedAt: "2026-07-27T00:00:00.000Z", outcome: "won" };

test("accepts a valid strategy portfolio", () => {
  assert.equal(validateStrategyPortfolio({ builds: [build], activeBuildId: "custom", trackedPicks: [pick] }).ok, true);
});

test("rejects an unknown active build and unsafe unit size", () => {
  assert.equal(validateStrategyPortfolio({ builds: [build], activeBuildId: "missing", trackedPicks: [] }).ok, false);
  assert.equal(validateStrategyPortfolio({ builds: [build], activeBuildId: "custom", trackedPicks: [{ ...pick, units: 25 }] }).ok, false);
});

test("calculates build-level tracked performance", () => {
  const result = portfolioMetrics([pick, { ...pick, id: "pick-2", price: 110, outcome: "lost" }], "custom");
  assert.equal(result.settled, 2);
  assert.equal(result.winRate, 50);
  assert.equal(result.profit.toFixed(3), "-0.167");
  assert.equal(result.roi.toFixed(3), "-8.333");
});
