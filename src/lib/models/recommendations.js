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
  return evaluateRecommendation(model, market).score;
}

function clamp(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

export function marketSignals(market) {
  const trend = Array.isArray(market.trend) ? market.trend : [];
  const trendPositive = trend.length > 1 ? trend.slice(-3).reduce((sum, value) => sum + Number(value || 0), 0) >= trend.slice(0, 3).reduce((sum, value) => sum + Number(value || 0), 0) : true;
  const sharpEdge = Number(market.market?.moneyPercent ?? 50) - Number(market.market?.ticketPercent ?? 50);
  return {
    market_value: clamp(50 + Number(market.expectedValue || 0) * 3),
    recent_form: clamp(market.hitRate ?? (trendPositive ? 68 : 42)),
    injuries: clamp(70 - Math.abs(Number(market.injuryImpact || 0)) * 4),
    weather: clamp(75 - Math.abs(Number(market.weatherImpact || 0)) * 6),
    matchup: clamp(50 + Number(market.modelEdge ?? market.expectedValue ?? 0) * 3),
    line_movement: clamp(55 + sharpEdge * 2),
    player_usage: clamp(market.hitRate ?? market.confidence ?? 50),
    bullpen: clamp(50 + Number(market.bullpenEdge || 0) * 2),
  };
}

export function evaluateRecommendation(model, market) {
  const confidence = clamp(market.confidence);
  const expectedValue = Number(market.expectedValue) || 0;
  const factors = model.factors ?? [];
  const weights = model.weights ?? {};
  const signals = marketSignals(market);
  const totalWeight = factors.reduce((sum, factor) => sum + Math.max(1, Number(weights[factor]) || 20), 0) || 1;
  const contributions = factors.map((factor) => {
    const weight = Math.max(1, Number(weights[factor]) || 20);
    return { factor, weight, signal: signals[factor] ?? 50, contribution: (signals[factor] ?? 50) * weight / totalWeight };
  }).sort((a, b) => b.contribution - a.contribution);
  const weightedSignals = contributions.reduce((sum, item) => sum + item.contribution, 0);
  const riskAdjustment = model.risk_profile === "selective" ? (confidence >= 76 ? 3 : -7) : model.risk_profile === "opportunistic" ? Math.max(0, expectedValue) * .2 : 0;
  const score = Math.max(0, Math.min(99, Math.round(confidence * .42 + weightedSignals * .45 + expectedValue * .8 + riskAdjustment)));
  const threshold = model.risk_profile === "selective" ? 74 : model.risk_profile === "opportunistic" ? 58 : 65;
  const decision = score >= threshold && expectedValue > 0 ? "recommend" : "pass";
  return { score, threshold, decision, contributions, signalAgreement: contributions.length ? Math.round(contributions.filter((item) => item.signal >= 55).length / contributions.length * 100) : 0 };
}

export function recommendationReasons(model, market, limit = 3) {
  const evaluation = evaluateRecommendation(model, market ?? {});
  return evaluation.contributions.slice(0, limit).map((item) => `${factorCopy[item.factor] ?? String(item.factor).replaceAll("_", " ")} (${Math.round(item.signal)}/100 signal)`);
}

export function recommendationDesk(items = []) {
  const recommendations = items.filter((item) => item.decision === "recommend");
  const groups = new Map();
  for (const item of recommendations) {
    const key = `${item.eventName}|${item.selection}`.toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const consensus = [...groups.values()].filter((group) => group.length > 1).sort((a, b) => b.length - a.length || b[0].confidence - a[0].confidence);
  const disagreements = [...groups.values()].filter((group) => group.length === 1 && recommendations.some((item) => item.eventName === group[0].eventName && item.selection !== group[0].selection));
  return {
    bestEdge: [...recommendations].sort((a, b) => b.expectedValue - a.expectedValue)[0] ?? null,
    safest: [...recommendations].sort((a, b) => b.confidence - a.confidence)[0] ?? null,
    consensus: consensus[0] ?? [],
    disagreements: disagreements.slice(0, 2).map((group) => group[0]),
    passes: items.filter((item) => item.decision === "pass").length,
  };
}
