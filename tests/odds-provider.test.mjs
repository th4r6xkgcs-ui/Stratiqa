import test from "node:test";
import assert from "node:assert/strict";

test("live odds normalization maps supported matchups and selects the best price", async () => {
  const source = await import("../src/services/odds-normalizer.js");
  const result = source.normalizeOdds([{
    away_team: "Seattle Mariners",
    home_team: "San Francisco Giants",
    bookmakers: [
      { title: "Book A", markets: [{ key: "h2h", outcomes: [{ name: "Seattle Mariners", price: -120 }, { name: "San Francisco Giants", price: 110 }] }] },
      { title: "Book B", markets: [{ key: "h2h", outcomes: [{ name: "Seattle Mariners", price: -115 }, { name: "San Francisco Giants", price: 105 }] }] },
    ],
  }]);
  assert.equal(result[0].matchupId, "sea-vs-sf");
  assert.equal(result[0].bestBook, "Book A");
  assert.equal(result[0].quotes.length, 4);
});

test("live odds normalization ignores unsupported teams", async () => {
  const source = await import("../src/services/odds-normalizer.js");
  assert.deepEqual(source.normalizeOdds([{ away_team: "Unknown A", home_team: "Unknown B", bookmakers: [] }]), []);
});
