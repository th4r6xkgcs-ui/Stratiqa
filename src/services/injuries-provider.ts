import { mockResult } from "./provider-utils";
import type { DataProvider, InjuryData } from "./types";

export class MockInjuriesProvider implements DataProvider<InjuryData> {
  async getData() {
    return mockResult([
      { matchupId: "sea-vs-sf", team: "SF", player: "LaMonte Wade Jr.", status: "Questionable", impact: 4 },
      { matchupId: "lad-vs-col", team: "COL", player: "Kris Bryant", status: "Out", impact: 7 },
      { matchupId: "nyy-vs-bos", team: "BOS", player: "Rafael Devers", status: "Probable", impact: 1 },
    ], "STRATIQA mock injuries");
  }
}
