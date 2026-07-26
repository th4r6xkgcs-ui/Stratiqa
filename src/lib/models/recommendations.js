const factorCopy = {
  market_value: "the current price still offers modeled value",
  recent_form: "recent performance supports the projection",
  injuries: "availability context is reflected in the matchup",
  weather: "playing conditions are inside the model's range",
  matchup: "the underlying matchup creates an advantage",
  line_movement: "market movement has not erased the edge",
  player_usage: "the player's opportunity supports this line",
  bullpen: "late-game pitching depth supports the position",
};

export function recommendationScore(model, market) {
  const confidence = Number(market.confidence) || 0;
  const expectedValue = Number(market.expectedValue) || 0;
  const factors = model.factors ?? [];
  const weights = model.weights ?? {};
  const signalStrength = factors.reduce((sum, factor) => sum + (Number(weights[factor]) || 20), 0) / Math.max(1, factors.length);
  const riskAdjustment = model.risk_profile === "selective" ? (confidence >= 76 ? 5 : -8) : model.risk_profile === "opportunistic" ? expectedValue * .25 : 0;
  return Math.max(0, Math.min(99, Math.round(confidence * .62 + expectedValue * 1.15 + signalStrength * .28 + riskAdjustment)));
}

export function recommendationReasons(model, limit = 3) {
  const ordered = [model.strategy, ...(model.factors ?? [])].filter((factor, index, all) => factor && all.indexOf(factor) === index);
  return ordered.slice(0, limit).map((factor) => factorCopy[factor] ?? `${String(factor).replaceAll("_", " ")} supports the position`);
}
