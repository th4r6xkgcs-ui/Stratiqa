import test from "node:test";
import assert from "node:assert/strict";
import { buildPlaystyleArchetype } from "../src/lib/profile/archetype.ts";

test("creates a prop archetype from a prop-focused profile", () => {
  const result = buildPlaystyleArchetype({ goal: "Research player props", risk: "aggressive", leagueCount: 4, sportsbookCount: 1 });
  assert.equal(result.name, "The Prop Savant");
  assert.equal(Object.values(result.dimensions).reduce((sum, value) => sum + value, 0), 100);
});

test("changes archetype as playstyle preferences change", () => {
  const selective = buildPlaystyleArchetype({ goal: "Understand predictions", risk: "conservative", leagueCount: 1, sportsbookCount: 0 });
  const market = buildPlaystyleArchetype({ goal: "Compare sportsbook lines", risk: "balanced", leagueCount: 1, sportsbookCount: 5 });
  assert.equal(selective.name, "The Edge Forger");
  assert.equal(market.name, "The Line Phantom");
});

test("combines style and trust signals into a special hybrid identity", () => {
  const result = buildPlaystyleArchetype({
    goal: "Find the best value",
    risk: "aggressive",
    style: "Contrarian",
    traits: ["Market movement", "Contrarian signals"],
    leagueCount: 3,
    sportsbookCount: 4,
  });
  assert.equal(result.name, "The Contrarian Cipher");
  assert.ok(result.dimensions.Market > 20);
});

test("every profile produces calibrated category ratings", () => {
  const result = buildPlaystyleArchetype({ goal: "Research player props", risk: "balanced", style: "Data-first", traits: ["Player trends"], leagueCount: 3, sportsbookCount: 2 });
  assert.equal(Object.keys(result.categoryRatings).length, 6);
  assert.ok(result.categoryRatings["Prop IQ"] > result.categoryRatings["Market Timing"]);
  assert.ok(Object.values(result.categoryRatings).every((rating) => rating >= 25 && rating <= 99));
});
