import { mockResult } from "./provider-utils";
import type { DataProvider, OddsData } from "./types";

export class MockOddsProvider implements DataProvider<OddsData[]> {
  async getData() {
    return mockResult([
      { matchupId: "sea-vs-sf", bestBook: "DraftKings", quotes: [{ book: "DraftKings", price: -118, line: "SEA ML" }, { book: "FanDuel", price: -120, line: "SEA ML" }, { book: "BetMGM", price: -115, line: "SEA -1.5" }] },
      { matchupId: "lad-vs-col", bestBook: "FanDuel", quotes: [{ book: "FanDuel", price: -110, line: "LAD -1.5" }, { book: "DraftKings", price: -112, line: "LAD -1.5" }] },
      { matchupId: "nyy-vs-bos", bestBook: "Caesars", quotes: [{ book: "Caesars", price: 102, line: "NYY ML" }, { book: "FanDuel", price: -102, line: "NYY ML" }] },
    ], "STRATIQA mock odds");
  }
}
