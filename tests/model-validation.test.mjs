import test from "node:test";
import assert from "node:assert/strict";
import { modelValidationSummary, promotionReadiness } from "../src/lib/models/validation.js";

test("summarizes only settled verified model outcomes", () => {
  const result = modelValidationSummary([
    { result: "win", stake_units: 1, profit_units: 1, graded_at: new Date().toISOString() },
    { result: "loss", stake_units: 1, profit_units: -1, graded_at: new Date().toISOString() },
    { result: "pending", stake_units: 1, profit_units: 0, graded_at: null },
  ]);
  assert.equal(result.verified, 2);
  assert.equal(result.accuracy, 50);
  assert.equal(result.roi, 0);
});

test("requires ten verified recommendations before promotion", () => {
  assert.equal(promotionReadiness({ verified: 9 }).ready, false);
  assert.equal(promotionReadiness({ verified: 10 }).ready, true);
});
