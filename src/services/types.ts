export type ProviderResult<T> = {
  data: T;
  provider: string;
  mode: "mock" | "live";
  updatedAt: string;
  stale?: boolean;
  latencyMs?: number;
};

export interface DataProvider<T> {
  getData(): Promise<ProviderResult<T>>;
}

export type ProviderHealth = {
  name: string;
  status: "healthy" | "degraded" | "unavailable";
  mode: "mock" | "live";
  latencyMs: number;
  lastSuccessAt: string | null;
  consecutiveFailures: number;
  stale: boolean;
};

export type SportsbookQuote = { book: string; price: number; line: string; marketKey?: string; outcomeName?: string; point?: number | null };
export type OddsData = { matchupId: string; quotes: SportsbookQuote[]; bestBook: string; providerEventId?: string; providerSportKey?: string; commenceTime?: string };
export type WeatherData = { matchupId: string; summary: string; impact: number; temperature: number; windMph: number };
export type InjuryData = { matchupId: string; team: string; player: string; status: string; impact: number }[];
export type StandingData = { team: string; record: string; rank: number; form: string };
export type StatsData = { matchupId: string; bullpenEdge: number; starterEdge: number; recentForm: string };
export type PropData = {
  id: string;
  player: string;
  team: string;
  matchup: string;
  market: string;
  line: string;
  price: number;
  projection: number;
  hitRate: number;
  expectedValue: number;
  confidence: number;
  trend: number[];
  tags: string[];
  quotes?: Array<{ book: string; outcomeName: string; price: number }>;
  providerEventId?: string;
  providerSportKey?: string;
  providerCommenceTime?: string;
  marketKey?: string;
  point?: number;
  live?: boolean;
};
export type LineMovementData = { matchupId: string; open: number; current: number; sharpPercent: number; moneyPercent: number; ticketPercent: number };

export type MatchupIntelligence = {
  id: string;
  away: string;
  awayAbbr: string;
  home: string;
  homeAbbr: string;
  startTime: string;
  pick: string;
  aiSummary: string;
  winProbability: number;
  modelEdge: number;
  expectedValue: number;
  confidence: number;
  valueGrade: string;
  injuryImpact: number;
  weatherImpact: number;
  bullpenEdge: number;
  startingPitchingEdge: number;
  recentForm: string;
  bestSportsbook: string;
  alternateLines: SportsbookQuote[];
  providerEventId: string | null;
  providerSportKey: string | null;
  providerCommenceTime: string | null;
  providerMode: "mock" | "live";
  market: LineMovementData;
  reasoning: Array<{ title: string; summary: string; detail: string; score: number }>;
};
