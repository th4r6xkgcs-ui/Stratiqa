const outcomes = new Set(["pending", "won", "lost", "push"]);

export function validateStrategyPortfolio(value) {
  if (!value || typeof value !== "object") return { ok: false, error: "A portfolio is required." };
  if (!Array.isArray(value.builds) || value.builds.length < 1 || value.builds.length > 20) return { ok: false, error: "A portfolio requires 1 to 20 builds." };
  if (typeof value.activeBuildId !== "string" || !value.builds.some((build) => build?.id === value.activeBuildId)) return { ok: false, error: "The active build is invalid." };
  if (!Array.isArray(value.trackedPicks) || value.trackedPicks.length > 500) return { ok: false, error: "Tracked picks are invalid." };

  const validBuilds = value.builds.every((build) =>
    build && typeof build.id === "string" && typeof build.name === "string"
    && build.name.trim().length > 0 && build.name.length <= 32
    && Number.isFinite(build.minimumConfidence) && build.minimumConfidence >= 55 && build.minimumConfidence <= 95
    && build.weights && ["confidence", "value", "market"].every((key) => Number.isFinite(build.weights[key]) && build.weights[key] >= 0 && build.weights[key] <= 100),
  );
  const validPicks = value.trackedPicks.every((pick) =>
    pick && typeof pick.id === "string" && typeof pick.selection === "string"
    && typeof pick.buildId === "string" && outcomes.has(pick.outcome)
    && Number.isFinite(pick.price) && pick.price !== 0
    && Number.isFinite(pick.units) && pick.units >= .25 && pick.units <= 10,
  );
  return validBuilds && validPicks ? { ok: true, value } : { ok: false, error: "Build or pick values are invalid." };
}
