import test from "node:test";
import assert from "node:assert/strict";
import { settleGameMarket, settlePlayerProp } from "../src/lib/picks/settlement.js";
import { calculateVerifiedRating } from "../src/lib/ratings/verified-rating.js";

const score = { completed: true, homeTeam: "Giants", awayTeam: "Dodgers", homeScore: 4, awayScore: 6 };

test("settles supported game markets from provider scores", () => {
  assert.equal(settleGameMarket({ marketKey: "h2h", outcomeName: "Dodgers" }, score), "win");
  assert.equal(settleGameMarket({ marketKey: "spreads", outcomeName: "Giants", linePoint: 2 }, score), "push");
  assert.equal(settleGameMarket({ marketKey: "totals", outcomeName: "Over", linePoint: 8.5 }, score), "win");
});

test("settles player props from final official statistics", () => {
  const pick = { marketKey: "batter_total_bases", outcomeName: "Over", linePoint: 1.5 };
  assert.deepEqual(settlePlayerProp(pick, { status: "final", value: 2 }), {
    result: "win", reason: "Official batter_total_bases: 2; locked line: 1.5.", actual: 2,
  });
  assert.equal(settlePlayerProp({ ...pick, outcomeName: "Under" }, { status: "final", value: 2 }).result, "loss");
  assert.equal(settlePlayerProp(pick, { status: "final", value: 1.5 }).result, "push");
});

test("keeps incomplete props pending and voids DNP players", () => {
  const pick = { marketKey: "pitcher_strikeouts", outcomeName: "Over", linePoint: 5.5 };
  assert.equal(settlePlayerProp(pick, { status: "pending" }).result, "pending");
  assert.equal(settlePlayerProp(pick, { status: "dnp" }).result, "void");
});

test("never rates self-reported results", () => {
  const current = { rating: 1500, gradedPicks: 0 };
  assert.deepEqual(calculateVerifiedRating(current, { source: "user", result: "win", americanOdds: 200 }), current);
});

test("uses verified outcomes, price difficulty, confidence, and sample status", () => {
  const next = calculateVerifiedRating(
    { rating: 1500, gradedPicks: 0, wins: 0, losses: 0, pushes: 0, confidenceCalibration: 0 },
    { source: "provider", result: "win", americanOdds: 200, confidence: 60, closingLineValue: 3 },
  );
  assert.equal(next.wins, 1);
  assert.equal(next.gradedPicks, 1);
  assert.equal(next.provisional, true);
  assert.ok(next.rating > 1500);
});
