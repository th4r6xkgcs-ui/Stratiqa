"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, CalendarClock, Check, Clock3, Radio, RefreshCw, ShieldCheck, Target, Trophy } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import { livePickProgress } from "@/lib/picks/live-progress.js";

type PickState = "upcoming" | "live" | "awaiting" | "settled";
type LivePick = {
  pickId: string; eventId: string | null; sportKey: string | null; eventName: string; selection: string;
  marketKey: string | null; outcomeName: string | null; linePoint: number | null; participantName: string | null;
  confidence: number; americanOdds: number; eventCommenceAt: string | null; result: string; state: PickState;
  completed: boolean; homeTeam: string | null; awayTeam: string | null; homeScore: number | null; awayScore: number | null;
};
type LivePayload = { picks: LivePick[]; updatedAt: string; refreshAfterSeconds: number; provider: string; unavailableSports: string[] };
type Game = { id: string; eventName: string; sportKey: string | null; state: PickState; startsAt: string | null; homeTeam: string | null; awayTeam: string | null; homeScore: number | null; awayScore: number | null; picks: LivePick[] };

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

export function GameCenter() {
  const [payload, setPayload] = useState<LivePayload>({ picks: [], updatedAt: "", refreshAfterSeconds: 0, provider: "schedule", unavailableSports: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | PickState>("all");
  const [sport, setSport] = useState("all");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const response = await fetch("/api/picks/live", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 401 ? "Sign in to see games connected to your locked picks." : data.error ?? "Game tracking is temporarily unavailable.");
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
  const visible = games.filter((game) => (filter === "all" || game.state === filter) && (sport === "all" || game.sportKey === sport));
  const counts = { live: games.filter((game) => game.state === "live").length, upcoming: games.filter((game) => game.state === "upcoming").length, settled: games.filter((game) => game.state === "settled").length };

  return <div className="page game-center-page">
    <header className="page-header game-center-hero">
      <div><Badge tone="accent"><Activity /> LIVE GAME CENTER</Badge><h1>Your picks. One place. All game.</h1><p>Follow every decision you locked before game time. Scores update automatically; betting stays closed once play begins.</p></div>
      <div className="game-center-summary"><span><i className="live" />{counts.live}<small>Live</small></span><span>{counts.upcoming}<small>Upcoming</small></span><span>{payload.picks.length}<small>Tracked picks</small></span></div>
    </header>

    <section className="game-center-toolbar">
      <nav>{(["all", "live", "upcoming", "awaiting", "settled"] as const).map((item) => <button type="button" className={filter === item ? "active" : ""} onClick={() => setFilter(item)} key={item}>{item === "all" ? "My Games" : item}</button>)}</nav>
      <div><select aria-label="Filter by league" value={sport} onChange={(event) => setSport(event.target.value)}><option value="all">All leagues</option>{sports.map((key) => <option value={key} key={key}>{leagues[key] ?? key}</option>)}</select><button type="button" disabled={refreshing} onClick={() => load()}><RefreshCw className={refreshing ? "spinning" : ""} /> Refresh</button></div>
    </section>

    {loading ? <section className="game-center-loading">{[1, 2, 3].map((item) => <i key={item} />)}</section> :
      error ? <Card className="game-center-empty"><ShieldCheck /><h2>Game Center is safe</h2><p>{error}</p><Link href="/account">Open account</Link></Card> :
      visible.length ? <section className="game-list">{visible.map((game) => <Card className={`tracked-game ${game.state}`} key={game.id}>
        <header><div><StateBadge state={game.state} /><span>{game.sportKey ? leagues[game.sportKey] ?? game.sportKey : "SPORT"} · {game.picks.length} pick{game.picks.length === 1 ? "" : "s"}</span></div><time>{game.state === "upcoming" && game.startsAt ? `Starts ${new Date(game.startsAt).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}` : game.state === "live" ? "Score updates automatically" : game.state === "awaiting" ? "Awaiting official confirmation" : "Official result recorded"}</time></header>
        <div className="tracked-score">
          {game.awayTeam && game.homeTeam ? <><span><small>AWAY</small><strong>{game.awayTeam}</strong></span><b>{game.awayScore ?? "–"}<em>:</em>{game.homeScore ?? "–"}</b><span><small>HOME</small><strong>{game.homeTeam}</strong></span></> : <><span><small>EVENT</small><strong>{game.eventName}</strong></span><b><CalendarClock /></b><span><small>STATUS</small><strong>{game.state === "upcoming" ? "Scheduled" : "Score pending"}</strong></span></>}
        </div>
        <div className="tracked-picks">{game.picks.map((pick) => {
          const progress = livePickProgress(pick, game);
          return <article key={pick.pickId}><i className={pick.state === "settled" ? pick.result : progress.tone}>{pick.state === "settled" ? pick.result.slice(0, 1).toUpperCase() : <Target />}</i><span><small>{pick.participantName ? "PLAYER PROP" : pick.marketKey?.replace("h2h", "MONEYLINE") ?? "LOCKED PICK"}</small><strong>{pick.selection}</strong><em>{price(pick.americanOdds)} · {pick.confidence}% confidence</em></span><div className={pick.state === "settled" ? pick.result : progress.tone}><strong>{pick.state === "settled" ? pick.result.toUpperCase() : progress.label}</strong><small>{pick.state === "settled" ? "Counted toward your rating" : progress.detail}</small></div></article>;
        })}</div>
        <footer><span><ShieldCheck /> Locked before game time · watch only</span><Link href="/picks">Full performance <Trophy /></Link></footer>
      </Card>)}</section> :
      <Card className="game-center-empty"><Target /><h2>{games.length ? "No games match these filters" : "Your Game Center is ready"}</h2><p>{games.length ? "Choose another status or league to see your tracked games." : "Lock a pregame pick and its game will automatically appear here. No extra tracking setup is needed."}</p><Link href={games.length ? "/games" : "/matchups"}>{games.length ? "Show all games" : "Find a pregame pick"}</Link></Card>}

    <footer className="game-center-freshness"><span><ShieldCheck /> {payload.provider === "live" ? "Official score feed" : "Schedule tracking"} · refresh pauses when this tab is hidden</span><span>{payload.updatedAt ? `Checked ${new Date(payload.updatedAt).toLocaleTimeString()}` : ""}{payload.refreshAfterSeconds ? ` · next check in about ${payload.refreshAfterSeconds}s` : ""}</span></footer>
  </div>;
}
