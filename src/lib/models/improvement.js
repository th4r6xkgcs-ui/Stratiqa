const factorLabels = {
  market_value: "price",
  recent_form: "recent form",
  injuries: "availability",
  weather: "conditions",
  matchup: "matchup",
  line_movement: "market movement",
  player_usage: "player usage",
  bullpen: "bullpen",
};

export function diagnoseModel(model, history = []) {
  const matched = history.filter((item) => item.model_id === model.id && item.decision === "recommend" && ["win", "loss"].includes(item.result));
  const wins = matched.filter((item) => item.result === "win");
  const actual = matched.length ? Math.round(wins.length / matched.length * 100) : null;
  const averageScore = matched.length ? Math.round(matched.reduce((sum, item) => sum + Number(item.model_score), 0) / matched.length) : null;
  const calibrationGap = actual === null || averageScore === null ? null : averageScore - actual;
  const factorStats = (model.factors ?? []).map((factor) => {
    const rows = matched.map((item) => {
      const signal = (item.signals ?? []).find((entry) => entry.factor === factor);
      return { result: item.result, signal: Number(signal?.signal ?? 50) };
    });
    const winRows = rows.filter((item) => item.result === "win");
    const lossRows = rows.filter((item) => item.result === "loss");
    const winSignal = winRows.length ? winRows.reduce((sum, item) => sum + item.signal, 0) / winRows.length : null;
    const lossSignal = lossRows.length ? lossRows.reduce((sum, item) => sum + item.signal, 0) / lossRows.length : null;
    const separation = winSignal === null || lossSignal === null ? 0 : Math.round(winSignal - lossSignal);
    return { factor, label: factorLabels[factor] ?? factor.replaceAll("_", " "), separation, currentWeight: Number(model.weights?.[factor] ?? 20) };
  }).sort((a, b) => b.separation - a.separation);
  const proposedWeights = { ...(model.weights ?? {}) };
  const suggestions = [];
  if (matched.length < 5) {
    suggestions.push({ factor: null, direction: "hold", delta: 0, explanation: `${5 - matched.length} more matched verified outcome${5 - matched.length === 1 ? "" : "s"} needed before STRATIQA suggests a weight change.` });
  } else {
    const strongest = factorStats[0];
    const weakest = factorStats.at(-1);
    if (strongest?.separation >= 8) {
      const delta = Math.min(10, 60 - strongest.currentWeight);
      proposedWeights[strongest.factor] = strongest.currentWeight + delta;
      suggestions.push({ factor: strongest.factor, direction: "increase", delta, explanation: `${strongest.label} separated wins from losses by ${strongest.separation} signal points.` });
    }
    if (weakest?.separation <= -8) {
      const delta = Math.min(10, weakest.currentWeight - 5);
      proposedWeights[weakest.factor] = weakest.currentWeight - delta;
      suggestions.push({ factor: weakest.factor, direction: "decrease", delta, explanation: `${weakest.label} scored ${Math.abs(weakest.separation)} points stronger in losses than wins.` });
    }
    if (!suggestions.length) suggestions.push({ factor: null, direction: "hold", delta: 0, explanation: "No signal has separated wins from losses enough to justify a change." });
  }
  return {
    modelId: model.id, modelName: model.name, sport: model.sport, category: model.category, status: model.status,
    version: model.version, matched: matched.length, wins: wins.length, actual, averageScore, calibrationGap,
    calibrationLabel: calibrationGap === null ? "Learning" : calibrationGap >= 8 ? "Overconfident" : calibrationGap <= -8 ? "Underconfident" : "Well calibrated",
    factors: factorStats, suggestions, proposedWeights,
  };
}

export function buildImprovementStudio(models = [], history = []) {
  const diagnostics = models.map((model) => diagnoseModel(model, history));
  const matchups = diagnostics.filter((item) => item.status === "live").map((champion) => ({
    champion,
    challengers: diagnostics.filter((item) => item.status === "testing" && item.sport === champion.sport && item.category === champion.category),
  }));
  return { diagnostics, matchups };
}
