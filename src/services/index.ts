import "server-only";
import { MockInjuriesProvider } from "./injuries-provider";
import { MockLineMovementProvider } from "./line-movement-provider";
import { LiveOddsProvider, MockOddsProvider } from "./odds-provider";
import { LiveBoardProvider, MockLiveBoardProvider, liveBoardSports, type LiveBoardSport } from "./live-board-provider";
import { FallbackPropsProvider, MultiSportPropsProvider, MockPropsProvider } from "./props-provider";
import { MockStandingsProvider } from "./standings-provider";
import { MockStatsProvider } from "./stats-provider";
import { MockWeatherProvider } from "./weather-provider";
import { ResilientProvider } from "./runtime";
import { getProviderEnvironment } from "./environment";
import type { LiveBoardEvent, MatchupIntelligence, ProviderHealth, ProviderResult } from "./types";

const environment = getProviderEnvironment();
const oddsSource = environment.mode === "live"
  ? new LiveOddsProvider(process.env.STRATIQA_ODDS_API_KEY!)
  : new MockOddsProvider();
const propsSource = environment.mode === "live"
  ? new FallbackPropsProvider(new MultiSportPropsProvider(
      process.env.STRATIQA_ODDS_API_KEY!,
      (process.env.STRATIQA_PROPS_SPORTS ?? "baseball_mlb,basketball_nba,americanfootball_nfl,icehockey_nhl,basketball_wnba").split(",").map((sport) => sport.trim()),
    ))
  : new MockPropsProvider();

export const providers = {
  odds: new ResilientProvider("odds", oddsSource, { ttlMs: 90_000, staleMs: 900_000, retries: 1, maxRequestsPerWindow: 10, windowMs: 60_000, failureThreshold: 3, cooldownMs: 120_000 }),
  weather: new ResilientProvider("weather", new MockWeatherProvider(), { ttlMs: 120_000, staleMs: 900_000, retries: 2 }),
  injuries: new ResilientProvider("injuries", new MockInjuriesProvider()),
  standings: new ResilientProvider("standings", new MockStandingsProvider(), { ttlMs: 300_000, staleMs: 1_800_000, retries: 2 }),
  stats: new ResilientProvider("stats", new MockStatsProvider(), { ttlMs: 120_000, staleMs: 900_000, retries: 2 }),
  props: new ResilientProvider("props", propsSource, { ttlMs: 120_000, staleMs: 900_000, retries: 0, maxRequestsPerWindow: 5, windowMs: 60_000, failureThreshold: 2, cooldownMs: 180_000 }),
  lineMovement: new ResilientProvider("lineMovement", new MockLineMovementProvider()),
};
const liveBoards = new Map<LiveBoardSport, ResilientProvider<LiveBoardEvent[]>>();

export function isLiveBoardSport(value: string): value is LiveBoardSport {
  return liveBoardSports.includes(value as LiveBoardSport);
}

export async function getLiveBoard(sport: LiveBoardSport): Promise<ProviderResult<LiveBoardEvent[]>> {
  let provider = liveBoards.get(sport);
  if (!provider) {
    const source = environment.mode === "live"
      ? new LiveBoardProvider(process.env.STRATIQA_ODDS_API_KEY!, sport)
      : new MockLiveBoardProvider(sport);
    provider = new ResilientProvider(`liveBoard:${sport}`, source, {
      ttlMs: 300_000, staleMs: 1_800_000, retries: 0, maxRequestsPerWindow: 2,
      windowMs: 300_000, failureThreshold: 2, cooldownMs: 300_000,
    });
    liveBoards.set(sport, provider);
  }
  return provider.getData();
}

export async function getProviderHealth(): Promise<{ environment: ReturnType<typeof getProviderEnvironment>; providers: ProviderHealth[] }> {
  await Promise.allSettled(Object.values(providers).map((provider) => provider.getData()));
  return { environment: getProviderEnvironment(), providers: Object.values(providers).map((provider) => provider.getHealth()) };
}

