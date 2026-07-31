export function modelLeagueStage(metrics) {
  if (metrics.resolved < 5) return { key: "provisional", label: "Provisional", detail: `${5 - metrics.resolved} more matched outcomes to qualify` };
  if (metrics.resolved < 10) return { key: "qualified", label: "Qualified", detail: `${10 - metrics.resolved} more matched outcomes for promotion review` };
  if (metrics.winRate >= 52 && Math.abs(metrics.calibrationGap ?? 99) <= 15) return { key: "promotion_ready", label: "Promotion Ready", detail: "Sample, results, and calibration cleared review" };
  return { key: "developing", label: "Developing", detail: "Qualified sample; performance standards still developing" };
}

export function scoreLeagueModel(model, history = [], rating = null) {
  const rows = history.filter((item) => item.model_id === model.id);
  const decisions = rows.filter((item) => item.decision === "recommend");
  const resolved = decisions.filter((item) => ["win", "loss"].includes(item.result));
  const wins = resolved.filter((item) => item.result === "win").length;
  const winRate = resolved.length ? Math.round(wins / resolved.length * 1000) / 10 : 0;
  const averageScore = resolved.length ? resolved.reduce((sum, item) => sum + Number(item.model_score), 0) / resolved.length : null;
  const calibrationGap = averageScore === null ? null : Math.round((averageScore - winRate) * 10) / 10;
  const passes = rows.filter((item) => item.decision === "pass").length;
  const baseRating = Math.round(Number(rating?.rating ?? 1500));
  const evidenceAdjustment = resolved.length ? Math.round((winRate - 50) * 4 - Math.min(20, Math.abs(calibrationGap ?? 0))) : 0;
  const metrics = { resolved: resolved.length, wins, losses: resolved.length - wins, winRate, averageScore, calibrationGap, passes };
  return {
    modelId: model.id, modelName: model.name, sport: model.sport, category: model.category,
    status: model.status, version: model.version, rating: baseRating, leagueScore: baseRating + evidenceAdjustment,
    ...metrics, stage: modelLeagueStage(metrics),
  };
}

export function buildModelLeague(models = [], history = [], ratings = []) {
  const entries = models.map((model) => scoreLeagueModel(model, history, ratings.find((item) => item.model_id === model.id)))
    .sort((a, b) => b.leagueScore - a.leagueScore || b.resolved - a.resolved)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  const divisions = [...new Set(entries.map((item) => `${item.sport}|${item.category}`))].map((key) => {
    const [sport, category] = key.split("|");
    const table = entries.filter((item) => item.sport === sport && item.category === category)
      .sort((a, b) => b.leagueScore - a.leagueScore || b.resolved - a.resolved)
      .map((item, index) => ({ ...item, divisionRank: index + 1 }));
    return { key, sport, category, table };
  });
  const matchups = divisions.flatMap((division) => {
    const champion = division.table.find((item) => item.status === "live");
    if (!champion) return [];
    return division.table.filter((item) => item.status === "testing").map((challenger) => ({
      id: `${champion.modelId}:${challenger.modelId}`, sport: division.sport, category: division.category,
      champion, challenger,
      leader: champion.leagueScore >= challenger.leagueScore ? champion.modelName : challenger.modelName,
      gap: Math.abs(champion.leagueScore - challenger.leagueScore),
      reviewReady: challenger.stage.key === "promotion_ready",
    }));
  });
  return { entries, divisions, matchups };
}
