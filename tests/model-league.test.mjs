import test from "node:test";
import assert from "node:assert/strict";
import { buildModelLeague, modelLeagueStage, scoreLeagueModel } from "../src/lib/models/league.js";

const model = { id: "m1", name: "Champion", sport: "MLB", category: "moneyline", status: "live", version: 1 };
const rows = (count, wins = count) => Array.from({ length: count }, (_, index) => ({ model_id: "m1", decision: "recommend", result: index < wins ? "win" : "loss", model_score: 60 }));

test("keeps small model samples provisional", () => {
  assert.equal(modelLeagueStage({ resolved: 4, winRate: 100, calibrationGap: 0 }).key, "provisional");
});

test("requires sample, results, and calibration for promotion review", () => {
  assert.equal(modelLeagueStage({ resolved: 10, winRate: 60, calibrationGap: 0 }).key, "promotion_ready");
  assert.equal(modelLeagueStage({ resolved: 10, winRate: 40, calibrationGap: 0 }).key, "developing");
});

test("scores league models from matched outcomes without changing stored rating", () => {
  const scored = scoreLeagueModel(model, rows(10, 6), { rating: 1600 });
  assert.equal(scored.rating, 1600);
  assert.ok(scored.leagueScore > 1600);
});

test("pairs testing models only against matching live champions", () => {
  const challenger = { ...model, id: "m2", name: "Challenger", status: "testing" };
  const league = buildModelLeague([model, challenger], [], []);
  assert.equal(league.matchups.length, 1);
});