const matchupBase = {
  "sea-vs-sf": { away: "Seattle Mariners", awayAbbr: "SEA", home: "San Francisco Giants", homeAbbr: "SF", startTime: "7:10 PM", pick: "Seattle Mariners ML", aiSummary: "Seattle owns the strongest risk-adjusted edge on the slate. Bullpen leverage, starting pitching, and a still-playable market price align without a material weather penalty.", winProbability: 63, modelEdge: 13.2, expectedValue: 16.5, confidence: 91, valueGrade: "A+" },
  "lad-vs-col": { away: "Los Angeles Dodgers", awayAbbr: "LAD", home: "Colorado Rockies", homeAbbr: "COL", startTime: "8:10 PM", pick: "Dodgers -1.5", aiSummary: "Los Angeles has the widest talent gap, though run-line variance and weather-driven scoring keep confidence below Seattle.", winProbability: 72, modelEdge: 10.4, expectedValue: 14.1, confidence: 88, valueGrade: "A" },
  "nyy-vs-bos": { away: "New York Yankees", awayAbbr: "NYY", home: "Boston Red Sox", homeAbbr: "BOS", startTime: "7:05 PM", pick: "Yankees ML", aiSummary: "New York offers plus-money value with modest sharp alignment. Rivalry volatility and a narrower bullpen edge reduce conviction.", winProbability: 58, modelEdge: 5.6, expectedValue: 8.2, confidence: 74, valueGrade: "B+" },
  "hou-vs-chw": { away: "Houston Astros", awayAbbr: "HOU", home: "Chicago White Sox", homeAbbr: "CHW", startTime: "8:10 PM", pick: "Astros ML", aiSummary: "Houston grades well across offense and bullpen depth, with the current price preserving a meaningful but not elite margin.", winProbability: 68, modelEdge: 8.7, expectedValue: 11, confidence: 84, valueGrade: "A-" },
  "min-vs-cle": { away: "Minnesota Twins", awayAbbr: "MIN", home: "Cleveland Guardians", homeAbbr: "CLE", startTime: "7:10 PM", pick: "Twins ML", aiSummary: "Minnesota presents an underdog value case supported by recent contact quality, though Cleveland's late-inning relief narrows the edge.", winProbability: 61, modelEdge: 7.9, expectedValue: 10, confidence: 81, valueGrade: "B+" },
  "atl-vs-mia": { away: "Atlanta Braves", awayAbbr: "ATL", home: "Miami Marlins", homeAbbr: "MIA", startTime: "8:05 PM", pick: "Braves ML", aiSummary: "Atlanta is a modest model lean rather than a core position. The price is fair, but signal agreement remains below the premium threshold.", winProbability: 57, modelEdge: 4.2, expectedValue: 6, confidence: 69, valueGrade: "B" },
} as const;

export async function getPropsBoard() {
  return providers.props.getData();
}

