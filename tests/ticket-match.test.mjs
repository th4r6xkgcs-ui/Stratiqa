import test from "node:test";
import assert from "node:assert/strict";
import { scoreTicketMatch } from "../src/lib/picks/ticket-match.js";

const pick = {
  sportsbook: "DraftKings",
  selection: "Julio Rodriguez Over 1.5 Total Bases",
  eventName: "Seattle Mariners at San Francisco Giants",
};

test("strongly matches an extracted ticket to its immutable pick", () => {
  const score = scoreTicketMatch(pick, {
    sportsbook: "DraftKings",
    ticketId: "DK-123",
    selections: ["Julio Rodriguez Over 1.5 Total Bases"],
    event: "Seattle Mariners at San Francisco Giants",
    confidence: 94,
  });
  assert.equal(score, 100);
});

test("does not trust an unrelated ticket", () => {
  const score = scoreTicketMatch(pick, {
    sportsbook: "FanDuel",
    ticketId: null,
    selections: ["Aaron Judge Under 0.5 Home Runs"],
    event: "New York Yankees at Boston Red Sox",
    confidence: 90,
  });
  assert.ok(score < 30);
});
