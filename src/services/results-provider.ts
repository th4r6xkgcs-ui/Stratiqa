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
}
