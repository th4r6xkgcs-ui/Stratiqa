import type { IntelligenceAdapter, IntelligenceSnapshot } from "./types";

const edges = [
  {
    id: "sea-ml",
    matchup: "Seattle Mariners vs San Francisco Giants",
    market: "Moneyline",
    selection: "Seattle Mariners",
    price: -118,
    modelProbability: 0.63,
    marketProbability: 0.541,
    expectedValue: 0.165,
    confidence: 0.91,
    reasons: ["Bullpen leverage advantage", "Starting-pitching edge", "Price remains below the -122 limit"],
  },
  {
    id: "julio-tb",
    matchup: "Seattle Mariners vs San Francisco Giants",
    market: "Player total bases",
    selection: "Julio Rodríguez over 1.5",
    price: 105,
    modelProbability: 0.58,
    marketProbability: 0.488,
    expectedValue: 0.189,
    confidence: 0.84,
    reasons: ["Hard-contact trend is improving", "Favorable middle-relief matchup", "Projection clears the line by 0.6 bases"],
  },
  {
    id: "cole-k",
    matchup: "New York Yankees vs Boston Red Sox",
    market: "Pitcher strikeouts",
    selection: "Gerrit Cole over 6.5",
    price: -110,
    modelProbability: 0.57,
    marketProbability: 0.524,
    expectedValue: 0.088,
    confidence: 0.76,
    reasons: ["Opponent chase rate is above league average", "Pitch count projects to 96", "Weather has limited impact"],
  },
] satisfies IntelligenceSnapshot["edges"];

export class MockIntelligenceAdapter implements IntelligenceAdapter {
  async getSnapshot(): Promise<IntelligenceSnapshot> {
    return {
      mode: "mock",
      provider: "STRATIQA representative data",
      generatedAt: new Date().toISOString(),
      edges,
    };
  }
}
