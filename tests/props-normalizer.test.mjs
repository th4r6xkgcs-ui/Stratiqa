import test from "node:test";
import assert from "node:assert/strict";
import { normalizePlayerProps } from "../src/services/props-normalizer.js";

test("normalizes provider player props with immutable identity and sportsbook prices", () => {
  const result = normalizePlayerProps([{
    id: "event-1", sport_key: "baseball_mlb", commence_time: "2030-01-01T00:00:00Z",
    away_team: "Seattle Mariners", home_team: "San Francisco Giants",
    bookmakers: [{ title: "DraftKings", markets: [{ key: "batter_total_bases", outcomes: [
      { name: "Over", description: "Julio Rodriguez", price: 105, point: 1.5 },
      { name: "Under", description: "Julio Rodriguez", price: -135, point: 1.5 },
    ] }] }],
  }]);
  assert.equal(result.length, 1);
  assert.equal(result[0].providerEventId, "event-1");
  assert.equal(result[0].marketKey, "batter_total_bases");
  assert.equal(result[0].player, "Julio Rodriguez");
  assert.deepEqual(result[0].quotes, [
    { book: "DraftKings", outcomeName: "Over", price: 105 },
    { book: "DraftKings", outcomeName: "Under", price: -135 },
  ]);
});
