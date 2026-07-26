export function recommendedUnits(confidence, correlated = false) {
  const base = confidence >= 82 ? 1.25 : confidence >= 72 ? 1 : confidence >= 62 ? 0.75 : 0.5;
  return correlated ? Math.min(base, 0.75) : base;
}