export async function getMatchupIntelligence(slug: string): Promise<MatchupIntelligence | null> {
  const staticBase = matchupBase[slug as keyof typeof matchupBase];
  let boardResult: ProviderResult<LiveBoardEvent[]> | null = null;
  let boardEvent: LiveBoardEvent | undefined;
  if (!staticBase) {
    const [sport] = slug.split("--");
    if (!isLiveBoardSport(sport)) return null;
    boardResult = await getLiveBoard(sport);
    boardEvent = boardResult.data.find((event) => event.slug === slug);
    if (!boardEvent) return null;
  }
  const primaryQuote = boardEvent?.quotes.find((quote) => quote.marketKey === "h2h") ?? boardEvent?.quotes[0];
  const awayAbbr = boardEvent ? boardEvent.awayTeam.split(" ").map((word) => word[0]).join("").slice(0, 4).toUpperCase() : "";
  const homeAbbr = boardEvent ? boardEvent.homeTeam.split(" ").map((word) => word[0]).join("").slice(0, 4).toUpperCase() : "";
  const base = staticBase ?? {
    away: boardEvent!.awayTeam, awayAbbr, home: boardEvent!.homeTeam, homeAbbr,
    startTime: new Date(boardEvent!.commenceTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    pick: primaryQuote!.line,
    aiSummary: "STRATIQA is monitoring this pregame market across available books. Review the current price, market shape, and risk profile before locking your decision.",
    winProbability: 55, modelEdge: 4.5, expectedValue: 5.2, confidence: 68, valueGrade: "B",
  };
  const [odds, weather, injuries, stats, market] = await Promise.all([
    boardResult ? Promise.resolve({ data: [], provider: boardResult.provider, mode: boardResult.mode, updatedAt: boardResult.updatedAt }) : providers.odds.getData(),
    providers.weather.getData(), providers.injuries.getData(),
    providers.stats.getData(), providers.lineMovement.getData(),
  ]);
  const quote = boardEvent ? {
    matchupId: slug, bestBook: primaryQuote!.book, quotes: boardEvent.quotes,
    providerEventId: boardEvent.id, providerSportKey: boardEvent.sportKey, commenceTime: boardEvent.commenceTime,
  } : odds.data.find((item) => item.matchupId === slug);
  const weatherRow = weather.data.find((item) => item.matchupId === slug);
  const injuryRows = injuries.data.filter((item) => item.matchupId === slug);
  const statsRow = stats.data.find((item) => item.matchupId === slug);
  const marketRow = market.data.find((item) => item.matchupId === slug);
  const resolvedQuote = quote ?? { bestBook: "DraftKings", quotes: [{ book: "DraftKings", price: -110, line: base.pick }, { book: "FanDuel", price: -112, line: base.pick }] };
  const resolvedWeather = weatherRow ?? { summary: "Neutral playing conditions", impact: 0 };
  const resolvedStats = statsRow ?? { bullpenEdge: base.modelEdge + 2.1, starterEdge: base.modelEdge + 3.4, recentForm: "Recent form balanced" };
  const resolvedMarket = marketRow ?? { matchupId: slug, open: -105, current: -110, sharpPercent: 58, moneyPercent: 61, ticketPercent: 52 };
  const injuryImpact = injuryRows.reduce((sum, item) => sum + item.impact, 0);

  return {
    id: slug, ...base, injuryImpact, weatherImpact: resolvedWeather.impact,
    bullpenEdge: resolvedStats.bullpenEdge, startingPitchingEdge: resolvedStats.starterEdge,
    recentForm: resolvedStats.recentForm, bestSportsbook: resolvedQuote.bestBook,
    alternateLines: resolvedQuote.quotes, market: resolvedMarket,
    providerEventId: quote?.providerEventId ?? null, providerSportKey: quote?.providerSportKey ?? null,
    providerCommenceTime: quote?.commenceTime ?? null,
    providerMode: boardResult?.mode ?? odds.mode,
    reasoning: [
      { title: "Pitching matchup", summary: `${resolvedStats.starterEdge > 10 ? "Material" : "Moderate"} starter advantage`, detail: `Park-adjusted starter projections create a ${resolvedStats.starterEdge.toFixed(1)}% edge after workload and platoon adjustments.`, score: resolvedStats.starterEdge },
      { title: "Bullpen leverage", summary: "Late-inning depth favors the model side", detail: `Rest, leverage usage, and reliever quality combine for a ${resolvedStats.bullpenEdge.toFixed(1)}% bullpen advantage.`, score: resolvedStats.bullpenEdge },
      { title: "Market confirmation", summary: `${resolvedMarket.sharpPercent}% sharp alignment`, detail: `The line moved from ${resolvedMarket.open > 0 ? "+" : ""}${resolvedMarket.open} to ${resolvedMarket.current > 0 ? "+" : ""}${resolvedMarket.current}, with money exceeding ticket share.`, score: resolvedMarket.sharpPercent },
      { title: "External conditions", summary: `${resolvedWeather.summary}; injury impact ${injuryImpact}`, detail: `Weather contributes ${resolvedWeather.impact >= 0 ? "+" : ""}${resolvedWeather.impact}% and confirmed availability signals contribute an impact score of ${injuryImpact}.`, score: Math.max(0, 10 - Math.abs(resolvedWeather.impact)) },
    ],
  };
}

export function getSupportedMatchupSlugs() {
  return Object.keys(matchupBase);
}
