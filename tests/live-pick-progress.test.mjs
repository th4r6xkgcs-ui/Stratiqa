import test from "node:test";
import assert from "node:assert/strict";
import { livePickProgress } from "../src/lib/picks/live-progress.js";

const score = { homeTeam: "Boston Celtics", awayTeam: "New York Knicks", homeScore: 54, awayScore: 50 };

test("describes moneyline position without declaring a result", () => {
  assert.equal(livePickProgress({ marketKey: "h2h", outcomeName: "Boston Celtics" }, score).label, "Currently ahead");
});

test("calculates current spread coverage", () => {
  assert.equal(livePickProgress({ marketKey: "spreads", outcomeName: "New York Knicks", linePoint: 6.5 }, score).label, "Covering");
});

test("tracks totals against the locked line", () => {
  assert.equal(livePickProgress({ marketKey: "totals", outcomeName: "Over", linePoint: 100.5 }, score).tone, "winning");
});
