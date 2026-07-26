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

  async getCompleted(sportKey: string, eventIds: string[] = []): Promise<CompletedScore[]> {
    const url = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/scores`);
    url.searchParams.set("apiKey", this.apiKey);
    url.searchParams.set("daysFrom", "3");
    url.searchParams.set("dateFormat", "iso");
    if (eventIds.length) url.searchParams.set("eventIds", eventIds.join(","));
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`Results provider responded with ${response.status}`);
    const parseScore = (value: string | undefined) => value === undefined || !Number.isFinite(Number(value)) ? null : Number(value);
    return (await response.json() as ExternalScore[]).map((event) => ({
      eventId: event.id,
      sportKey: event.sport_key,
      completed: event.completed,
      homeTeam: event.home_team,
      awayTeam: event.away_team,
      homeScore: parseScore(event.scores?.find((score) => score.name === event.home_team)?.score),
      awayScore: parseScore(event.scores?.find((score) => score.name === event.away_team)?.score),
    }));
  }
}
