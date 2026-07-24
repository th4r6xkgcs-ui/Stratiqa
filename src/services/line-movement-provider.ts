import { mockResult } from "./provider-utils";
import type { DataProvider, LineMovementData } from "./types";

export class MockLineMovementProvider implements DataProvider<LineMovementData[]> {
  async getData() {
    return mockResult([
      { matchupId: "sea-vs-sf", open: -105, current: -118, sharpPercent: 68, moneyPercent: 71, ticketPercent: 54 },
      { matchupId: "lad-vs-col", open: -102, current: -110, sharpPercent: 64, moneyPercent: 66, ticketPercent: 61 },
      { matchupId: "nyy-vs-bos", open: 110, current: 102, sharpPercent: 57, moneyPercent: 59, ticketPercent: 48 },
    ], "STRATIQA mock line movement");
  }
}
