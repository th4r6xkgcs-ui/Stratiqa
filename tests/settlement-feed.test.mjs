import test from "node:test";
import assert from "node:assert/strict";
import { buildSettlementFeed, ratingImpactExplanation } from "../src/lib/notifications/settlement-feed.js";

const pick = {
  id: "pick-1", source: "provider", result: "win", category: "moneyline",
  selection: "Seattle ML", americanOdds: 145, placedAt: "2026-07-25T12:00:00Z",
  gradedAt: "2026-07-25T20:00:00Z", certificationStatus: "tracked",
};

test("explains exact rating movement in beginner-friendly language", () => {
  assert.equal(
    ratingImpactExplanation(pick, { ratingChange: 14 }),
    "+14 rating for winning as an underdog in Moneylines.",
  );
});

test("turns settlement audits into lifecycle notifications", () => {
  const feed = buildSettlementFeed({
    picks: [pick],
    impacts: [{ pickId: "pick-1", ratingChange: 14 }],
    audits: [{ id: 3, pickId: "pick-1", previousResult: "pending", result: "win", createdAt: "2026-07-25T20:00:00Z" }],
  });
  assert.equal(feed[0].title, "Pick won");
  assert.match(feed[0].detail, /\+14 rating/);
});

test("makes official corrections explicit", () => {
  const feed = buildSettlementFeed({
    picks: [{ ...pick, result: "loss" }],
    audits: [{ id: 4, pickId: "pick-1", previousResult: "win", result: "loss", createdAt: "2026-07-26T10:00:00Z" }],
  });
  assert.equal(feed[0].title, "Official result corrected");
  assert.match(feed[0].detail, /WIN → LOSS/);
});

test("explains delayed player props without alarming users", () => {
  const feed = buildSettlementFeed({
    now: new Date("2026-07-26T12:00:00Z").getTime(),
    picks: [{ ...pick, result: "pending", category: "player_prop", eventCommenceAt: "2026-07-25T20:00:00Z" }],
  });
  assert.equal(feed[0].title, "Official result still pending");
  assert.match(feed[0].detail, /safe and locked/);
  assert.match(feed[0].detail, /final player statistics/);
});
