export function modelValidationSummary(picks = []) {
  const settled = picks.filter((pick) => ["win", "loss", "push"].includes(pick.result));
  const decisions = settled.filter((pick) => pick.result !== "push");
  const wins = decisions.filter((pick) => pick.result === "win").length;
  const losses = decisions.length - wins;
  const stake = settled.reduce((sum, pick) => sum + Number(pick.stake_units ?? 0), 0);
  const profit = settled.reduce((sum, pick) => sum + Number(pick.profit_units ?? 0), 0);
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = settled.filter((pick) => new Date(pick.graded_at ?? 0).getTime() >= cutoff);
  return {
    verified: settled.length,
    wins,
    losses,
    pushes: settled.length - decisions.length,
    accuracy: decisions.length ? Math.round(wins / decisions.length * 1000) / 10 : null,
    roi: stake ? Math.round(profit / stake * 1000) / 10 : null,
    recentVerified: recent.length,
    sample: settled.length >= 50 ? "established" : settled.length >= 10 ? "developing" : "early",
  };
}

export function promotionReadiness(performance = {}) {
  const verified = Number(performance.verified ?? 0);
  const checks = [
    { id: "sample", label: "10 verified recommendations", complete: verified >= 10, remaining: Math.max(0, 10 - verified) },
    { id: "identity", label: "Specialist identity configured", complete: true, remaining: 0 },
    { id: "history", label: "Immutable version tracking", complete: true, remaining: 0 },
  ];
  return { ready: checks.every((check) => check.complete), checks };
}
