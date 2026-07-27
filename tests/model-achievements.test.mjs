import test from "node:test";
import assert from "node:assert/strict";
import { modelAchievements, modelNextMilestone } from "../src/lib/models/achievements.js";

const model = (sport, verified, rating, status = "live") => ({ sport, status, performance: { verified, rating } });

test("awards only model milestones backed by verified samples", () => {
  const earned = modelAchievements([model("MLB", 10, 1810)], [{ is_current_user: true, rank: 8 }]).filter((item) => item.earned).map((item) => item.id);
  assert.ok(earned.includes("ranked-model"));
  assert.ok(earned.includes("sharp-system"));
  assert.ok(earned.includes("arena-top10"));
  assert.equal(earned.includes("model-century"), false);
});

test("prioritizes ranking before rating milestones", () => {
  assert.deepEqual(modelNextMilestone(model("NBA", 6, 1750)), { title: "Reach public model ranking", remaining: 4 });
});
