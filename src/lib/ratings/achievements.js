export function currentCompetitiveSeason(now = new Date()) {
  const quarter = Math.floor(now.getUTCMonth() / 3);
  const startsAt = new Date(Date.UTC(now.getUTCFullYear(), quarter * 3, 1));
  const endsAt = new Date(Date.UTC(quarter === 3 ? now.getUTCFullYear() + 1 : now.getUTCFullYear(), quarter === 3 ? 0 : (quarter + 1) * 3, 1));
  return { key: `${now.getUTCFullYear()}-Q${quarter + 1}`, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), daysRemaining: Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000)) };
}

export function seasonalCategoryForm(picks, now = new Date()) {
  const season = currentCompetitiveSeason(now);
  const settled = picks.filter((pick) => ["win", "loss", "push"].includes(pick.result) && Date.parse(pick.gradedAt ?? "") >= Date.parse(season.startsAt));
  const grouped = new Map();
  for (const pick of settled) {
    const current = grouped.get(pick.category) ?? { category: pick.category, settled: 0, wins: 0, losses: 0, pushes: 0 };
    current.settled += 1;
    if (pick.result === "win") current.wins += 1;
    if (pick.result === "loss") current.losses += 1;
    if (pick.result === "push") current.pushes += 1;
    grouped.set(pick.category, current);
  }
  return { ...season, categories: [...grouped.values()].sort((a, b) => b.settled - a.settled) };
}

/** @param {{ categories?: any[], settledPicks?: number }} input */
export function verifiedAchievements({ categories = [], settledPicks = 0 }) {
  const ranked = categories.filter((item) => item.gradedPicks >= 25);
  const bestRating = Math.max(0, ...categories.map((item) => Number(item.rating)));
  const bestStreak = Math.max(0, ...categories.map((item) => item.form?.streak ?? 0));
  const bestGlobal = Math.min(Number.POSITIVE_INFINITY, ...categories.map((item) => item.globalRank ?? Number.POSITIVE_INFINITY));
  const bestRegional = Math.min(Number.POSITIVE_INFINITY, ...categories.map((item) => item.regionRank ?? Number.POSITIVE_INFINITY));
  return [
    { id: "verified-competitor", name: "Verified Competitor", detail: "25 official results", earned: settledPicks >= 25, progress: Math.min(100, settledPicks / 25 * 100) },
    { id: "category-specialist", name: "Category Specialist", detail: "Ranked in one category", earned: ranked.length >= 1, progress: Math.min(100, ranked.length * 100) },
    { id: "multi-discipline", name: "Multi-Discipline Analyst", detail: "Ranked in three categories", earned: ranked.length >= 3, progress: Math.min(100, ranked.length / 3 * 100) },
    { id: "century", name: "Century Club", detail: "100 official results", earned: settledPicks >= 100, progress: Math.min(100, settledPicks) },
    { id: "category-sharp", name: "Category Sharp", detail: "1650 verified rating", earned: bestRating >= 1650, progress: Math.min(100, bestRating / 1650 * 100) },
    { id: "elite-analyst", name: "Elite Analyst", detail: "2000 verified rating", earned: bestRating >= 2000, progress: Math.min(100, bestRating / 2000 * 100) },
    { id: "hot-hand", name: "Verified Hot Hand", detail: "Five-result winning streak", earned: bestStreak >= 5 && categories.some((item) => item.form?.streakResult === "win"), progress: Math.min(100, bestStreak / 5 * 100) },
    { id: "global-top10", name: "Global Top 10", detail: "Top 10 in a category", earned: bestGlobal <= 10, progress: bestGlobal === Number.POSITIVE_INFINITY ? 0 : Math.min(100, 10 / bestGlobal * 100) },
    { id: "regional-top10", name: "Regional Top 10", detail: "Top 10 in a saved state", earned: bestRegional <= 10, progress: bestRegional === Number.POSITIVE_INFINITY ? 0 : Math.min(100, 10 / bestRegional * 100) },
  ];
}
