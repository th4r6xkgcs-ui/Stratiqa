import "server-only";

export const scoreboardSports = ["baseball_mlb", "basketball_nba", "americanfootball_nfl", "icehockey_nhl", "basketball_wnba"] as const;
export type ScoreboardSport = typeof scoreboardSports[number];
export type ScoreboardEvent = { id: string; sportKey: ScoreboardSport; eventName: string; commenceTime: string; awayTeam: string; homeTeam: string; awayScore: number | null; homeScore: number | null; state: "pre" | "in" | "post"; status: string };

const leagues: Record<ScoreboardSport, string> = { baseball_mlb: "baseball/mlb", basketball_nba: "basketball/nba", americanfootball_nfl: "football/nfl", icehockey_nhl: "hockey/nhl", basketball_wnba: "basketball/wnba" };
const cache = new Map<ScoreboardSport, { expiresAt: number; events: ScoreboardEvent[] }>();

type EspnCompetitor = { homeAway?: "home" | "away"; team?: { displayName?: string; shortDisplayName?: string }; score?: string };
type EspnEvent = { id?: string; name?: string; date?: string; status?: { type?: { state?: string; detail?: string; shortDetail?: string } }; competitions?: Array<{ competitors?: EspnCompetitor[] }> };

export async function getScoreboard(sportKey: ScoreboardSport): Promise<ScoreboardEvent[]> {
  const cached = cache.get(sportKey);
  if (cached && cached.expiresAt > Date.now()) return cached.events;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${leagues[sportKey]}/scoreboard?limit=500`, { signal: controller.signal, next: { revalidate: 30 } });
    if (!response.ok) throw new Error(`Scoreboard returned ${response.status}`);
    const payload = await response.json() as { events?: EspnEvent[] };
    const events = (payload.events ?? []).flatMap((event): ScoreboardEvent[] => {
      const competitors = event.competitions?.[0]?.competitors ?? [];
      const away = competitors.find((item) => item.homeAway === "away"); const home = competitors.find((item) => item.homeAway === "home");
      if (!event.id || !away?.team?.displayName || !home?.team?.displayName) return [];
      const state = event.status?.type?.state === "in" ? "in" : event.status?.type?.state === "post" ? "post" : "pre";
      return [{ id: event.id, sportKey, eventName: event.name ?? `${away.team.displayName} at ${home.team.displayName}`, commenceTime: event.date ?? new Date().toISOString(), awayTeam: away.team.displayName, homeTeam: home.team.displayName, awayScore: Number.isFinite(Number(away.score)) ? Number(away.score) : null, homeScore: Number.isFinite(Number(home.score)) ? Number(home.score) : null, state, status: event.status?.type?.shortDetail ?? event.status?.type?.detail ?? (state === "pre" ? "Scheduled" : state === "in" ? "Live" : "Final") }];
    });
    cache.set(sportKey, { events, expiresAt: Date.now() + 25_000 });
    return events;
  } finally { clearTimeout(timeout); }
}
