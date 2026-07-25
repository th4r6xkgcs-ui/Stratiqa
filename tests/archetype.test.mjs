import test from "node:test";
import assert from "node:assert/strict";
import { buildPlaystyleArchetype } from "../src/lib/profile/archetype.ts";

test("creates a prop archetype from a prop-focused profile", () => {
  const result = buildPlaystyleArchetype({ goal: "Research player props", risk: "aggressive", leagueCount: 4, sportsbookCount: 1 });
  assert.equal(result.name, "The Prop Alchemist");
  assert.equal(Object.values(result.dimensions).reduce((sum, value) => sum + value, 0), 100);
});

test("changes archetype as playstyle preferences change", () => {
  const selective = buildPlaystyleArchetype({ goal: "Understand predictions", risk: "conservative", leagueCount: 1, sportsbookCount: 0 });
  const market = buildPlaystyleArchetype({ goal: "Compare sportsbook lines", risk: "balanced", leagueCount: 1, sportsbookCount: 5 });
  assert.equal(selective.name, "The Signal Sentinel");
  assert.equal(market.name, "The Line Hawk");
});
