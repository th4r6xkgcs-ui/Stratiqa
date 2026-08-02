"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, ChevronDown, Heart, Plus, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { addToSlip } from "@/lib/picks/slip";
import type { LiveBoardEvent, SportsbookQuote } from "@/services/types";

const leagues = [
  ["baseball_mlb", "MLB"], ["basketball_nba", "NBA"], ["americanfootball_nfl", "NFL"],
  ["icehockey_nhl", "NHL"], ["basketball_wnba", "WNBA"],
] as const;
const marketLabels: Record<string, string> = { h2h: "Moneyline", spreads: "Spread", totals: "Total" };
const formatPrice = (price: number) => `${price > 0 ? "+" : ""}${price}`;
const impliedProbability = (price: number) => price > 0 ? 100 / (price + 100) * 100 : Math.abs(price) / (Math.abs(price) + 100) * 100;
const shortTeam = (name: string) => name.split(" ").map((word) => word[0]).join("").slice(0, 4).toUpperCase();
const dateKey = (value: string) => new Date(value).toLocaleDateString("en-CA");

function Market({ event, marketKey, quotes }: { event: LiveBoardEvent; marketKey: string; quotes: SportsbookQuote[] }) {
  return <div className="board-market">
    <span>{marketLabels[marketKey]}</span>
    <div>{quotes.map((quote) => <button key={`${quote.outcomeName}-${quote.point}`} onClick={() => addToSlip({
      id: `${event.slug}:${marketKey}:${quote.outcomeName}:${quote.point ?? ""}`, slug: event.slug,
      selection: quote.line, eventName: `${event.awayTeam} at ${event.homeTeam}`, book: quote.book,
      price: quote.price, confidence: Math.round(impliedProbability(quote.price)), expectedValue: 0, live: true, origin: "personal",
    })}><small>{quote.line}</small><strong>{formatPrice(quote.price)}</strong><em>{impliedProbability(quote.price).toFixed(1)}% market chance</em><Plus /></button>)}</div>
  </div>;
}

export function LiveBoard() {
  const [sport, setSport] = useState<(typeof leagues)[number][0]>("baseball_mlb");
  const [events, setEvents] = useState<LiveBoardEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("live");
  const [updatedAt, setUpdatedAt] = useState("");
  const [favorites, setFavorites] = usePersistentState<string[]>("stratiqa.favorite-events.v1", []);

  useEffect(() => {
    let active = true;
    fetch(`/api/live-board?sport=${sport}`, { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json() }))
      .then(({ response, data }) => {
        if (!active) return;
        setEvents(response.ok ? data.events ?? [] : []);
        setMode(data.mode ?? "unavailable");
        setUpdatedAt(data.updatedAt ?? "");
        setSelectedDate("all");
      })
      .catch(() => {
        if (!active) return;
        setEvents([]); setMode("unavailable"); setUpdatedAt("");
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [sport]);

  const dates = useMemo(() => [...new Set(events.map((event) => dateKey(event.commenceTime)))], [events]);
  const visible = useMemo(() => events
    .filter((event) => selectedDate === "all" || dateKey(event.commenceTime) === selectedDate)
    .filter((event) => `${event.awayTeam} ${event.homeTeam}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)) || Date.parse(a.commenceTime) - Date.parse(b.commenceTime)),
  [events, favorites, query, selectedDate]);
  const toggleFavorite = (id: string) => setFavorites(favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id]);

  return <div className="page live-board-page">
    <header className="page-header live-board-hero">
      <div><Badge tone="accent"><Sparkles /> PREGAME PICK BOARD</Badge><h1>Choose before it starts. Track it live.</h1><p>Lock your decision before game time. Once play begins, this becomes a watch-only experience.</p></div>
      <Badge tone={mode === "live" ? "success" : "warning"}>{mode === "live" ? "MARKET BOARD" : mode === "mock" ? "DEMO MODE" : "FEED DELAYED"}</Badge>
    </header>

    <section className="live-board-controls">
      <nav>{leagues.map(([key, label]) => <button className={sport === key ? "active" : ""} onClick={() => { setLoading(true); setSport(key); }} key={key}>{label}</button>)}</nav>
      <label><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search teams" /></label>
    </section>
    <section className="board-date-strip">
      <button className={selectedDate === "all" ? "active" : ""} onClick={() => setSelectedDate("all")}><CalendarDays /> All upcoming</button>
      {dates.map((date) => <button className={selectedDate === date ? "active" : ""} onClick={() => setSelectedDate(date)} key={date}>{new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</button>)}
    </section>

    {loading ? <section className="board-loading">{[1, 2, 3].map((item) => <i key={item} />)}</section> :
      visible.length ? <section className="sportsbook-board">{visible.map((event) => {
        const moneylineQuotes = event.quotes.filter((quote) => quote.marketKey === "h2h");
        const additionalMarkets = (["spreads", "totals"] as const).map((market) => ({ market, quotes: event.quotes.filter((quote) => quote.marketKey === market) })).filter(({ quotes }) => quotes.length);
        return <Card className="sportsbook-event" key={event.id}>
          <header><div><Badge tone="success">PREGAME</Badge><time>Locks at {new Date(event.commenceTime).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}</time></div><button className={favorites.includes(event.id) ? "favorite" : ""} onClick={() => toggleFavorite(event.id)} aria-label={`Favorite ${event.awayTeam} at ${event.homeTeam}`}><Heart fill={favorites.includes(event.id) ? "currentColor" : "none"} /></button></header>
          <div className="board-teams"><span><i>{shortTeam(event.awayTeam)}</i><strong>{event.awayTeam}</strong><small>Away</small></span><b>AT</b><span><i>{shortTeam(event.homeTeam)}</i><strong>{event.homeTeam}</strong><small>Home</small></span></div>
          <div className="board-markets">{moneylineQuotes.length ? <Market event={event} marketKey="h2h" quotes={moneylineQuotes} /> : <p className="board-market-unavailable">Moneyline is not available for this game yet.</p>}</div>
          {additionalMarkets.length ? <details className="board-other-markets"><summary>More markets <span>Spread &amp; total</span><ChevronDown /></summary><div>{additionalMarkets.map(({ market, quotes }) => <Market event={event} marketKey={market} quotes={quotes} key={market} />)}</div></details> : null}
          <footer><span><ShieldCheck /> Pregame picks only · market chance shown, model edge on the intelligence page</span><Link href={`/matchups/${event.slug}`}>View intelligence <ArrowRight /></Link></footer>
        </Card>;
      })}</section> :
      <Card className="board-empty"><CalendarDays /><h2>No open markets here right now</h2><p>This league may be off-season, between slates, or temporarily unavailable. Try another league or date—nothing is broken.</p><button onClick={() => { setSelectedDate("all"); setQuery(""); }}>Clear filters</button></Card>}
    <details className="board-price-guide"><summary><ShieldCheck /> How to read this board <ArrowRight /></summary><p><strong>Market chance</strong> is the implied probability from the displayed pregame price. It is not STRATIQA confidence or expected value. Add a market to your slip to compare it with your own research or a qualifying model recommendation before you lock it.</p></details>
    <p className="board-freshness"><ShieldCheck /> Lines are cached for five minutes to protect the free data allowance. {updatedAt ? `Last checked ${new Date(updatedAt).toLocaleTimeString()}.` : ""}</p>
  </div>;
}
