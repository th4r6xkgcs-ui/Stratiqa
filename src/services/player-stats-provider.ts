import "server-only";

export type PlayerStatResult = {
  eventId: string;
  participant: string;
  marketKey: string;
  value: number | null;
  status: "pending" | "final" | "dnp" | "void";
  reason?: string;
  revision?: string;
};

export class ConfiguredPlayerStatsProvider {
  constructor(private readonly endpoint: string, private readonly apiKey: string) {}

  async getFinal(eventIds: string[]): Promise<PlayerStatResult[]> {
    if (!eventIds.length) return [];
    const url = new URL(this.endpoint);
    url.searchParams.set("eventIds", [...new Set(eventIds)].join(","));
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Player stats provider responded with ${response.status}`);
    const payload = await response.json() as { results?: PlayerStatResult[] } | PlayerStatResult[];
    const rows = Array.isArray(payload) ? payload : payload.results ?? [];
    return rows.filter((row) =>
      typeof row.eventId === "string" &&
      typeof row.participant === "string" &&
      typeof row.marketKey === "string" &&
      ["pending", "final", "dnp", "void"].includes(row.status),
    );
  }
}

const leagueBySportKey: Record<string, "MLB" | "NBA" | "NFL" | "NHL" | "WNBA"> = {
  baseball_mlb: "MLB",
  basketball_nba: "NBA",
  americanfootball_nfl: "NFL",
  icehockey_nhl: "NHL",
  basketball_wnba: "WNBA",
};

export function getPlayerStatsProvider(sportKey: string) {
  const league = leagueBySportKey[sportKey];
  if (!league) return null;
  const endpoint = process.env[`STRATIQA_PLAYER_STATS_${league}_URL`] ?? process.env.STRATIQA_PLAYER_STATS_URL;
  const apiKey = process.env[`STRATIQA_PLAYER_STATS_${league}_API_KEY`] ?? process.env.STRATIQA_PLAYER_STATS_API_KEY;
  return endpoint && apiKey ? new ConfiguredPlayerStatsProvider(endpoint, apiKey) : null;
}

export function configuredPlayerStatLeagues() {
  return Object.entries(leagueBySportKey)
    .filter(([sportKey]) => getPlayerStatsProvider(sportKey))
    .map(([, league]) => league);
}
