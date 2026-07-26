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

test("normalizes NBA, NFL, NHL, and WNBA prop markets", () => {
  const cases = [
    ["basketball_nba", "player_points", "Points"],
    ["americanfootball_nfl", "player_pass_yds", "Passing Yards"],
    ["icehockey_nhl", "player_shots_on_goal", "Shots on Goal"],
    ["basketball_wnba", "player_rebounds", "Rebounds"],
  ];
  for (const [sportKey, marketKey, marketName] of cases) {
    const [prop] = normalizePlayerProps([{
      id: `${sportKey}-event`, sport_key: sportKey, commence_time: "2030-01-01T00:00:00Z",
      away_team: "Away", home_team: "Home",
      bookmakers: [{ title: "FanDuel", markets: [{ key: marketKey, outcomes: [
        { name: "Over", description: "Test Player", price: -110, point: 10.5 },
        { name: "Under", description: "Test Player", price: -110, point: 10.5 },
      ] }] }],
    }]);
    assert.equal(prop.providerSportKey, sportKey);
    assert.equal(prop.market, marketName);
  }
});
