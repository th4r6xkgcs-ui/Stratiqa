const factorNames = {
  market_value: "Price",
  recent_form: "Form",
  injuries: "Availability",
  weather: "Conditions",
  matchup: "Matchup",
  line_movement: "Market",
  player_usage: "Usage",
  bullpen: "Bullpen",
};

export function modelIdentity(category, factors, risk = "balanced") {
  const factorSet = new Set(factors);
  let name = category === "player_prop" ? "Projection Architect" : category === "moneyline" ? "Outcome Cartographer" : category === "spread" ? "Margin Engineer" : category === "total" ? "Tempo Oracle" : "Live Signal Hunter";
  if (factorSet.has("market_value") && factorSet.has("line_movement")) name = "Price Current";
  if (factorSet.has("recent_form") && factorSet.has("matchup")) name = "Form Navigator";
  if (factorSet.has("player_usage") && category === "player_prop") name = "Usage Alchemist";
  if (factorSet.has("bullpen") && category === "moneyline") name = "Ninth-Inning Warden";
  if (factorSet.has("weather") && category === "total") name = "Atmosphere Reader";
  const prefix = risk === "selective" ? "Precision" : risk === "opportunistic" ? "Asymmetric" : "";
  return {
    archetype: `${prefix} ${name}`.trim(),
    strengths: factors.slice(0, 3).map((factor) => factorNames[factor] ?? factor),
    discipline: Math.min(96, 58 + factors.length * 6 + (risk === "selective" ? 8 : 0)),
  };
}

export function factorWeights(factors, strategy) {
  return Object.fromEntries(factors.map((factor, index) => [factor, Math.max(10, 30 - index * 3 + (factor === strategy ? 8 : 0))]));
}
