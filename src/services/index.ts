import "server-only";
import { MockInjuriesProvider } from "./injuries-provider";
import { MockLineMovementProvider } from "./line-movement-provider";
import { LiveOddsProvider, MockOddsProvider } from "./odds-provider";
import { MockPropsProvider } from "./props-provider";
import { MockStandingsProvider } from "./standings-provider";
import { MockStatsProvider } from "./stats-provider";
import { MockWeatherProvider } from "./weather-provider";
import { ResilientProvider } from "./runtime";
import { getProviderEnvironment } from "./environment";
import type { MatchupIntelligence, ProviderHealth } from "./types";
import { getMatchupCatalogEntry, matchupCatalog } from "@/lib/matchups/catalog";

const environment = getProviderEnvironment();
const oddsSource = environment.mode === "live"
  ? new LiveOddsProvider(process.env.STRATIQA_ODDS_API_KEY!)
  : new MockOddsProvider();

export const providers = {
  odds: new ResilientProvider("odds", oddsSource),
  weather: new ResilientProvider("weather", new MockWeatherProvider(), { ttlMs: 120_000, staleMs: 900_000, retries: 2 }),
  injuries: new ResilientProvider("injuries", new MockInjuriesProvider()),
  standings: new ResilientProvider("standings", new MockStandingsProvider(), { ttlMs: 300_000, staleMs: 1_800_000, retries: 2 }),
  stats: new ResilientProvider("stats", new MockStatsProvider(), { ttlMs: 120_000, staleMs: 900_000, retries: 2 }),
  props: new ResilientProvider("props", new MockPropsProvider()),
  lineMovement: new ResilientProvider("lineMovement", new MockLineMovementProvider()),
};

export async function getProviderHealth(): Promise<{ environment: ReturnType<typeof getProviderEnvironment>; providers: ProviderHealth[] }> {
  await Promise.allSettled(Object.values(providers).map((provider) => provider.getData()));
  return { environment: getProviderEnvironment(), providers: Object.values(providers).map((provider) => provider.getHealth()) };
}

export async function getPropsBoard() {
  return providers.props.getData();
}

export async function getMatchupIntelligence(slug: string): Promise<MatchupIntelligence | null> {
  const base = getMatchupCatalogEntry(slug);
  if (!base) return null;
  const [odds, weather, injuries, stats, market] = await Promise.all([
    providers.odds.getData(), providers.weather.getData(), providers.injuries.getData(),
    providers.stats.getData(), providers.lineMovement.getData(),
  ]);
  const quote = odds.data.find((item) => item.matchupId === slug);
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
    id: slug, away: base.away, awayAbbr: base.awayAbbr, home: base.home, homeAbbr: base.homeAbbr,
    startTime: base.startTime, pick: base.pick, aiSummary: base.aiSummary, winProbability: base.winProbability,
    modelEdge: base.modelEdge, expectedValue: base.expectedValue, confidence: base.confidence, valueGrade: base.valueGrade,
    injuryImpact, weatherImpact: resolvedWeather.impact,
    bullpenEdge: resolvedStats.bullpenEdge, startingPitchingEdge: resolvedStats.starterEdge,
    recentForm: resolvedStats.recentForm, bestSportsbook: resolvedQuote.bestBook,
    alternateLines: resolvedQuote.quotes, market: resolvedMarket,
    reasoning: [
      { title: "Pitching matchup", summary: `${resolvedStats.starterEdge > 10 ? "Material" : "Moderate"} starter advantage`, detail: `Park-adjusted starter projections create a ${resolvedStats.starterEdge.toFixed(1)}% edge after workload and platoon adjustments.`, score: resolvedStats.starterEdge },
      { title: "Bullpen leverage", summary: "Late-inning depth favors the model side", detail: `Rest, leverage usage, and reliever quality combine for a ${resolvedStats.bullpenEdge.toFixed(1)}% bullpen advantage.`, score: resolvedStats.bullpenEdge },
      { title: "Market confirmation", summary: `${resolvedMarket.sharpPercent}% sharp alignment`, detail: `The line moved from ${resolvedMarket.open > 0 ? "+" : ""}${resolvedMarket.open} to ${resolvedMarket.current > 0 ? "+" : ""}${resolvedMarket.current}, with money exceeding ticket share.`, score: resolvedMarket.sharpPercent },
      { title: "External conditions", summary: `${resolvedWeather.summary}; injury impact ${injuryImpact}`, detail: `Weather contributes ${resolvedWeather.impact >= 0 ? "+" : ""}${resolvedWeather.impact}% and confirmed availability signals contribute an impact score of ${injuryImpact}.`, score: Math.max(0, 10 - Math.abs(resolvedWeather.impact)) },
    ],
  };
}

export function getSupportedMatchupSlugs() {
  return matchupCatalog.map((matchup) => matchup.id);
}
