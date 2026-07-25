export type PlaystyleInput = {
  goal: string;
  risk: "conservative" | "balanced" | "aggressive";
  leagueCount: number;
  sportsbookCount: number;
};

export type PlaystyleDimension = "Value" | "Confidence" | "Props" | "Market";
export type PlaystyleArchetype = {
  name: string;
  description: string;
  signature: string;
  dimensions: Record<PlaystyleDimension, number>;
};

const names = {
  Value: ["The Edge Architect", "Builds a card around mispriced probability and sustainable expected value."],
  Confidence: ["The Signal Sentinel", "Waits for the strongest model agreement before committing attention."],
  Props: ["The Prop Alchemist", "Transforms player trends and projections into focused opportunities."],
  Market: ["The Line Hawk", "Tracks price, movement, and sportsbook differences before the market settles."],
} as const;

export function buildPlaystyleArchetype(input: PlaystyleInput): PlaystyleArchetype {
  const raw: Record<PlaystyleDimension, number> = { Value: 25, Confidence: 25, Props: 25, Market: 25 };
  if (input.goal.includes("value")) raw.Value += 40;
  if (input.goal.includes("props")) raw.Props += 45;
  if (input.goal.includes("sportsbook")) raw.Market += 42;
  if (input.goal.includes("predictions")) raw.Confidence += 38;
  if (input.goal.includes("teams")) { raw.Props += 16; raw.Confidence += 16; }
  if (input.risk === "conservative") raw.Confidence += 35;
  if (input.risk === "balanced") { raw.Value += 15; raw.Confidence += 15; }
  if (input.risk === "aggressive") { raw.Value += 22; raw.Props += 13; }
  raw.Market += Math.min(25, input.sportsbookCount * 5);
  raw.Props += Math.min(12, Math.max(0, input.leagueCount - 1) * 3);

  const total = Object.values(raw).reduce((sum, score) => sum + score, 0);
  const dimensions = Object.fromEntries(
    Object.entries(raw).map(([key, score]) => [key, Math.round(score / total * 100)]),
  ) as Record<PlaystyleDimension, number>;
  const difference = 100 - Object.values(dimensions).reduce((sum, score) => sum + score, 0);
  dimensions.Value += difference;

  const ranked = (Object.entries(dimensions) as Array<[PlaystyleDimension, number]>).sort((a, b) => b[1] - a[1]);
  const [primary, primaryScore] = ranked[0];
  const [, secondaryScore] = ranked[1];
  const balanced = primaryScore - secondaryScore <= 3;
  return {
    name: balanced ? "The Adaptive Sharp" : names[primary][0],
    description: balanced ? "Blends model confidence, value, and market context as the slate changes." : names[primary][1],
    signature: `${primaryScore}% ${primary.toLowerCase()} signature`,
    dimensions,
  };
}
