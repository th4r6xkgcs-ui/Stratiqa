export const COMPETITIVE_RANKS = [
  { name: "Rookie", floor: 0, color: "#7d8b96" },
  { name: "Scout", floor: 1200, color: "#54b7e8" },
  { name: "Strategist", floor: 1450, color: "#a66cff" },
  { name: "Sharp", floor: 1650, color: "#2ecc55" },
  { name: "Expert", floor: 1850, color: "#ffb84d" },
  { name: "Elite", floor: 2000, color: "#ff6e76" },
  { name: "Grandmaster", floor: 2250, color: "#ffd75f" },
];

export function competitiveStanding(rating = 1500, gradedPicks = 0) {
  const value = Number.isFinite(Number(rating)) ? Number(rating) : 1500;
  const index = Math.max(0, COMPETITIVE_RANKS.findLastIndex((rank) => value >= rank.floor));
  const tier = COMPETITIVE_RANKS[index];
  const nextTier = COMPETITIVE_RANKS[Math.min(COMPETITIVE_RANKS.length - 1, index + 1)];
  const ranked = gradedPicks >= 25;
  const placementProgress = Math.min(100, Math.max(0, gradedPicks / 25 * 100));
  const tierProgress = nextTier === tier ? 100 : Math.min(100, Math.max(0, (value - tier.floor) / (nextTier.floor - tier.floor) * 100));
  return {
    rating: Math.round(value), tier, nextTier, ranked, placementProgress, tierProgress,
    placementsRemaining: Math.max(0, 25 - gradedPicks),
    pointsToNext: nextTier === tier ? 0 : Math.max(0, Math.ceil(nextTier.floor - value)),
  };
}

export function promotionForImpact(previousRating, rating, gradedPicks = 25) {
  if (gradedPicks < 25) return null;
  const before = competitiveStanding(previousRating, gradedPicks).tier;
  const after = competitiveStanding(rating, gradedPicks).tier;
  return before.name === after.name ? null : { from: before, to: after };
}

export function nearbyRivals(leaders, rating, limit = 3) {
  return [...leaders]
    .filter((leader) => !leader.is_current_user)
    .sort((a, b) => Math.abs(Number(a.rating) - rating) - Math.abs(Number(b.rating) - rating))
    .slice(0, limit);
}
