import test from "node:test";
import assert from "node:assert/strict";
import { competitiveStanding, nearbyRivals, promotionForImpact } from "../src/lib/ratings/competitive-ranks.js";

test("keeps analysts provisional until 25 settled picks", () => {
  const standing = competitiveStanding(1712, 18);
  assert.equal(standing.tier.name, "Sharp");
  assert.equal(standing.ranked, false);
  assert.equal(standing.placementsRemaining, 7);
  assert.equal(standing.placementProgress, 72);
});

test("shows progress to the next competitive tier", () => {
  const standing = competitiveStanding(1750, 30);
  assert.equal(standing.tier.name, "Sharp");
  assert.equal(standing.nextTier.name, "Expert");
  assert.equal(standing.pointsToNext, 100);
  assert.equal(standing.tierProgress, 50);
});

test("detects a real rank promotion after placement", () => {
  const promotion = promotionForImpact(1643, 1657, 28);
  assert.equal(promotion?.from.name, "Strategist");
  assert.equal(promotion?.to.name, "Sharp");
  assert.equal(promotionForImpact(1643, 1657, 12), null);
});

test("finds analysts closest to the current rating", () => {
  const rivals = nearbyRivals([
    { public_alias: "A", rating: 1701 },
    { public_alias: "B", rating: 1810 },
    { public_alias: "C", rating: 1698, is_current_user: true },
    { public_alias: "D", rating: 1689 },
  ], 1698, 2);
  assert.deepEqual(rivals.map((rival) => rival.public_alias), ["A", "D"]);
});
