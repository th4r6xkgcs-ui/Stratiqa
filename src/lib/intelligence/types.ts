export type DataMode = "mock" | "live";

export type MarketEdge = {
  id: string;
  matchup: string;
  market: string;
  selection: string;
  price: number;
  modelProbability: number;
  marketProbability: number;
  expectedValue: number;
  confidence: number;
  reasons: string[];
};

export type IntelligenceSnapshot = {
  mode: DataMode;
  provider: string;
  generatedAt: string;
  edges: MarketEdge[];
};

export type CoachPrompt = {
  message: string;
  focus?: "slate" | "props" | "risk";
};

export type CoachReply = {
  answer: string;
  followUps: string[];
  snapshot: IntelligenceSnapshot;
};

export interface IntelligenceAdapter {
  getSnapshot(): Promise<IntelligenceSnapshot>;
}
