"use client";

import { useMemo, useState } from "react";
import { Bookmark, ChevronDown, Plus, Search, ShieldCheck } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import type { PropData } from "@/services/types";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { addToSlip } from "@/lib/picks/slip";
import { PlayerAvatar } from "@/components/players/player-avatar";

const filters = ["All", "AI Pick", "High EV", "Trending", "Correlated", "SGP", "Safe"];
const leagueNames: Record<string, string> = {
  baseball_mlb: "MLB", basketball_nba: "NBA", americanfootball_nfl: "NFL",
  icehockey_nhl: "NHL", basketball_wnba: "WNBA",
};
function TrendBars({ values }: { values: number[] }) {
  const max = Math.max(...values);
  return <div className="prop-trend" aria-label={`Recent results: ${values.join(", ")}`}>{values.map((value, index) => <i key={index} style={{ height: `${Math.max(12, value / max * 100)}%` }} />)}</div>;
}

function bestOutcomeQuotes(prop: PropData) {
  const best = new Map<string, NonNullable<PropData["quotes"]>[number]>();
  for (const quote of prop.quotes ?? []) {
    const current = best.get(quote.outcomeName);
    if (!current || quote.price > current.price) best.set(quote.outcomeName, quote);
  }
  return [...best.values()];
}

function researchPriority(prop: PropData) {
  return Math.round(Math.min(100, prop.confidence * 0.5 + prop.hitRate * 0.25 + Math.min(20, Math.max(0, prop.expectedValue)) * 1.25));
}

