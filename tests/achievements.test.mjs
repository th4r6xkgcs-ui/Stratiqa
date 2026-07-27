import test from "node:test";
import assert from "node:assert/strict";
import { currentCompetitiveSeason, seasonalCategoryForm, verifiedAchievements } from "../src/lib/ratings/achievements.js";

test("creates stable calendar-quarter seasons", () => {
  const season = currentCompetitiveSeason(new Date("2026-07-27T12:00:00Z"));
  assert.equal(season.key, "2026-Q3");
  assert.equal(season.startsAt, "2026-07-01T00:00:00.000Z");
});

test("only counts official results graded during the current season", () => {
  const season = seasonalCategoryForm([{ category: "spread", result: "win", gradedAt: "2026-07-10T00:00:00Z" }, { category: "spread", result: "loss", gradedAt: "2026-06-30T00:00:00Z" }], new Date("2026-07-27T12:00:00Z"));
  assert.equal(season.categories[0].settled, 1);
});

test("awards rating and multi-category distinctions from verified data", () => {
  const categories = ["spread", "total", "player_prop"].map((category) => ({ category, rating: category === "spread" ? 1700 : 1550, gradedPicks: 25, form: { streak: 1, streakResult: "win" } }));
  const earned = verifiedAchievements({ categories, settledPicks: 100 }).filter((item) => item.earned).map((item) => item.id);
  assert.ok(earned.includes("multi-discipline"));
  assert.ok(earned.includes("category-sharp"));
  assert.ok(earned.includes("century"));
});
