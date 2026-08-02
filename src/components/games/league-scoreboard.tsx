"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, Bell, Eye, Heart, MessageCircle, RefreshCw, ShieldCheck, TrendingUp, X } from "lucide-react";
import { GameRoom } from "@/components/games/game-room";
import { usePersistentState } from "@/hooks/use-persistent-state";

type Sport = "baseball_mlb" | "basketball_nba" | "americanfootball_nfl" | "icehockey_nhl" | "basketball_wnba";
type Event = { id: string; eventName: string; commenceTime: string; awayTeam: string; homeTeam: string; awayScore: number | null; homeScore: number | null; state: "pre" | "in" | "post"; status: string };
type ScoreSnapshot = { away: number; home: number; at: string };

const leagues: Array<{ key: Sport; label: string }> = [
  { key: "baseball_mlb", label: "MLB" }, { key: "basketball_nba", label: "NBA" }, { key: "americanfootball_nfl", label: "NFL" }, { key: "icehockey_nhl", label: "NHL" }, { key: "basketball_wnba", label: "WNBA" },
];
const boardDays = [{ offset: -1, label: "Yesterday" }, { offset: 0, label: "Today" }, { offset: 1, label: "Tomorrow" }];

function scoreboardDate(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function ScorePulse({ event, history }: { event: Event; history: ScoreSnapshot[] }) {
  const readings = [...history];
  if (event.awayScore != null && event.homeScore != null && !readings.some((item) => item.away === event.awayScore && item.home === event.homeScore)) readings.push({ away: event.awayScore, home: event.homeScore, at: new Date().toISOString() });
  if (readings.length < 2) return <div className="public-score-pulse empty"><TrendingUp /><span><strong>Score flow starts with the next update</strong><small>Official score snapshots only—not individual play-by-play.</small></span></div>;
  const leads = readings.map((item) => item.home - item.away);
  const range = Math.max(1, ...leads.map((item) => Math.abs(item)));
  const points = leads.map((lead, index) => `${index / Math.max(1, leads.length - 1) * 100},${20 - lead / range * 16}`).join(" ");
  const current = leads.at(-1) ?? 0;
  return <div className="public-score-pulse"><header><span><TrendingUp /> Observed score flow</span><small>{current === 0 ? "Tied" : `${current > 0 ? event.homeTeam : event.awayTeam} ahead ${Math.abs(current)}`}</small></header><svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-label={`Observed score flow for ${event.eventName}`}><line x1="0" x2="100" y1="20" y2="20" /><polyline points={points} /></svg><footer><span>{event.awayTeam}</span><span>{event.homeTeam}</span></footer></div>;
}

export function LeagueScoreboard() {
  const [sport, setSport] = useState<Sport>("baseball_mlb");
  const [dayOffset, setDayOffset] = useState(0);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [focusedId, setFocusedId] = useState("");
  const [watchlist, setWatchlist] = usePersistentState<string[]>("stratiqa.public-game-watchlist.v1", []);
  const [scoreHistory, setScoreHistory] = usePersistentState<Record<string, ScoreSnapshot[]>>("stratiqa.public-game-score-history.v1", {});
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(() => typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  const seenScores = useRef<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/games/scoreboard?sport=${sport}&date=${scoreboardDate(dayOffset)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Scoreboard unavailable.");
      const nextEvents = (data.events ?? []) as Event[];
      setEvents(nextEvents);
      for (const event of nextEvents) {
        if (!watchlist.includes(event.id) || event.awayScore == null || event.homeScore == null) continue;
        const signature = `${event.awayScore}:${event.homeScore}:${event.state}`;
        const previous = seenScores.current[event.id];
        seenScores.current[event.id] = signature;
        if (previous && previous !== signature && typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") new Notification(event.eventName, { body: `${event.awayTeam} ${event.awayScore} · ${event.homeTeam} ${event.homeScore} · ${event.status}`, tag: `stratiqa-watch-${event.id}`, silent: true });
      }
      setScoreHistory((current) => {
        const next = { ...(current && typeof current === "object" ? current : {}) };
        const now = new Date().toISOString();
        for (const event of nextEvents) {
          if (!watchlist.includes(event.id) || event.awayScore == null || event.homeScore == null) continue;
          const existing = Array.isArray(next[event.id]) ? next[event.id] : [];
          const last = existing.at(-1);
          next[event.id] = last && last.away === event.awayScore && last.home === event.homeScore ? existing : [...existing, { away: event.awayScore, home: event.homeScore, at: now }].slice(-48);
        }
        return next;
      });
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Scoreboard unavailable.");
    } finally {
      setLoading(false);
    }
  }, [dayOffset, setScoreHistory, sport, watchlist]);

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 30_000);
    return () => { window.clearTimeout(first); window.clearInterval(timer); };
  }, [load]);

  const visibleEvents = useMemo(() => [...events].sort((left, right) => Number(watchlist.includes(right.id)) - Number(watchlist.includes(left.id))), [events, watchlist]);
  const focusedEvent = visibleEvents.find((event) => event.id === focusedId) ?? null;
  const toggleWatch = (event: Event) => setWatchlist((current) => current.includes(event.id) ? current.filter((id) => id !== event.id) : [...current, event.id]);
  const enableAlerts = async () => { if (typeof Notification !== "undefined") setNotificationPermission(await Notification.requestPermission()); };

  return <section className="league-scoreboard">
    <header><div><Activity /><span><strong>Every game, even without a ticket</strong><small><Eye /> {watchlist.length ? `${watchlist.length} game${watchlist.length === 1 ? "" : "s"} in your watchlist · ` : ""}Scores and discussion only—no live betting.</small></span></div><div className="scoreboard-actions">{notificationPermission === "default" && watchlist.length ? <button type="button" onClick={() => void enableAlerts()}><Bell /> Alerts</button> : null}<button type="button" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? "spinning" : ""} /> Refresh</button></div></header>
    <nav aria-label="League">{leagues.map((league) => <button type="button" className={sport === league.key ? "active" : ""} key={league.key} onClick={() => { setSport(league.key); setFocusedId(""); }}>{league.label}</button>)}</nav>
    <div className="scoreboard-days">{boardDays.map((day) => <button type="button" className={dayOffset === day.offset ? "active" : ""} key={day.offset} onClick={() => { setDayOffset(day.offset); setFocusedId(""); }}>{day.label}</button>)}</div>
    {loading ? <div className="league-scoreboard-loading">Loading public scores...</div> : error ? <div className="league-scoreboard-empty"><ShieldCheck />{error}</div> : visibleEvents.length ? <>
      <div className="league-scoreboard-grid">{visibleEvents.map((event) => {
        const watching = watchlist.includes(event.id);
        const focused = focusedId === event.id;
        return <article className={`${watching ? "watching " : ""}${focused ? "focused" : ""}`} key={event.id}>
          <header><span className={event.state}>{event.state === "in" ? "LIVE" : event.state === "post" ? "FINAL" : "SCHEDULED"}</span><div><small>{event.status}</small><button type="button" className="scoreboard-watch" onClick={() => toggleWatch(event)} aria-label={`${watching ? "Remove" : "Add"} ${event.eventName} ${watching ? "from" : "to"} watchlist`}><Heart fill={watching ? "currentColor" : "none"} /></button></div></header>
          <div><span><strong>{event.awayTeam}</strong><b>{event.awayScore ?? "–"}</b></span><span><strong>{event.homeTeam}</strong><b>{event.homeScore ?? "–"}</b></span></div>
          <footer><small>{event.state === "pre" ? new Date(event.commenceTime).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" }) : "Watch-only tracking"}</small><button type="button" onClick={() => setFocusedId(focused ? "" : event.id)}>{focused ? "Close details" : "Open details"}<MessageCircle /></button></footer>
        </article>;
      })}</div>
      {focusedEvent ? <section className="scoreboard-focus" aria-live="polite"><header><div><span><small>{focusedEvent.state === "in" ? "LIVE" : focusedEvent.state === "post" ? "FINAL" : "SCHEDULED"}</small><strong>{focusedEvent.eventName}</strong><em>{focusedEvent.status}</em></span><button type="button" onClick={() => setFocusedId("")} aria-label="Close game details"><X /></button></div></header><div className="scoreboard-focus-content"><ScorePulse event={focusedEvent} history={Array.isArray(scoreHistory?.[focusedEvent.id]) ? scoreHistory[focusedEvent.id] : []} /><GameRoom eventId={`espn:${focusedEvent.id}`} eventName={focusedEvent.eventName} /></div></section> : null}
    </> : <div className="league-scoreboard-empty"><ShieldCheck />No games are scheduled for this league and day.</div>}
  </section>;
}
