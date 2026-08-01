"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Bell, CalendarClock, Check, ChevronDown, Clock3, Heart, MessageCircle, Radio, RefreshCw, ShieldCheck, Target, Trophy } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import { GameRoom } from "@/components/games/game-room";
import { LeagueScoreboard } from "@/components/games/league-scoreboard";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { updateGameTimelines } from "@/lib/games/timeline.js";
import { livePickProgress } from "@/lib/picks/live-progress.js";

type PickState = "upcoming" | "live" | "awaiting" | "settled";
type LivePick = {
  pickId: string; eventId: string | null; sportKey: string | null; eventName: string; selection: string;
  marketKey: string | null; outcomeName: string | null; linePoint: number | null; participantName: string | null;
  pickCardId: string | null; providerStatValue: number | null; settlementReason: string | null;
  confidence: number; americanOdds: number; eventCommenceAt: string | null; result: string; state: PickState;
  completed: boolean; homeTeam: string | null; awayTeam: string | null; homeScore: number | null; awayScore: number | null;
};
type LivePayload = { picks: LivePick[]; updatedAt: string; refreshAfterSeconds: number; provider: string; unavailableSports: string[] };
type Game = { id: string; eventName: string; sportKey: string | null; state: PickState; startsAt: string | null; homeTeam: string | null; awayTeam: string | null; homeScore: number | null; awayScore: number | null; picks: LivePick[] };
type TimelineEntry = { signature: string; label: string; state: PickState; at: string };

const leagues: Record<string, string> = { baseball_mlb: "MLB", basketball_nba: "NBA", americanfootball_nfl: "NFL", icehockey_nhl: "NHL", basketball_wnba: "WNBA" };
const stateOrder: Record<PickState, number> = { live: 0, upcoming: 1, awaiting: 2, settled: 3 };
const price = (value: number) => `${value > 0 ? "+" : ""}${value}`;

function groupGames(picks: LivePick[]): Game[] {
  const grouped = new Map<string, LivePick[]>();
  for (const pick of picks) {
    const key = pick.eventId ?? `${pick.sportKey}:${pick.eventName}:${pick.eventCommenceAt}`;
    grouped.set(key, [...(grouped.get(key) ?? []), pick]);
  }
  return [...grouped].map(([id, eventPicks]) => {
    const first = eventPicks[0];
    const state = [...eventPicks].sort((a, b) => stateOrder[a.state] - stateOrder[b.state])[0].state;
    return { id, eventName: first.eventName, sportKey: first.sportKey, state, startsAt: first.eventCommenceAt, homeTeam: first.homeTeam, awayTeam: first.awayTeam, homeScore: first.homeScore, awayScore: first.awayScore, picks: eventPicks };
  }).sort((a, b) => stateOrder[a.state] - stateOrder[b.state] || Date.parse(a.startsAt ?? "") - Date.parse(b.startsAt ?? ""));
}

function StateBadge({ state }: { state: PickState }) {
  if (state === "live") return <Badge tone="success"><Radio /> LIVE</Badge>;
  if (state === "upcoming") return <Badge tone="accent"><Clock3 /> UPCOMING</Badge>;
  if (state === "awaiting") return <Badge tone="warning"><RefreshCw /> FINALIZING</Badge>;
  return <Badge tone="neutral"><Check /> SETTLED</Badge>;
}

