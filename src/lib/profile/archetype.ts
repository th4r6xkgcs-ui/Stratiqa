export type PlaystyleInput = {
  goal: string;
  goals?: string[];
  risk: "conservative" | "balanced" | "aggressive";
  leagueCount: number;
  sportsbookCount: number;
  style?: string;
  styles?: string[];
  traits?: string[];
};

export type PlaystyleDimension = "Value" | "Confidence" | "Props" | "Market";
export type PlaystyleArchetype = {
  name: string;
  description: string;
  signature: string;
  dimensions: Record<PlaystyleDimension, number>;
  categoryRatings: Record<"Prop IQ" | "Value Detection" | "Market Timing" | "Model Discipline" | "Line Shopping" | "Slate Range", number>;
  drivers: string[];
  stage: "Origin profile" | "Calibrating" | "Verified";
};

const hybridNames: Record<string, [string, string]> = {
  "Confidence+Value": ["The Edge Forger", "Builds patiently where model agreement and mispriced probability intersect."],
  "Market+Value": ["The Line Phantom", "Moves between prices and market shifts to strike before the edge disappears."],
  "Props+Value": ["The Prop Savant", "Transforms player projections into focused expected-value opportunities."],
  "Confidence+Market": ["The Market Warden", "Requires model conviction and market confirmation before moving."],
  "Confidence+Props": ["The Projection Oracle", "Sees player-level outcomes through evidence, context, and model agreement."],
  "Market+Props": ["The Slate Cartographer", "Maps player markets across books to uncover hidden paths to value."],
};

const styleHybridNames: Record<string, [string, string]> = {
  "Patient & precise|Confidence+Value": ["The Iron Thesis", "Waits for exceptional evidence, then holds conviction through market noise."],
  "Patient & precise|Confidence+Props": ["The Iron Thesis", "Waits for exceptional evidence, then holds conviction through market noise."],
  "Patient & precise|Confidence+Market": ["The Quiet Warden", "Observes model and market confirmation before revealing a position."],
  "Data-first|Confidence+Props": ["The Model Savant", "Connects projections, context, and player-level evidence with uncommon precision."],
  "Data-first|Confidence+Value": ["The Quant Forger", "Turns disciplined modeling into repeatable, price-aware decisions."],
  "Value-driven|Market+Value": ["The Closing-Line Hunter", "Pursues the number most likely to disappear before the market closes."],
  "Value-driven|Props+Value": ["The Prop Smith", "Forges player-level projections into efficient, value-centered positions."],
  "Contrarian|Market+Value": ["The Public Fade", "Finds opportunity where crowd behavior stretches the market beyond the evidence."],
  "Contrarian|Confidence+Value": ["The Consensus Breaker", "Challenges popular positions only when the model creates a defensible alternative."],
  "Momentum-aware|Market+Props": ["The Velocity Reader", "Reads player form and market acceleration before the trend becomes consensus."],
  "Momentum-aware|Confidence+Props": ["The Form Oracle", "Balances recent performance with underlying projection quality."],
  "High-upside explorer|Props+Value": ["The Ceiling Architect", "Constructs asymmetric positions around player upside and favorable price."],
  "High-upside explorer|Market+Value": ["The Longshot Navigator", "Explores wider outcomes while staying anchored to market value."],
};

const styleBlendNames: Record<string, [string, string]> = {
  "Contrarian+Patient & precise": ["The Silent Rebel", "Challenges consensus selectively, waiting until evidence creates a rare asymmetric opening."],
  "Data-first+Momentum-aware": ["The Velocity Quant", "Combines systematic modeling with fast-moving form and market information."],
  "High-upside explorer+Value-driven": ["The Asymmetric Hunter", "Searches for outcomes where potential return meaningfully exceeds modeled risk."],
  "Data-first+Value-driven": ["The Probability Smith", "Forges projections and price into a disciplined expected-value process."],
  "Momentum-aware+Value-driven": ["The Closing Wave", "Tracks changing form and price to enter before value is absorbed."],
  "Contrarian+Data-first": ["The Model Dissenter", "Breaks from consensus only when the underlying numbers justify it."],
  "High-upside explorer+Momentum-aware": ["The Breakout Scout", "Searches emerging trends for outcomes with room to outperform expectation."],
  "Patient & precise+Value-driven": ["The Value Warden", "Protects bankroll and attention until price and evidence align."],
};

