export function modelAchievements(models, arenaLeaders = []) {
  const ranked = models.filter((model) => model.performance.verified >= 10);
  const bestRating = Math.max(0, ...models.map((model) => model.performance.rating));
  const totalVerified = models.reduce((sum, model) => sum + model.performance.verified, 0);
  const rankedSports = new Set(ranked.map((model) => model.sport));
  const topTen = arenaLeaders.some((leader) => leader.is_current_user && Number(leader.rank) <= 10);
  return [
    { id: "model-builder", name: "Model Builder", detail: "Create a specialist", earned: models.length >= 1 },
    { id: "promoted-system", name: "Promoted System", detail: "Move a model to the live roster", earned: models.some((model) => model.status === "live") },
    { id: "ranked-model", name: "Ranked Model", detail: "10 verified recommendations", earned: ranked.length >= 1 },
    { id: "model-century", name: "Model Century", detail: "100 verified recommendations", earned: totalVerified >= 100 },
    { id: "sharp-system", name: "Sharp System", detail: "1800 model rating", earned: bestRating >= 1800 },
    { id: "multi-sport-lab", name: "Multi-Sport Lab", detail: "Ranked models in three sports", earned: rankedSports.size >= 3 },
    { id: "arena-top10", name: "Arena Top 10", detail: "Top 10 in a model division", earned: topTen },
  ];
}

export function modelNextMilestone(model) {
  if (!model) return { title: "Build your first specialist", remaining: 1 };
  if (model.performance.verified < 10) return { title: "Reach public model ranking", remaining: 10 - model.performance.verified };
  if (model.performance.rating < 1800) return { title: "Reach Sharp System rating", remaining: 1800 - model.performance.rating };
  if (model.performance.verified < 100) return { title: "Reach Model Century", remaining: 100 - model.performance.verified };
  return { title: "Defend your strongest model", remaining: 0 };
}
