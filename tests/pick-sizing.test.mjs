import test from "node:test";
import assert from "node:assert/strict";
import { recommendedUnits } from "../src/lib/picks/sizing.js";

test("recommended sizing scales with card confidence", () => {
  assert.equal(recommendedUnits(85), 1.25);
  assert.equal(recommendedUnits(75), 1);
  assert.equal(recommendedUnits(65), 0.75);
  assert.equal(recommendedUnits(55), 0.5);
});

test("recommended sizing caps correlated cards", () => {
  assert.equal(recommendedUnits(90, true), 0.75);
});
