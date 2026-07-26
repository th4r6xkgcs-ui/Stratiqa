"use client";

import { useMemo, useState } from "react";
import { Bookmark, Filter, Plus, Search } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";
import type { PropData } from "@/services/types";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { addToSlip } from "@/lib/picks/slip";

const filters = ["All", "AI Pick", "High EV", "Trending", "Correlated", "SGP", "Safe"];
function TrendBars({ values }: { values: number[] }) {
  const max = Math.max(...values);
  return <div className="prop-trend" aria-label={`Recent results: ${values.join(", ")}`}>{values.map((value, index) => <i key={index} style={{ height: `${Math.max(12, value / max * 100)}%` }} />)}</div>;
}

export function PropsLab({ props, provider, updatedAt }: { props: PropData[]; provider: string; updatedAt: string }) {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = usePersistentState<string[]>("stratiqa.props.favorites.v1", []);
  const visible = useMemo(() => props.filter((prop) => (filter === "All" || prop.tags.includes(filter)) && `${prop.player} ${prop.team} ${prop.market}`.toLowerCase().includes(query.toLowerCase())), [filter, props, query]);
  const toggleFavorite = (id: string) => setFavorites(favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id]);

  return <div>
    <section className="props-toolbar">
      <div className="filter-tabs">{filters.map((item) => <button className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
      <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players or markets" /></label>
      <Button variant="secondary"><Filter size={15} /> Filters</Button>
    </section>
    {visible.length ? <section className="props-grid">{visible.map((prop) => <Card className="prop-card glass-card" key={prop.id}>
      <header><div><Badge tone={prop.tags.includes("AI Pick") ? "accent" : "success"}>{prop.tags[0]}</Badge><small>{prop.matchup}</small></div><button className={favorites.includes(prop.id) ? "saved" : ""} aria-label={`Favorite ${prop.player}`} onClick={() => toggleFavorite(prop.id)}><Bookmark size={16} fill={favorites.includes(prop.id) ? "currentColor" : "none"} /></button></header>
      <div className="prop-player"><span>{prop.team}</span><div><h2>{prop.player}</h2><p>{prop.market} · {prop.line}</p></div><button className="prop-price" onClick={() => addToSlip({ id: `prop:${prop.id}`, selection: `${prop.line} ${prop.market}`, eventName: `${prop.player} · ${prop.matchup}`, book: provider, price: prop.price, confidence: prop.confidence, expectedValue: prop.expectedValue, live: false })}>{prop.price > 0 ? "+" : ""}{prop.price}<small><Plus /> SLIP</small></button></div>
      <div className="prop-metrics"><span><small>Hit rate</small><strong>{prop.hitRate}%</strong></span><span><small>Expected value</small><strong>+{prop.expectedValue}%</strong></span><span><small>Confidence</small><strong>{prop.confidence}%</strong></span></div>
      <div className="prop-chart-row"><span><small>Last 7</small><TrendBars values={prop.trend} /></span><b>Projection {prop.projection}</b></div>
      <footer><div>{prop.tags.slice(1).map((tag) => <span key={tag}>{tag}</span>)}</div><button onClick={() => addToSlip({ id: `prop:${prop.id}`, selection: `${prop.line} ${prop.market}`, eventName: `${prop.player} · ${prop.matchup}`, book: provider, price: prop.price, confidence: prop.confidence, expectedValue: prop.expectedValue, live: false })}><Plus size={14} />Add to slip</button></footer>
    </Card>)}</section> : <Card className="premium-empty"><Search size={25} /><strong>No props match this view</strong><p>Adjust the search or clear the active category to see more opportunities.</p><button onClick={() => { setFilter("All"); setQuery(""); }}>Clear filters</button></Card>}
    <p className="props-demo-note"><Badge tone="warning">DEMO PROPS</Badge>{provider} · Updated {new Date(updatedAt).toLocaleTimeString()}. Slip analysis works now; rating lock activates only when a live prop identity is available.</p>
  </div>;
}
