import { mockResult } from "./provider-utils";
import { normalizePlayerProps } from "./props-normalizer.js";
import type { DataProvider, PropData, ProviderResult } from "./types";

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

type ExternalEvent = { id: string; sport_key: string; commence_time: string; home_team: string; away_team: string };
export class LivePropsProvider implements DataProvider<PropData[]> {
  constructor(private readonly apiKey: string, private readonly sport = process.env.STRATIQA_ODDS_SPORT ?? "baseball_mlb") {}
  async getData(): Promise<ProviderResult<PropData[]>> {
    const eventsUrl = new URL(`https://api.the-odds-api.com/v4/sports/${this.sport}/events`);
    eventsUrl.searchParams.set("apiKey", this.apiKey);
    const eventsResponse = await fetch(eventsUrl, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!eventsResponse.ok) throw new Error(`Props events responded with ${eventsResponse.status}`);
    const maxEvents = Math.max(1, Math.min(8, Number(process.env.STRATIQA_PROPS_MAX_EVENTS ?? 3)));
    const markets = process.env.STRATIQA_PROPS_MARKETS ?? "batter_total_bases,batter_hits,batter_home_runs,pitcher_strikeouts";
    const events = (await eventsResponse.json() as ExternalEvent[]).filter((event) => new Date(event.commence_time).getTime() > Date.now()).slice(0, maxEvents);
    const boards = await Promise.all(events.map(async (event) => {
      const url = new URL(`https://api.the-odds-api.com/v4/sports/${this.sport}/events/${event.id}/odds`);
      url.searchParams.set("apiKey", this.apiKey); url.searchParams.set("regions", "us");
      url.searchParams.set("markets", markets); url.searchParams.set("oddsFormat", "american");
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
      if (!response.ok) throw new Error(`Event props responded with ${response.status}`);
      return response.json();
    }));
    const data = normalizePlayerProps(boards) as PropData[];
    if (!data.length) throw new Error("No live player props are currently available");
    return { data, provider: "The Odds API", mode: "live", updatedAt: new Date().toISOString() };
  }
}

export class FallbackPropsProvider implements DataProvider<PropData[]> {
  constructor(private readonly live: LivePropsProvider, private readonly mock = new MockPropsProvider()) {}
  async getData() { try { return await this.live.getData(); } catch (error) { console.warn("Live props unavailable; using mock fallback", error); return this.mock.getData(); } }
}
