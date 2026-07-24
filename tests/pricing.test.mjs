import test from "node:test";
import assert from "node:assert/strict";
import { americanToImpliedProbability, expectedValue, removeTwoWayVig } from "../src/services/pricing.js";

test("converts American prices", () => {
  assert.equal(americanToImpliedProbability(100), 0.5);
  assert.equal(americanToImpliedProbability(-150), 0.6);
});

test("normalizes a two-way market without vig", () => {
  const result = removeTwoWayVig(-110, -110);
  assert.equal(result.first + result.second, 1);
  assert.ok(result.hold > 0);
});

test("calculates positive expected value", () => {
  assert.ok(expectedValue(0.58, 105) > 0);
});

test("rejects zero odds", () => {
  assert.throws(() => americanToImpliedProbability(0));
});
