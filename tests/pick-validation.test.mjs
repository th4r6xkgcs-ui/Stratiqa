import test from "node:test";
import assert from "node:assert/strict";
import { profitForResult, validateGrade, validatePick } from "../src/lib/picks/validation.js";

test("validates and normalizes a tracked pick", () => {
  const result = validatePick({ sport: " mlb ", category: "moneyline", eventName: "Mariners at Giants", selection: "Mariners ML", market: "Moneyline", sportsbook: "DraftKings", americanOdds: "-110", stakeUnits: "1.5", confidence: "72", notes: " Model edge " });
  assert.equal(result.ok, true);
  assert.equal(result.value.sport, "MLB");
  assert.equal(result.value.stakeUnits, 1.5);
});

test("rejects invalid odds and stakes", () => {
  assert.equal(validatePick({ sport: "MLB", category: "moneyline", eventName: "A at B", selection: "A", market: "ML", sportsbook: "Book", americanOdds: -50, stakeUnits: 1, confidence: 60 }).ok, false);
  assert.equal(validatePick({ sport: "MLB", category: "moneyline", eventName: "A at B", selection: "A", market: "ML", sportsbook: "Book", americanOdds: -110, stakeUnits: 101, confidence: 60 }).ok, false);
});

test("calculates American-odds profit for manual grading", () => {
  assert.equal(profitForResult(-200, 2, "win"), 1);
  assert.equal(profitForResult(150, 2, "win"), 3);
  assert.equal(profitForResult(-110, 2, "loss"), -2);
  assert.equal(profitForResult(-110, 2, "push"), 0);
  assert.equal(validateGrade({ id: "pick-1", result: "win", closingOdds: -105 }).ok, true);
});
