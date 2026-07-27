import test from "node:test";
import assert from "node:assert/strict";
import { updateGameTimelines } from "../src/lib/games/timeline.js";

const pick = { eventId: "game-1", sportKey: "basketball_nba", eventName: "Knicks at Celtics", state: "live", awayTeam: "Knicks", homeTeam: "Celtics", awayScore: 40, homeScore: 44, result: "pending" };

test("records new observed score states without duplicating unchanged polls", () => {
  const first = updateGameTimelines({}, [pick], "2026-01-01T00:00:00Z");
  const second = updateGameTimelines(first.timelines, [pick], "2026-01-01T00:01:00Z");
  assert.equal(first.timelines["game-1"].length, 1);
  assert.equal(second.timelines["game-1"].length, 1);
  assert.equal(second.changed.length, 0);
});

test("records and reports a real score change", () => {
  const first = updateGameTimelines({}, [pick], "2026-01-01T00:00:00Z");
  const second = updateGameTimelines(first.timelines, [{ ...pick, homeScore: 46 }], "2026-01-01T00:01:00Z");
  assert.equal(second.timelines["game-1"].length, 2);
  assert.equal(second.changed[0].id, "game-1");
});
