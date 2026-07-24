import { mockResult } from "./provider-utils";
import type { DataProvider, PropData } from "./types";

const props: PropData[] = [
  { id: "julio-tb", player: "Julio Rodríguez", team: "SEA", matchup: "SEA vs SF", market: "Total Bases", line: "Over 1.5", price: 105, projection: 2.1, hitRate: 68, expectedValue: 18.9, confidence: 88, trend: [1, 2, 0, 3, 2, 4, 2], tags: ["AI Pick", "Trending", "Correlated"] },
  { id: "cole-k", player: "Gerrit Cole", team: "NYY", matchup: "NYY vs BOS", market: "Strikeouts", line: "Over 6.5", price: -110, projection: 7.4, hitRate: 64, expectedValue: 10.8, confidence: 82, trend: [8, 6, 9, 5, 7, 8, 9], tags: ["High EV", "AI Pick"] },
  { id: "ohtani-hr", player: "Shohei Ohtani", team: "LAD", matchup: "LAD vs COL", market: "Home Run", line: "Over 0.5", price: 245, projection: .31, hitRate: 37, expectedValue: 8.9, confidence: 74, trend: [0, 1, 0, 0, 1, 0, 1], tags: ["Trending", "SGP"] },
  { id: "tucker-hit", player: "Kyle Tucker", team: "HOU", matchup: "HOU vs CHW", market: "Hits", line: "Over 0.5", price: -185, projection: .78, hitRate: 78, expectedValue: 7.1, confidence: 86, trend: [1, 2, 1, 0, 1, 2, 1], tags: ["Safe", "Correlated"] },
  { id: "judge-rbi", player: "Aaron Judge", team: "NYY", matchup: "NYY vs BOS", market: "RBIs", line: "Over 0.5", price: 120, projection: .61, hitRate: 59, expectedValue: 12.4, confidence: 79, trend: [0, 1, 2, 0, 1, 1, 2], tags: ["High EV", "SGP"] },
  { id: "webb-outs", player: "Logan Webb", team: "SF", matchup: "SEA vs SF", market: "Pitching Outs", line: "Under 17.5", price: -105, projection: 16.2, hitRate: 62, expectedValue: 9.6, confidence: 77, trend: [18, 15, 17, 16, 19, 14, 16], tags: ["AI Pick", "Correlated"] },
];

export class MockPropsProvider implements DataProvider<PropData[]> {
  async getData() {
    return mockResult(props, "STRATIQA mock props");
  }
}
