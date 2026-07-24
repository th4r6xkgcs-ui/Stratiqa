import { mockResult } from "./provider-utils";
import type { DataProvider, StandingData } from "./types";

export class MockStandingsProvider implements DataProvider<StandingData[]> {
  async getData() {
    return mockResult([
      { team: "Seattle Mariners", record: "47-38", rank: 4, form: "7-3" },
      { team: "San Francisco Giants", record: "45-40", rank: 12, form: "5-5" },
      { team: "Los Angeles Dodgers", record: "53-31", rank: 1, form: "8-2" },
      { team: "Colorado Rockies", record: "29-55", rank: 29, form: "3-7" },
    ], "STRATIQA mock standings");
  }
}
