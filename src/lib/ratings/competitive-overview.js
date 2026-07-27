export function categoryForm(picks, category) {
  const settled = picks
    .filter((pick) => pick.category === category && ["win", "loss", "push"].includes(pick.result))
    .sort((a, b) => Date.parse(b.gradedAt ?? b.placedAt ?? 0) - Date.parse(a.gradedAt ?? a.placedAt ?? 0));
  const recent = settled.slice(0, 10);
  let streak = 0;
  let streakResult = null;
  for (const pick of settled) {
    if (pick.result === "push") continue;
    if (!streakResult) streakResult = pick.result;
    if (pick.result !== streakResult) break;
    streak += 1;
  }
  const decisions = recent.filter((pick) => pick.result !== "push");
  const wins = decisions.filter((pick) => pick.result === "win").length;
  return {
    streak,
    streakResult,
    recent: recent.map((pick) => pick.result),
    recentWinRate: decisions.length ? Math.round(wins / decisions.length * 100) : null,
  };
}

export function nextCompetitiveGoal(categories) {
  if (!categories.length) return { kind: "start", category: null, value: 25 };
  const placement = categories.filter((item) => item.gradedPicks < 25).sort((a, b) => b.gradedPicks - a.gradedPicks)[0];
  if (placement) return { kind: "placement", category: placement.category, value: 25 - placement.gradedPicks };
  const topTen = categories.filter((item) => item.globalRank && item.globalRank > 10).sort((a, b) => a.globalRank - b.globalRank)[0];
  if (topTen) return { kind: "top10", category: topTen.category, value: topTen.globalRank - 10 };
  return { kind: "defend", category: [...categories].sort((a, b) => b.rating - a.rating)[0].category, value: 0 };
}
