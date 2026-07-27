import "server-only";
import { normalizeLiveBoard } from "./live-board-normalizer.js";
import { mockResult } from "./provider-utils";
import type { DataProvider, LiveBoardEvent, ProviderResult } from "./types";

type ExternalEvent = {
  id: string; sport_key: string; commence_time: string; away_team: string; home_team: string;
  bookmakers: Array<{ title: string; markets: Array<{ key: string; outcomes: Array<{ name: string; price: number; point?: number }> }> }>;
};

export const liveBoardSports = ["baseball_mlb", "basketball_nba", "americanfootball_nfl", "icehockey_nhl", "basketball_wnba"] as const;
export type LiveBoardSport = typeof liveBoardSports[number];

const demo: LiveBoardEvent[] = [{
  id: "demo-sea-sf", slug: "baseball_mlb--demo-sea-sf", sportKey: "baseball_mlb",
  awayTeam: "Seattle Mariners", homeTeam: "San Francisco Giants", commenceTime: new Date(Date.now() + 3_600_000).toISOString(),
  quotes: [
    { book: "STRATIQA demo", price: -118, line: "SEA ML", marketKey: "h2h", outcomeName: "Seattle Mariners", point: null },
    { book: "STRATIQA demo", price: 108, line: "SFG ML", marketKey: "h2h", outcomeName: "San Francisco Giants", point: null },
    { book: "STRATIQA demo", price: -110, line: "SEA -1.5", marketKey: "spreads", outcomeName: "Seattle Mariners", point: -1.5 },
    { book: "STRATIQA demo", price: -110, line: "SFG +1.5", marketKey: "spreads", outcomeName: "San Francisco Giants", point: 1.5 },
    { book: "STRATIQA demo", price: -105, line: "Over 7.5", marketKey: "totals", outcomeName: "Over", point: 7.5 },
    { book: "STRATIQA demo", price: -115, line: "Under 7.5", marketKey: "totals", outcomeName: "Under", point: 7.5 },
  ],
}];

export class MockLiveBoardProvider implements DataProvider<LiveBoardEvent[]> {
  constructor(private readonly sport: LiveBoardSport) {}
  async getData() { return mockResult(this.sport === "baseball_mlb" ? demo : [], "STRATIQA demo board"); }
}

export class LiveBoardProvider implements DataProvider<LiveBoardEvent[]> {
  constructor(private readonly apiKey: string, private readonly sport: LiveBoardSport) {}
  async getData(): Promise<ProviderResult<LiveBoardEvent[]>> {
    const url = new URL(`https://api.the-odds-api.com/v4/sports/${this.sport}/odds`);
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("regions", "us");
    url.searchParams.set("markets", "h2h,spreads,totals");
    url.searchParams.set("oddsFormat", "american");
    url.searchParams.set("dateFormat", "iso");
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`Live board responded with ${response.status}`);
    return { data: normalizeLiveBoard(await response.json() as ExternalEvent[]), provider: "The Odds API", mode: "live", updatedAt: new Date().toISOString() };
  }
}