export function PropsLab({ props, provider, updatedAt }: { props: PropData[]; provider: string; updatedAt: string }) {
  const [filter, setFilter] = useState("All");
  const [sport, setSport] = useState("All");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = usePersistentState<string[]>("stratiqa.props.favorites.v1", []);
  const [showSaved, setShowSaved] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const sports = useMemo(() => ["All", ...new Set(props.map((prop) => prop.providerSportKey).filter((value): value is string => Boolean(value)))], [props]);
  const savedProps = useMemo(() => props.filter((prop) => favorites.includes(prop.id)).sort((a, b) => researchPriority(b) - researchPriority(a)), [favorites, props]);
  const visible = useMemo(() => props.filter((prop) => (!showSaved || favorites.includes(prop.id)) && (sport === "All" || prop.providerSportKey === sport) && (filter === "All" || prop.tags.includes(filter)) && `${prop.player} ${prop.team} ${prop.market}`.toLowerCase().includes(query.toLowerCase())), [favorites, filter, props, query, showSaved, sport]);
  const toggleFavorite = (id: string) => setFavorites(favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id]);
  const addProp = (prop: PropData, quote?: { book: string; outcomeName: string; price: number }) => addToSlip({
    id: `prop:${prop.id}:${quote?.book ?? provider}:${quote?.outcomeName ?? prop.line}`,
    kind: "prop", propId: prop.id, outcomeName: quote?.outcomeName ?? prop.line.split(" ")[0],
    selection: `${quote?.outcomeName ?? prop.line.split(" ")[0]} ${prop.point ?? prop.line.split(" ")[1]} ${prop.market}`,
    eventName: `${prop.player} · ${prop.matchup}`, book: quote?.book ?? provider, price: quote?.price ?? prop.price,
    confidence: prop.confidence, expectedValue: prop.expectedValue, live: Boolean(prop.live), origin: "personal",
  });

  return <div>
    <section className="props-toolbar">
      <div><div className="filter-tabs">{sports.map((item) => <button className={sport === item ? "active" : ""} key={item} onClick={() => setSport(item)}>{item === "All" ? "All Sports" : leagueNames[item] ?? item}</button>)}</div><div className="filter-tabs">{filters.map((item) => <button className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
      <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players or markets" /></label>
      <button type="button" className={`props-saved-toggle ${showSaved ? "active" : ""}`} aria-pressed={showSaved} onClick={() => setShowSaved((value) => !value)}><Bookmark size={14} fill={showSaved ? "currentColor" : "none"} /> Saved <b>{favorites.length}</b></button>
    </section>
    {showSaved ? <aside className="props-saved-intro"><Bookmark fill="currentColor" /><span><strong>Your shortlist</strong><small>Keep ideas here, compare the signals, then add only the props you want to your slip.</small></span>{favorites.length ? <button type="button" onClick={() => setFavorites([])}>Clear saved</button> : null}</aside> : null}
    {showSaved && savedProps.length > 1 ? <section className="props-comparison"><header><div><strong>Compare saved props</strong><small>Ranked by the current board’s confidence, hit rate, and EV—not a guarantee or a personal-model result.</small></div><button type="button" aria-expanded={showComparison} onClick={() => setShowComparison((value) => !value)}>{showComparison ? "Hide comparison" : `Compare ${savedProps.length} props`}</button></header>{showComparison ? <div className="props-comparison-table"><div className="props-comparison-head"><span>Player · market</span><span>Research score</span><span>Line</span><span>Hit rate</span><span>Projection</span><span>EV</span><span>Confidence</span><span /></div>{savedProps.map((prop, index) => <article key={prop.id}><span><strong>#{index + 1} · {prop.player}</strong><small>{prop.market} · {prop.matchup}</small></span><b className="research-score">{researchPriority(prop)}<small>/100</small></b><b>{prop.line}</b><b>{prop.hitRate}%</b><b>{prop.projection}</b><b className="positive">+{prop.expectedValue}%</b><b>{prop.confidence}%</b><button type="button" aria-label={`Add ${prop.player} to slip`} onClick={() => addProp(prop)}><Plus /> Add</button></article>)}</div> : null}</section> : null}
    {visible.length ? <section className="props-grid">{visible.map((prop) => <Card className="prop-card glass-card" key={prop.id}>
      <header><div><Badge tone={prop.tags.includes("AI Pick") ? "accent" : "success"}>{prop.tags[0]}</Badge><small>{prop.matchup}</small></div><button className={favorites.includes(prop.id) ? "saved" : ""} aria-label={`Favorite ${prop.player}`} onClick={() => toggleFavorite(prop.id)}><Bookmark size={16} fill={favorites.includes(prop.id) ? "currentColor" : "none"} /></button></header>
      <div className="prop-player"><PlayerAvatar name={prop.player} sportKey={prop.providerSportKey} /><div><h2>{prop.player}</h2><p>{prop.market} · {prop.point ?? prop.line.replace(/^(Over|Under) /, "")}</p></div><small>{prop.team || leagueNames[prop.providerSportKey ?? ""] || "PROP"}</small></div>
      {prop.quotes?.length ? <div className="prop-book-lines">{bestOutcomeQuotes(prop).map((quote) => <button key={quote.outcomeName} onClick={() => addProp(prop, quote)}><span>{quote.outcomeName} {prop.point}<small>STRATIQA best line</small></span><b>{quote.price > 0 ? "+" : ""}{quote.price}</b><Plus /></button>)}</div> : <button className="prop-single-line" onClick={() => addProp(prop)}><span>{prop.line}<small>STRATIQA line</small></span><b>{prop.price > 0 ? "+" : ""}{prop.price}</b><Plus /></button>}
      <div className="prop-metrics"><span><small>Hit rate</small><strong>{prop.hitRate}%</strong></span><span><small>Expected value</small><strong>+{prop.expectedValue}%</strong></span><span><small>Confidence</small><strong>{prop.confidence}%</strong></span></div>
      <div className="prop-chart-row"><span><small>Last 7</small><TrendBars values={prop.trend} /></span><b>Projection {prop.projection}</b></div>
      <details className="prop-research-note"><summary>Research detail <ChevronDown /></summary><p><strong>Hit rate</strong> summarizes the recent tracked sample. <strong>Projection</strong> is the current provider or model estimate. Expected value and confidence are analysis signals, not guaranteed outcomes.</p><span><ShieldCheck /> {prop.live ? "This provider line can be locked before start and settled automatically." : "This fallback analysis is educational only and cannot be locked for ratings."}</span></details>
      <footer><div>{prop.tags.slice(1).map((tag) => <span key={tag}>{tag}</span>)}</div><small>{prop.live ? "LIVE PROVIDER MARKET" : "DEMO ANALYSIS"}</small></footer>
    </Card>)}</section> : <Card className="premium-empty"><Search size={25} /><strong>{showSaved ? "Your shortlist is empty" : "No props match this view"}</strong><p>{showSaved ? "Bookmark player props to keep them here for a clean, side-by-side review before you build your slip." : "Adjust the search or clear the active category to see more opportunities."}</p><button onClick={() => { setSport("All"); setFilter("All"); setQuery(""); if (showSaved) setShowSaved(false); }}>{showSaved ? "Browse all props" : "Clear filters"}</button></Card>}
    <p className="props-demo-note"><Badge tone={props.some((prop) => prop.live) ? "success" : "warning"}>{props.some((prop) => prop.live) ? "LIVE PROPS" : "DEMO FALLBACK"}</Badge>{provider} · Updated {new Date(updatedAt).toLocaleTimeString()}. Live provider lines lock into verified slips; fallback props remain analysis-only.</p>
  </div>;
}