function ScoreFlow({ game, entries }: { game: Game; entries: TimelineEntry[] }) {
  const readings = [...entries].reverse().map((entry) => {
    const [, away, home] = entry.signature.split(":");
    const awayScore = Number(away); const homeScore = Number(home);
    return Number.isFinite(awayScore) && Number.isFinite(homeScore) ? { awayScore, homeScore, at: entry.at } : null;
  }).filter((item): item is { awayScore: number; homeScore: number; at: string } => Boolean(item));
  if (game.awayScore != null && game.homeScore != null && !readings.some((item) => item.awayScore === game.awayScore && item.homeScore === game.homeScore)) readings.push({ awayScore: game.awayScore, homeScore: game.homeScore, at: new Date().toISOString() });
  if (readings.length < 2) return <div className="score-flow-empty"><Activity /><span><strong>Score flow starts with the next update</strong><small>This chart uses official score snapshots, not individual play-by-play.</small></span></div>;
  const leads = readings.map((item) => item.homeScore - item.awayScore);
  const range = Math.max(1, ...leads.map((value) => Math.abs(value)));
  const points = leads.map((lead, index) => `${index / Math.max(1, leads.length - 1) * 100},${20 - lead / range * 16}`).join(" ");
  const current = leads.at(-1) ?? 0;
  return <section className="score-flow"><header><span><Activity /> Observed score flow</span><small>{current === 0 ? "Tied" : `${current > 0 ? game.homeTeam ?? "Home" : game.awayTeam ?? "Away"} ahead ${Math.abs(current)}`}</small></header><div><span>{game.awayTeam ?? "Away"}</span><svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-label="Observed score flow"><line x1="0" x2="100" y1="20" y2="20" /><polyline points={points} /></svg><span>{game.homeTeam ?? "Home"}</span></div><footer>Official score updates only · not individual play-by-play</footer></section>;
}