export function buildPlaystyleArchetype(input: PlaystyleInput): PlaystyleArchetype {
  const raw: Record<PlaystyleDimension, number> = { Value: 25, Confidence: 25, Props: 25, Market: 25 };
  const goals = input.goals?.length ? input.goals : [input.goal];
  const styles = input.styles?.length ? input.styles : input.style ? [input.style] : [];
  for (const goal of goals) {
    if (goal.includes("value")) raw.Value += 28;
    if (goal.includes("props")) raw.Props += 32;
    if (goal.includes("sportsbook")) raw.Market += 30;
    if (goal.includes("predictions")) raw.Confidence += 28;
    if (goal.includes("teams")) { raw.Props += 11; raw.Confidence += 11; }
    if (goal.includes("upset")) { raw.Value += 15; raw.Market += 9; }
    if (goal.includes("parlays")) { raw.Props += 12; raw.Value += 9; }
    if (goal.includes("risk")) raw.Confidence += 22;
  }
  if (input.risk === "conservative") raw.Confidence += 35;
  if (input.risk === "balanced") { raw.Value += 15; raw.Confidence += 15; }
  if (input.risk === "aggressive") { raw.Value += 22; raw.Props += 13; }
  for (const style of styles) {
    if (style === "Patient & precise") raw.Confidence += 20;
    if (style === "Data-first") { raw.Confidence += 14; raw.Props += 6; }
    if (style === "Value-driven") raw.Value += 21;
    if (style === "Contrarian") { raw.Value += 13; raw.Market += 9; }
    if (style === "Momentum-aware") { raw.Market += 12; raw.Props += 10; }
    if (style === "High-upside explorer") { raw.Props += 14; raw.Value += 10; }
  }
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
  const styleKey = `${styles[0] ?? ""}|${hybridKey}`;
  const blendKey = styles.slice().sort().join("+");
  const identity = styleBlendNames[blendKey] ?? styleHybridNames[styleKey] ?? (balanced ? ["The Adaptive Quant", "Blends model confidence, value, and market context as the slate changes."] : hybridNames[hybridKey]);
  const hasTrait = (trait: string) => (input.traits ?? []).includes(trait);
  const score = (value: number) => Math.max(25, Math.min(99, Math.round(value)));
  const categoryRatings = {
    "Prop IQ": score(34 + dimensions.Props * .72 + input.leagueCount * 3 + (hasTrait("Player trends") ? 13 : 0)),
    "Value Detection": score(35 + dimensions.Value * .78 + (hasTrait("Best available price") ? 14 : 0)),
    "Market Timing": score(32 + dimensions.Market * .76 + (hasTrait("Market movement") ? 15 : 0) + (styles.includes("Momentum-aware") ? 8 : 0)),
    "Model Discipline": score(36 + dimensions.Confidence * .72 + (hasTrait("Model confidence") ? 14 : 0) + (styles.includes("Patient & precise") ? 8 : 0)),
    "Line Shopping": score(30 + input.sportsbookCount * 8 + dimensions.Market * .45 + (hasTrait("Best available price") ? 11 : 0)),
    "Slate Range": score(32 + input.leagueCount * 9 + (styles.includes("High-upside explorer") ? 12 : 0) + (styles.includes("Data-first") ? 5 : 0)),
  };
  return {
    name: identity[0],
    description: identity[1],
    signature: `${primaryScore}% ${primary.toLowerCase()} signature`,
    dimensions,
    categoryRatings,
    drivers: [...styles, ...(input.traits ?? []), ...goals].filter((value): value is string => Boolean(value)).slice(0, 4),
    stage: "Origin profile",
  };
}
