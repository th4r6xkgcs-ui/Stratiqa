import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLiveBoard } from "../src/services/live-board-normalizer.js";

test("keeps one best sportsbook price per selectable outcome", () => {
  const [event] = normalizeLiveBoard([{
    id: "game-1", sport_key: "basketball_nba", commence_time: "2030-01-01T00:00:00Z",
    away_team: "Los Angeles Lakers", home_team: "Boston Celtics",
    bookmakers: [
      { title: "Book A", markets: [{ key: "h2h", outcomes: [{ name: "Los Angeles Lakers", price: 120 }, { name: "Boston Celtics", price: -135 }] }] },
      { title: "Book B", markets: [{ key: "h2h", outcomes: [{ name: "Los Angeles Lakers", price: 125 }, { name: "Boston Celtics", price: -140 }] }] },
    ],
  }]);
  assert.equal(event.slug, "basketball_nba--game-1");
  assert.equal(event.quotes.length, 2);
  assert.equal(event.quotes.find((quote) => quote.outcomeName === "Los Angeles Lakers").price, 125);
  assert.equal(event.quotes.find((quote) => quote.outcomeName === "Boston Celtics").price, -135);
});

test("formats spread and total lines as clear user choices", () => {
  const [event] = normalizeLiveBoard([{
    id: "game-2", sport_key: "americanfootball_nfl", commence_time: "2030-01-01T00:00:00Z",
    away_team: "New York Jets", home_team: "Buffalo Bills",
    bookmakers: [{ title: "Book", markets: [
      { key: "spreads", outcomes: [{ name: "New York Jets", price: -110, point: 3.5 }] },
      { key: "totals", outcomes: [{ name: "Over", price: -105, point: 44.5 }, { name: "Under", price: -115, point: 44.5 }] },
    ] }],
  }]);
  assert.deepEqual(event.quotes.map((quote) => quote.line), ["NYJ +3.5", "Over 44.5", "Under 44.5"]);
});