export function GameCenter() {
  const [payload, setPayload] = useState<LivePayload>({ picks: [], updatedAt: "", refreshAfterSeconds: 0, provider: "schedule", unavailableSports: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<"picks" | "watch">("picks");
  const [filter, setFilter] = useState<"all" | PickState>("all");
  const [sport, setSport] = useState("all");
  const [favorites, setFavorites] = usePersistentState<string[]>("stratiqa.game-center.favorites.v1", []);
  const [alerts, setAlerts] = usePersistentState<string[]>("stratiqa.game-center.alerts.v1", []);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [openRooms, setOpenRooms] = useState<string[]>([]);
  const [timelines, setTimelines] = useState<Record<string, TimelineEntry[]>>({});
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(() => typeof Notification === "undefined" ? "unsupported" : Notification.permission);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const response = await fetch("/api/picks/live", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 401 ? "Sign in to see games connected to your locked picks." : data.error ?? "Game tracking is temporarily unavailable.");
      const timelineKey = "stratiqa.game-center.timelines.v1";
      let current: Record<string, TimelineEntry[]> = {};
      try { current = JSON.parse(localStorage.getItem(timelineKey) ?? "{}"); } catch { localStorage.removeItem(timelineKey); }
      const observed = updateGameTimelines(current, data.picks ?? [], data.updatedAt ?? new Date().toISOString());
      localStorage.setItem(timelineKey, JSON.stringify(observed.timelines));
      setTimelines(observed.timelines);
      if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") {
        const enabled = JSON.parse(localStorage.getItem("stratiqa.game-center.alerts.v1") ?? "[]") as string[];
        for (const change of observed.changed.filter((item: { id: string }) => enabled.includes(item.id))) new Notification(change.eventName, { body: change.label, tag: `stratiqa-${change.id}`, silent: true });
      }
      setPayload(data);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Game tracking is temporarily unavailable.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => load(true), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (!payload.refreshAfterSeconds) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load(true);
    }, payload.refreshAfterSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [load, payload.refreshAfterSeconds]);

  const games = useMemo(() => groupGames(payload.picks), [payload.picks]);
  const sports = useMemo(() => [...new Set(games.map((game) => game.sportKey).filter(Boolean))] as string[], [games]);
  const visible = games.filter((game) => (filter === "all" || game.state === filter) && (sport === "all" || game.sportKey === sport)).sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)));
  const counts = { live: games.filter((game) => game.state === "live").length, upcoming: games.filter((game) => game.state === "upcoming").length, settled: games.filter((game) => game.state === "settled").length };
  const cardProgress = useMemo(() => {
    const cards = new Map<string, LivePick[]>();
    for (const pick of payload.picks) if (pick.pickCardId) cards.set(pick.pickCardId, [...(cards.get(pick.pickCardId) ?? []), pick]);
    return cards;
  }, [payload.picks]);
  async function enableBrowserAlerts() {
    if (typeof Notification === "undefined") return setNotificationPermission("unsupported");
    setNotificationPermission(await Notification.requestPermission());
  }

  return <div className="page game-center-page">
    <header className="page-header game-center-hero">
      <div><Badge tone="accent"><Activity /> LIVE GAME CENTER</Badge><h1>Every game. Your picks. One place.</h1><p>Browse public scores, then follow every decision you locked before game time. Betting stays closed once play begins.</p></div>
      <div className="game-center-summary"><span><i className="live" />{counts.live}<small>Live</small></span><span>{counts.upcoming}<small>Upcoming</small></span><span>{payload.picks.length}<small>Tracked picks</small></span></div>
    </header>

    <section className="game-center-view-switch" aria-label="Game Center view"><button type="button" className={view === "picks" ? "active" : ""} onClick={() => setView("picks")}><Target /> My locked picks <b>{payload.picks.length}</b></button><button type="button" className={view === "watch" ? "active" : ""} onClick={() => setView("watch")}><Activity /> Watch every game</button></section>

    {view === "watch" ? <LeagueScoreboard /> : <>
    <section className="game-center-toolbar">
      <nav>{(["all", "live", "upcoming", "awaiting", "settled"] as const).map((item) => <button type="button" className={filter === item ? "active" : ""} onClick={() => setFilter(item)} key={item}>{item === "all" ? "My Games" : item}</button>)}</nav>
      <div><select aria-label="Filter by league" value={sport} onChange={(event) => setSport(event.target.value)}><option value="all">All leagues</option>{sports.map((key) => <option value={key} key={key}>{leagues[key] ?? key}</option>)}</select>{notificationPermission === "default" ? <button type="button" onClick={enableBrowserAlerts}><Bell /> Enable alerts</button> : null}<button type="button" disabled={refreshing} onClick={() => load()}><RefreshCw className={refreshing ? "spinning" : ""} /> Refresh</button></div>
    </section>

    {loading ? <section className="game-center-loading">{[1, 2, 3].map((item) => <i key={item} />)}</section> :
      error ? <Card className="game-center-empty"><ShieldCheck /><h2>Game Center is safe</h2><p>{error}</p><Link href="/account">Open account</Link></Card> :
      visible.length ? <section className="game-list">{visible.map((game) => <Card className={`tracked-game ${game.state}`} key={game.id}>
        <header><div><StateBadge state={game.state} /><span>{game.sportKey ? leagues[game.sportKey] ?? game.sportKey : "SPORT"} · {game.picks.length} pick{game.picks.length === 1 ? "" : "s"}</span></div><div className="tracked-game-actions"><time>{game.state === "upcoming" && game.startsAt ? `Starts ${new Date(game.startsAt).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}` : game.state === "live" ? "Score updates automatically" : game.state === "awaiting" ? "Awaiting official confirmation" : "Official result recorded"}</time><button type="button" className={alerts.includes(game.id) ? "active" : ""} onClick={() => setAlerts(alerts.includes(game.id) ? alerts.filter((id) => id !== game.id) : [...alerts, game.id])} aria-label={`${alerts.includes(game.id) ? "Disable" : "Enable"} alerts for ${game.eventName}`}><Bell /></button><button type="button" className={favorites.includes(game.id) ? "active" : ""} onClick={() => setFavorites(favorites.includes(game.id) ? favorites.filter((id) => id !== game.id) : [...favorites, game.id])} aria-label={`${favorites.includes(game.id) ? "Remove" : "Add"} favorite ${game.eventName}`}><Heart fill={favorites.includes(game.id) ? "currentColor" : "none"} /></button></div></header>
        <div className="tracked-score">
          {game.awayTeam && game.homeTeam ? <><span><small>AWAY</small><strong>{game.awayTeam}</strong></span><b>{game.awayScore ?? "–"}<em>:</em>{game.homeScore ?? "–"}</b><span><small>HOME</small><strong>{game.homeTeam}</strong></span></> : <><span><small>EVENT</small><strong>{game.eventName}</strong></span><b><CalendarClock /></b><span><small>STATUS</small><strong>{game.state === "upcoming" ? "Scheduled" : "Score pending"}</strong></span></>}
        </div>
        <div className="tracked-picks">{game.picks.map((pick) => {
          const progress = livePickProgress(pick, game);
          const card = pick.pickCardId ? cardProgress.get(pick.pickCardId) ?? [] : [];
          const cardSettled = card.filter((leg) => leg.result !== "pending").length;
          return <article key={pick.pickId}><i className={pick.state === "settled" ? pick.result : progress.tone}>{pick.state === "settled" ? pick.result.slice(0, 1).toUpperCase() : <Target />}</i><span><small>{pick.participantName ? "PLAYER PROP" : pick.marketKey?.replace("h2h", "MONEYLINE") ?? "LOCKED PICK"}{card.length > 1 ? ` · PARLAY ${cardSettled}/${card.length} FINAL` : ""}</small><strong>{pick.selection}</strong><em>{price(pick.americanOdds)} · {pick.confidence}% confidence{pick.providerStatValue != null ? ` · official value ${pick.providerStatValue}` : ""}</em></span><div className={pick.state === "settled" ? pick.result : progress.tone}><strong>{pick.state === "settled" ? pick.result.toUpperCase() : progress.label}</strong><small>{pick.state === "settled" ? pick.settlementReason ?? "Counted toward your rating" : pick.participantName ? "Official player progress appears when supported." : progress.detail}</small></div></article>;
        })}</div>
        {expanded.includes(game.id) ? <section className="game-intelligence"><div><ScoreFlow game={game} entries={timelines[game.id] ?? []} /><strong>Observed timeline</strong>{(timelines[game.id] ?? []).length ? <ol>{(timelines[game.id] ?? []).map((entry) => <li key={`${entry.signature}-${entry.at}`}><i className={entry.state} /><span>{entry.label}<small>{new Date(entry.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small></span></li>)}</ol> : <p>Timeline begins when the official feed reports a change.</p>}</div><div><strong>Data coverage</strong><dl><span><dt>Score</dt><dd>{game.homeScore != null || game.awayScore != null ? "Official feed" : "Waiting"}</dd></span><span><dt>Prop stats</dt><dd>{game.picks.some((pick) => pick.providerStatValue != null) ? "Official values" : "After final when supported"}</dd></span><span><dt>Team details</dt><dd>Provider upgrade required</dd></span><span><dt>Settlement</dt><dd>Automatic only</dd></span></dl></div></section> : null}
        <footer><span><ShieldCheck /> Locked before game time · watch only</span><button type="button" onClick={() => setExpanded(expanded.includes(game.id) ? expanded.filter((id) => id !== game.id) : [...expanded, game.id])}>Game intelligence <ChevronDown className={expanded.includes(game.id) ? "open" : ""} /></button><button type="button" onClick={() => setOpenRooms(openRooms.includes(game.id) ? openRooms.filter((id) => id !== game.id) : [...openRooms, game.id])}>Game room <MessageCircle /></button><Link href="/picks">Full performance <Trophy /></Link></footer>
        {openRooms.includes(game.id) ? <GameRoom eventId={game.id} eventName={game.eventName} /> : null}
      </Card>)}</section> :
      <Card className="game-center-empty"><Target /><h2>{games.length ? "No games match these filters" : "Your Game Center is ready"}</h2><p>{games.length ? "Choose another status or league to see your tracked games." : "Lock a pregame pick and its game will automatically appear here. No extra tracking setup is needed."}</p><Link href={games.length ? "/games" : "/matchups"}>{games.length ? "Show all games" : "Find a pregame pick"}</Link></Card>}
    </>}

    <footer className="game-center-freshness"><span><ShieldCheck /> {payload.provider === "live" ? "Official score feed" : "Schedule tracking"} · refresh pauses when this tab is hidden</span><span>{payload.updatedAt ? `Checked ${new Date(payload.updatedAt).toLocaleTimeString()}` : ""}{payload.refreshAfterSeconds ? ` · next check in about ${payload.refreshAfterSeconds}s` : ""}</span></footer>
  </div>;
}
