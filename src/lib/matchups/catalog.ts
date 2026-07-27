export type MatchupCatalogEntry = {
  id: string;
  away: string;
  awayAbbr: string;
  awayRecord: string;
  home: string;
  homeAbbr: string;
  homeRecord: string;
  startTime: string;
  pick: string;
  price: number;
  aiSummary: string;
  winProbability: number;
  modelEdge: number;
  expectedValue: number;
  confidence: number;
  valueGrade: string;
};

export const matchupCatalog = [
  { id: "sea-vs-sf", away: "Seattle Mariners", awayAbbr: "SEA", awayRecord: "47-38", home: "San Francisco Giants", homeAbbr: "SF", homeRecord: "45-40", startTime: "7:10 PM", pick: "Seattle Mariners ML", price: -118, aiSummary: "Seattle owns the strongest risk-adjusted edge on the slate. Bullpen leverage, starting pitching, and a still-playable market price align without a material weather penalty.", winProbability: 63, modelEdge: 13.2, expectedValue: 16.5, confidence: 91, valueGrade: "A+" },
  { id: "lad-vs-col", away: "Los Angeles Dodgers", awayAbbr: "LAD", awayRecord: "53-31", home: "Colorado Rockies", homeAbbr: "COL", homeRecord: "29-55", startTime: "8:10 PM", pick: "Dodgers -1.5", price: -110, aiSummary: "Los Angeles has the widest talent gap, though run-line variance and weather-driven scoring keep confidence below Seattle.", winProbability: 72, modelEdge: 10.4, expectedValue: 14.1, confidence: 88, valueGrade: "A" },
  { id: "hou-vs-chw", away: "Houston Astros", awayAbbr: "HOU", awayRecord: "54-45", home: "Chicago White Sox", homeAbbr: "CHW", homeRecord: "31-66", startTime: "8:10 PM", pick: "Astros ML", price: -125, aiSummary: "Houston grades well across offense and bullpen depth, with the current price preserving a meaningful but not elite margin.", winProbability: 68, modelEdge: 8.7, expectedValue: 11, confidence: 84, valueGrade: "A-" },
  { id: "nyy-vs-bos", away: "New York Yankees", awayAbbr: "NYY", awayRecord: "48-35", home: "Boston Red Sox", homeAbbr: "BOS", homeRecord: "44-40", startTime: "7:05 PM", pick: "Yankees ML", price: 102, aiSummary: "New York offers plus-money value with modest sharp alignment. Rivalry volatility and a narrower bullpen edge reduce conviction.", winProbability: 58, modelEdge: 5.6, expectedValue: 8.2, confidence: 74, valueGrade: "B+" },
  { id: "min-vs-cle", away: "Minnesota Twins", awayAbbr: "MIN", awayRecord: "50-50", home: "Cleveland Guardians", homeAbbr: "CLE", homeRecord: "48-48", startTime: "7:10 PM", pick: "Twins ML", price: 122, aiSummary: "Minnesota presents an underdog value case supported by recent contact quality, though Cleveland's late-inning relief narrows the edge.", winProbability: 61, modelEdge: 7.9, expectedValue: 10, confidence: 81, valueGrade: "B+" },
  { id: "atl-vs-mia", away: "Atlanta Braves", awayAbbr: "ATL", awayRecord: "44-39", home: "Miami Marlins", homeAbbr: "MIA", homeRecord: "38-46", startTime: "8:05 PM", pick: "Braves ML", price: -105, aiSummary: "Atlanta is a modest model lean rather than a core position. The price is fair, but signal agreement remains below the premium threshold.", winProbability: 57, modelEdge: 4.2, expectedValue: 6, confidence: 69, valueGrade: "B" },
] satisfies MatchupCatalogEntry[];

export function getMatchupCatalogEntry(slug: string) {
  return matchupCatalog.find((matchup) => matchup.id === slug) ?? null;
}
