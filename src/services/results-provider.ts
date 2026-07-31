import "server-only";

export type CompletedScore = {
  eventId: string;
  sportKey: string;
  completed: boolean;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
};

const scoreCache = new Map<string, { expiresAt: number; data: CompletedScore[] }>();
const scoreCacheMs = 90_000;

type ExternalScore = {
  id: string;
  sport_key: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: Array<{ name: string; score: string }> | null;
};

const espnLeagues: Record<string, string> = {
  baseball_mlb: "baseball/mlb", basketball_nba: "basketball/nba", basketball_wnba: "basketball/wnba",
  americanfootball_nfl: "football/nfl", icehockey_nhl: "hockey/nhl",
};
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
type EspnEvent = { competitions?: Array<{ competitors?: Array<{ homeAway?: "home" | "away"; team?: { displayName?: string }; score?: string }> }> };

export class LiveResultsProvider {
  constructor(private readonly apiKey: string) {}

  async getScores(sportKey: string, eventIds: string[] = []): Promise<CompletedScore[]> {
    const cached = scoreCache.get(sportKey);
    if (cached && cached.expiresAt > Date.now()) {
      return eventIds.length ? cached.data.filter((score) => eventIds.includes(score.eventId)) : cached.data;
    }
    const url = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/scores`);
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("daysFrom", "3");
    url.searchParams.set("dateFormat", "iso");
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`Results provider responded with ${response.status}`);
    const parseScore = (value: string | undefined) => value === undefined || !Number.isFinite(Number(value)) ? null : Number(value);
    const data = (await response.json() as ExternalScore[]).map((event) => ({
      eventId: event.id,
      sportKey: event.sport_key,
      completed: event.completed,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      homeScore: parseScore(event.scores?.find((score) => score.name === event.home_team)?.score),
      awayScore: parseScore(event.scores?.find((score) => score.name === event.away_team)?.score),
    }));
    scoreCache.set(sportKey, { expiresAt: Date.now() + scoreCacheMs, data });
    return eventIds.length ? data.filter((score) => eventIds.includes(score.eventId)) : data;
  }

  async getCompleted(sportKey: string, eventIds: string[] = []): Promise<CompletedScore[]> {
    return this.getScores(sportKey, eventIds);
  }

  async getHistoricalByMatchup(sportKey: string, eventCommenceAt: string | null, eventName: string): Promise<CompletedScore | null> {
    const league = espnLeagues[sportKey];
    if (!league || !eventCommenceAt) return null;
    const date = new Date(eventCommenceAt);
    if (Number.isNaN(date.getTime())) return null;
    const target = normalize(eventName);
    const candidates = [date, new Date(date.getTime() - 86_400_000)];
    for (const candidate of candidates) {
      const dateKey = `${candidate.getUTCFullYear()}${String(candidate.getUTCMonth() + 1).padStart(2, "0")}${String(candidate.getUTCDate()).padStart(2, "0")}`;
      const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${league}/scoreboard?dates=${dateKey}&limit=500`, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
      if (!response.ok) continue;
      const data = await response.json() as { events?: EspnEvent[] };
      for (const event of data.events ?? []) {
      const competitors = event.competitions?.[0]?.competitors ?? [];
      const home = competitors.find((item) => item.homeAway === "home");
      const away = competitors.find((item) => item.homeAway === "away");
      const homeTeam = home?.team?.displayName ?? "";
      const awayTeam = away?.team?.displayName ?? "";
      if (!homeTeam || !awayTeam || !target.includes(normalize(homeTeam)) || !target.includes(normalize(awayTeam))) continue;
      const homeScore = Number(home?.score); const awayScore = Number(away?.score);
      if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) continue;
        return { eventId: `espn:${dateKey}:${normalize(homeTeam)}:${normalize(awayTeam)}`, sportKey, completed: true, homeTeam, awayTeam, homeScore, awayScore };
      }
    }
    return null;
  }
}
