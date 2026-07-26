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
  kind?: "matchup" | "prop";
  slug?: string;
  propId?: string;
  book?: string;
  outcomeName?: string;
  live?: boolean;
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
  confidence: { value: number; explanation: string };
  risk: { level: "Low" | "Medium" | "High"; explanation: string };
  reasoning: Array<{ title: string; detail: string }>;
  alternatives: Array<{ selection: string; expectedValue: number; confidence: number }>;
  followUps: string[];
  snapshot: IntelligenceSnapshot;
  recommendation?: MarketEdge;
};

export interface IntelligenceAdapter {
  getSnapshot(): Promise<IntelligenceSnapshot>;
}
