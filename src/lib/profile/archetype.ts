export type PlaystyleInput = {
  goal: string;
  risk: "conservative" | "balanced" | "aggressive";
  leagueCount: number;
  sportsbookCount: number;
  style?: string;
  traits?: string[];
};

export type PlaystyleDimension = "Value" | "Confidence" | "Props" | "Market";
export type PlaystyleArchetype = {
  name: string;
  description: string;
  signature: string;
  dimensions: Record<PlaystyleDimension, number>;
  categoryRatings: Record<"Prop IQ" | "Value Detection" | "Market Timing" | "Model Discipline" | "Line Shopping" | "Slate Range", number>;
};

const hybridNames: Record<string, [string, string]> = {
  "Confidence+Value": ["The Edge Forger", "Builds patiently where model agreement and mispriced probability intersect."],
  "Market+Value": ["The Line Phantom", "Moves between prices and market shifts to strike before the edge disappears."],
  "Props+Value": ["The Prop Savant", "Transforms player projections into focused expected-value opportunities."],
  "Confidence+Market": ["The Market Warden", "Requires model conviction and market confirmation before moving."],
  "Confidence+Props": ["The Projection Oracle", "Sees player-level outcomes through evidence, context, and model agreement."],
  "Market+Props": ["The Slate Cartographer", "Maps player markets across books to uncover hidden paths to value."],
};

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
  if (input.style === "Patient & precise") raw.Confidence += 26;
  if (input.style === "Data-first") { raw.Confidence += 18; raw.Props += 8; }
  if (input.style === "Value-driven") raw.Value += 28;
  if (input.style === "Contrarian") { raw.Value += 17; raw.Market += 12; }
  if (input.style === "Momentum-aware") { raw.Market += 15; raw.Props += 14; }
  if (input.style === "High-upside explorer") { raw.Props += 18; raw.Value += 14; }
  for (const trait of input.traits ?? []) {
    if (trait === "Model confidence") raw.Confidence += 14;
    if (trait === "Best available price") raw.Value += 12;
    if (trait === "Market movement") raw.Market += 14;
    if (trait === "Player trends") raw.Props += 14;
    if (trait === "Recent form") { raw.Props += 8; raw.Confidence += 5; }
    if (trait === "Contrarian signals") { raw.Value += 8; raw.Market += 8; }
  }
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
  const [secondary, secondaryScore] = ranked[1];
  const balanced = primaryScore - secondaryScore <= 3;
  const hybridKey = [primary, secondary].sort().join("+");
  const special = input.style === "Contrarian"
    ? ["The Contrarian Cipher", "Decodes where public conviction and model evidence quietly diverge."]
    : input.style === "Momentum-aware"
      ? ["The Momentum Seer", "Reads form and market velocity without losing sight of the underlying price."]
      : input.style === "High-upside explorer"
        ? ["The Upside Vanguard", "Explores wider outcomes where asymmetric upside justifies additional variance."]
        : null;
  const identity = special ?? (balanced ? ["The Adaptive Quant", "Blends model confidence, value, and market context as the slate changes."] : hybridNames[hybridKey]);
  const hasTrait = (trait: string) => (input.traits ?? []).includes(trait);
  const score = (value: number) => Math.max(25, Math.min(99, Math.round(value)));
  const categoryRatings = {
    "Prop IQ": score(34 + dimensions.Props * .72 + input.leagueCount * 3 + (hasTrait("Player trends") ? 13 : 0)),
    "Value Detection": score(35 + dimensions.Value * .78 + (hasTrait("Best available price") ? 14 : 0)),
    "Market Timing": score(32 + dimensions.Market * .76 + (hasTrait("Market movement") ? 15 : 0) + (input.style === "Momentum-aware" ? 8 : 0)),
    "Model Discipline": score(36 + dimensions.Confidence * .72 + (hasTrait("Model confidence") ? 14 : 0) + (input.style === "Patient & precise" ? 8 : 0)),
    "Line Shopping": score(30 + input.sportsbookCount * 8 + dimensions.Market * .45 + (hasTrait("Best available price") ? 11 : 0)),
    "Slate Range": score(32 + input.leagueCount * 9 + (input.style === "High-upside explorer" ? 12 : 0) + (input.style === "Data-first" ? 5 : 0)),
  };
  return {
    name: identity[0],
    description: identity[1],
    signature: `${primaryScore}% ${primary.toLowerCase()} signature`,
    dimensions,
    categoryRatings,
  };
}
