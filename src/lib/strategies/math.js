export function americanProfit(price, units) {
  return price > 0 ? units * (price / 100) : units * (100 / Math.abs(price));
}

export function portfolioMetrics(picks, buildId) {
  const scoped = buildId ? picks.filter((pick) => pick.buildId === buildId) : picks;
  const settled = scoped.filter((pick) => pick.outcome !== "pending");
  const wins = settled.filter((pick) => pick.outcome === "won");
  const losses = settled.filter((pick) => pick.outcome === "lost");
  const risked = settled.reduce((sum, pick) => sum + (pick.outcome === "push" ? 0 : pick.units), 0);
  const profit = settled.reduce((sum, pick) => {
    if (pick.outcome === "won") return sum + americanProfit(pick.price, pick.units);
    if (pick.outcome === "lost") return sum - pick.units;
    return sum;
  }, 0);
  return {
    tracked: scoped.length,
    settled: settled.length,
    winRate: wins.length + losses.length ? (wins.length / (wins.length + losses.length)) * 100 : 0,
    profit,
    roi: risked ? (profit / risked) * 100 : 0,
  };
}
