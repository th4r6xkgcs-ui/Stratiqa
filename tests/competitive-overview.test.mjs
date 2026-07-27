import test from "node:test";
import assert from "node:assert/strict";
import { categoryForm, nextCompetitiveGoal } from "../src/lib/ratings/competitive-overview.js";

test("calculates verified category form and ignores pushes in streak direction", () => {
  const form = categoryForm([{ category: "spread", result: "win" }, { category: "spread", result: "push" }, { category: "spread", result: "win" }, { category: "spread", result: "loss" }], "spread");
  assert.equal(form.streak, 2);
  assert.equal(form.streakResult, "win");
});

test("prioritizes the closest unfinished category placement", () => {
  const goal = nextCompetitiveGoal([{ category: "props", rating: 1500, gradedPicks: 4 }, { category: "spread", rating: 1550, gradedPicks: 22 }]);
  assert.deepEqual(goal, { kind: "placement", category: "spread", value: 3 });
});

test("chases the nearest top ten after all placements", () => {
  const goal = nextCompetitiveGoal([{ category: "spread", rating: 1700, gradedPicks: 30, globalRank: 14 }]);
  assert.equal(goal.kind, "top10");
  assert.equal(goal.value, 4);
});
