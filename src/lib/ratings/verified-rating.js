const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export function calculateVerifiedRating(previous, pick) {
  if (pick.source !== "provider" || !["win", "loss", "push"].includes(pick.result)) return previous;
  const samples = previous.gradedPicks ?? 0;
  const expected = pick.americanOdds > 0
    ? 100 / (pick.americanOdds + 100)
    : Math.abs(pick.americanOdds) / (Math.abs(pick.americanOdds) + 100);
  const actual = pick.result === "win" ? 1 : pick.result === "push" ? expected : 0;
  const sampleWeight = Math.max(10, 34 - Math.min(samples, 24));
  const difficulty = clamp(0.75 + Math.abs(0.5 - expected), 0.75, 1.25);
  const confidence = clamp(Number(pick.confidence ?? 50) / 100, 0.01, 1);
  const calibration = 1 - Math.abs(confidence - actual);
  const clv = Number.isFinite(pick.closingLineValue) ? pick.closingLineValue : 0;
  const delta = pick.result === "push" ? 0 : sampleWeight * difficulty * (actual - expected) + clamp(clv, -10, 10) * 0.35;

  return {
    rating: Math.round(clamp((previous.rating ?? 1500) + delta, 800, 2400) * 100) / 100,
    gradedPicks: samples + 1,
    wins: (previous.wins ?? 0) + (pick.result === "win" ? 1 : 0),
    losses: (previous.losses ?? 0) + (pick.result === "loss" ? 1 : 0),
    pushes: (previous.pushes ?? 0) + (pick.result === "push" ? 1 : 0),
    confidenceCalibration: Math.round(((previous.confidenceCalibration ?? 0) * samples + calibration * 100) / (samples + 1) * 1000) / 1000,
    provisional: samples + 1 < 25,
  };
}
