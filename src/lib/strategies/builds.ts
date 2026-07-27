export type StrategyWeights = {
  confidence: number;
  value: number;
  market: number;
};

export type StrategyBuild = {
  id: string;
  name: string;
  description: string;
  minimumConfidence: number;
  weights: StrategyWeights;
};

export const defaultStrategyBuilds: StrategyBuild[] = [
  {
    id: "balanced-edge",
    name: "Balanced Edge",
    description: "Balances model conviction, expected value, and market confirmation.",
    minimumConfidence: 70,
    weights: { confidence: 40, value: 35, market: 25 },
  },
  {
    id: "high-conviction",
    name: "High Conviction",
    description: "Prioritizes stable signals and filters out lower-confidence positions.",
    minimumConfidence: 82,
    weights: { confidence: 60, value: 25, market: 15 },
  },
  {
    id: "value-hunter",
    name: "Value Hunter",
    description: "Accepts more variance to surface mispriced plus-money opportunities.",
    minimumConfidence: 65,
    weights: { confidence: 25, value: 55, market: 20 },
  },
];

export const strategyStorageKey = "stratiqa-strategy-builds";
export const activeStrategyStorageKey = "stratiqa-active-strategy";

export function normalizeWeights(weights: StrategyWeights) {
  const total = weights.confidence + weights.value + weights.market || 1;
  return {
    confidence: weights.confidence / total,
    value: weights.value / total,
    market: weights.market / total,
  };
}
