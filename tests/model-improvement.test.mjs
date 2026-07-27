import test from "node:test";
import assert from "node:assert/strict";
import { buildImprovementStudio, diagnoseModel } from "../src/lib/models/improvement.js";

const model = { id: "m1", name: "Value Lab", sport: "MLB", category: "moneyline", status: "live", version: 2, factors: ["market_value", "matchup"], weights: { market_value: 30, matchup: 30 } };
const row = (result, value, matchup) => ({ model_id: "m1", decision: "recommend", result, model_score: 75, signals: [{ factor: "market_value", signal: value }, { factor: "matchup", signal: matchup }] });

test("refuses weight coaching before five verified matches", () => {
  const result = diagnoseModel(model, [row("win", 80, 60)]);
  assert.equal(result.suggestions[0].direction, "hold");
  assert.match(result.suggestions[0].explanation, /4 more/);
});

test("suggests increasing a signal that separates wins from losses", () => {
  const history = [row("win", 85, 60), row("win", 80, 62), row("win", 82, 61), row("loss", 40, 60), row("loss", 45, 62)];
  const result = diagnoseModel(model, history);
  assert.equal(result.suggestions.some((item) => item.factor === "market_value" && item.direction === "increase"), true);
  assert.ok(result.proposedWeights.market_value > model.weights.market_value);
});

test("pairs testing challengers only with matching live champions", () => {
  const challenger = { ...model, id: "m2", name: "Experiment", status: "testing" };
  const studio = buildImprovementStudio([model, challenger], []);
  assert.equal(studio.matchups[0].challengers[0].modelId, "m2");
});
