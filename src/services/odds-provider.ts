import { mockResult } from "./provider-utils";
import { normalizeOdds } from "./odds-normalizer.js";
import type { DataProvider, OddsData, ProviderResult } from "./types";

type ExternalGame = {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Array<{
    title: string;
    markets: Array<{ key: string; outcomes: Array<{ name: string; price: number; point?: number }> }>;
  }>;
};

export class MockOddsProvider implements DataProvider<OddsData[]> {
  async getData(): Promise<ProviderResult<OddsData[]>> {
    return mockResult([
      { matchupId: "sea-vs-sf", bestBook: "DraftKings", quotes: [{ book: "DraftKings", price: -118, line: "SEA ML", marketKey: "h2h", outcomeName: "Seattle Mariners", point: null }, { book: "FanDuel", price: -120, line: "SEA ML", marketKey: "h2h", outcomeName: "Seattle Mariners", point: null }, { book: "BetMGM", price: -115, line: "SEA -1.5", marketKey: "spreads", outcomeName: "Seattle Mariners", point: -1.5 }] },
      { matchupId: "lad-vs-col", bestBook: "FanDuel", quotes: [{ book: "FanDuel", price: -110, line: "LAD -1.5" }, { book: "DraftKings", price: -112, line: "LAD -1.5" }] },
      { matchupId: "nyy-vs-bos", bestBook: "Caesars", quotes: [{ book: "Caesars", price: 102, line: "NYY ML" }, { book: "FanDuel", price: -102, line: "NYY ML" }] },
    ], "STRATIQA mock odds");
  }
}

export class LiveOddsProvider implements DataProvider<OddsData[]> {
  private readonly apiKey: string;
  private readonly sport: string;

  constructor(apiKey: string, sport = process.env.STRATIQA_ODDS_SPORT ?? "baseball_mlb") {
    this.apiKey = apiKey;
    this.sport = sport;
  }

  async getData(): Promise<ProviderResult<OddsData[]>> {
    const url = new URL(`https://api.the-odds-api.com/v4/sports/${this.sport}/odds`);
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("regions", "us");
    url.searchParams.set("markets", "h2h,spreads");
    url.searchParams.set("oddsFormat", "american");
    url.searchParams.set("dateFormat", "iso");
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`The Odds API responded with ${response.status}`);
    return {
      data: normalizeOdds(await response.json() as ExternalGame[]) as OddsData[],
      provider: "The Odds API",
      mode: "live" as const,
      updatedAt: new Date().toISOString(),
    };
  }
}
