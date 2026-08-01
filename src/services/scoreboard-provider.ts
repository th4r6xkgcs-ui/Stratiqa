import "server-only";

export const scoreboardSports = ["baseball_mlb", "basketball_nba", "americanfootball_nfl", "icehockey_nhl", "basketball_wnba"] as const;
export type ScoreboardSport = typeof scoreboardSports[number];
export type ScoreboardEvent = { id: string; sportKey: ScoreboardSport; eventName: string; commenceTime: string; awayTeam: string; homeTeam: string; awayScore: number | null; homeScore: number | null; state: "pre" | "in" | "post"; status: string };

const leagues: Record<ScoreboardSport, string> = { baseball_mlb: "baseball/mlb", basketball_nba: "basketball/nba", americanfootball_nfl: "football/nfl", icehockey_nhl: "hockey/nhl", basketball_wnba: "basketball/wnba" };
const cache = new Map<ScoreboardSport, { expiresAt: number; events: ScoreboardEvent[] }>();
const ballDontLieSports: Partial<Record<ScoreboardSport, "mlb" | "nba" | "nfl">> = { baseball_mlb: "mlb", basketball_nba: "nba", americanfootball_nfl: "nfl" };

type EspnCompetitor = { homeAway?: "home" | "away"; team?: { displayName?: string; shortDisplayName?: string }; score?: string };
type EspnEvent = { id?: string; name?: string; date?: string; status?: { type?: { state?: string; detail?: string; shortDetail?: string } }; competitions?: Array<{ competitors?: EspnCompetitor[] }> };
type BallDontLieTeam = { full_name?: string; name?: string; abbreviation?: string };
type BallDontLieGame = { id?: number | string; date?: string; status?: string; home_team?: BallDontLieTeam; visitor_team?: BallDontLieTeam; away_team?: BallDontLieTeam; home_team_score?: number | null; visitor_team_score?: number | null; away_team_score?: number | null };

function gameState(status: string | undefined): ScoreboardEvent["state"] {
  const value = (status ?? "").toLowerCase();
  if (/(final|finished|complete)/.test(value)) return "post";
  if (/(scheduled|pre|pm|am|tbd|postponed)/.test(value) || !value) return "pre";
  return "in";
}

async function getBallDontLieScoreboard(sportKey: ScoreboardSport, date?: string) {
  const sport = ballDontLieSports[sportKey], apiKey = process.env.STRATIQA_BALLDONTLIE_API_KEY;
  if (!sport || !apiKey) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_500);
  try {
    const targetDate = date ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}` : new Date().toISOString().slice(0, 10);
    const response = await fetch(`https://api.balldontlie.io/${sport}/v1/games?dates[]=${targetDate}&per_page=100`, { headers: { Authorization: apiKey, Accept: "application/json" }, signal: controller.signal, next: { revalidate: 120 } });
    if (!response.ok) throw new Error(`BALLDONTLIE returned ${response.status}`);
    const payload = await response.json() as { data?: BallDontLieGame[] };
    return (payload.data ?? []).flatMap((game): ScoreboardEvent[] => {
      const away = game.visitor_team ?? game.away_team, home = game.home_team;
      if (game.id == null || !away || !home) return [];
      const state = gameState(game.status);
      const awayName = away.full_name ?? away.name ?? away.abbreviation;
      const homeName = home.full_name ?? home.name ?? home.abbreviation;
      if (!awayName || !homeName) return [];
      return [{ id: `bdl:${game.id}`, sportKey, eventName: `${awayName} at ${homeName}`, commenceTime: game.date ?? new Date().toISOString(), awayTeam: awayName, homeTeam: homeName, awayScore: typeof (game.visitor_team_score ?? game.away_team_score) === "number" ? (game.visitor_team_score ?? game.away_team_score ?? null) : null, homeScore: typeof game.home_team_score === "number" ? game.home_team_score : null, state, status: game.status ?? (state === "pre" ? "Scheduled" : state === "in" ? "Live" : "Final") }];
    });
  } finally { clearTimeout(timeout); }
}

export async function getScoreboard(sportKey: ScoreboardSport, date?: string): Promise<ScoreboardEvent[]> {
  const cacheKey = `${sportKey}:${date ?? "today"}` as ScoreboardSport;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.events;
  try {
    const ballDontLie = await getBallDontLieScoreboard(sportKey, date);
    if (ballDontLie) {
      cache.set(cacheKey, { events: ballDontLie, expiresAt: Date.now() + 120_000 });
      return ballDontLie;
    }
  } catch { /* ESPN remains the resilient public fallback. */ }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const dateParam = date ? `&dates=${date}` : "";
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${leagues[sportKey]}/scoreboard?limit=500${dateParam}`, { signal: controller.signal, next: { revalidate: 30 } });
    if (!response.ok) throw new Error(`Scoreboard returned ${response.status}`);
    const payload = await response.json() as { events?: EspnEvent[] };
    const events = (payload.events ?? []).flatMap((event): ScoreboardEvent[] => {
      const competitors = event.competitions?.[0]?.competitors ?? [];
      const away = competitors.find((item) => item.homeAway === "away"); const home = competitors.find((item) => item.homeAway === "home");
      if (!event.id || !away?.team?.displayName || !home?.team?.displayName) return [];
      const state = event.status?.type?.state === "in" ? "in" : event.status?.type?.state === "post" ? "post" : "pre";
      return [{ id: event.id, sportKey, eventName: event.name ?? `${away.team.displayName} at ${home.team.displayName}`, commenceTime: event.date ?? new Date().toISOString(), awayTeam: away.team.displayName, homeTeam: home.team.displayName, awayScore: Number.isFinite(Number(away.score)) ? Number(away.score) : null, homeScore: Number.isFinite(Number(home.score)) ? Number(home.score) : null, state, status: event.status?.type?.shortDetail ?? event.status?.type?.detail ?? (state === "pre" ? "Scheduled" : state === "in" ? "Live" : "Final") }];
    });
    cache.set(cacheKey, { events, expiresAt: Date.now() + 25_000 });
    return events;
  } finally { clearTimeout(timeout); }
}
