export function recommendationIdentity(item) {
  return [
    item.provider_event_id ?? item.providerEventId ?? item.event_name ?? item.eventName,
    item.market_key ?? item.marketKey ?? item.category,
    item.outcome_name ?? item.outcomeName ?? item.selection,
    item.line_point ?? item.linePoint ?? "",
  ].map((value) => String(value ?? "").trim().toLowerCase()).join("|");
}

export function linkRecommendationOutcomes(snapshots = [], picks = []) {
  const pickMap = new Map();
  for (const pick of picks) {
    if (!["win", "loss", "push"].includes(pick.result)) continue;
    pickMap.set(`${pick.model_id}|${recommendationIdentity(pick)}`, pick);
  }
  return snapshots.map((snapshot) => {
    const pick = pickMap.get(`${snapshot.model_id}|${recommendationIdentity(snapshot)}`);
    return { ...snapshot, result: pick?.result ?? null, gradedAt: pick?.graded_at ?? null };
  });
}

export function calibrationSummary(items = []) {
  const resolved = items.filter((item) => item.decision === "recommend" && ["win", "loss"].includes(item.result));
  const buckets = [
    { label: "50–64", min: 50, max: 64 },
    { label: "65–74", min: 65, max: 74 },
    { label: "75–84", min: 75, max: 84 },
    { label: "85–100", min: 85, max: 100 },
  ].map((bucket) => {
    const sample = resolved.filter((item) => Number(item.model_score) >= bucket.min && Number(item.model_score) <= bucket.max);
    const wins = sample.filter((item) => item.result === "win").length;
    return { ...bucket, sample: sample.length, wins, actual: sample.length ? Math.round(wins / sample.length * 100) : null };
  });
  return {
    resolved: resolved.length,
    unresolved: items.filter((item) => item.decision === "recommend" && !item.result).length,
    passes: items.filter((item) => item.decision === "pass").length,
    buckets,
  };
}
