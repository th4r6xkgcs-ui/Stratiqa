import { mockResult } from "./provider-utils";
import type { DataProvider, StatsData } from "./types";

export class MockStatsProvider implements DataProvider<StatsData[]> {
  async getData() {
    return mockResult([
      { matchupId: "sea-vs-sf", bullpenEdge: 18.4, starterEdge: 14.7, recentForm: "SEA 7-3 · SF 5-5" },
      { matchupId: "lad-vs-col", bullpenEdge: 12.1, starterEdge: 16.8, recentForm: "LAD 8-2 · COL 3-7" },
      { matchupId: "nyy-vs-bos", bullpenEdge: 6.2, starterEdge: 9.4, recentForm: "NYY 6-4 · BOS 5-5" },
    ], "STRATIQA mock advanced stats");
  }
}
