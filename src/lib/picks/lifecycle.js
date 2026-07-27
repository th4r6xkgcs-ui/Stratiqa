export function pickLifecycle(pick, score, now = Date.now()) {
  if (pick.result && pick.result !== "pending") return "settled";
  if (score?.completed) return "awaiting";
  const startsAt = pick.eventCommenceAt ? new Date(pick.eventCommenceAt).getTime() : Number.NaN;
  if (score && (score.homeScore !== null || score.awayScore !== null)) return "live";
  if (Number.isFinite(startsAt) && startsAt <= now) return "live";
  return "upcoming";
}

export function lifecycleLabel(state) {
  return {
    upcoming: "Upcoming",
    live: "Live now",
    awaiting: "Awaiting official result",
    settled: "Settled",
  }[state] ?? "Status unavailable";
}
