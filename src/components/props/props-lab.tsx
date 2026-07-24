"use client";

import { useMemo, useState } from "react";
import { Bookmark, Check, Filter, Layers3, Plus, Search, Sparkles, TrendingUp, X } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";
import type { PropData } from "@/services/types";
import { usePersistentState } from "@/hooks/use-persistent-state";

const filters = ["All", "AI Pick", "High EV", "Trending", "Correlated", "SGP", "Safe"];

function TrendBars({ values }: { values: number[] }) {
  const max = Math.max(...values);
  return <div className="prop-trend" aria-label={`Recent results: ${values.join(", ")}`}>{values.map((value, index) => <i key={index} style={{ height: `${Math.max(12, (value / max) * 100)}%` }} />)}</div>;
}

export function PropsLab({ props, provider, updatedAt }: { props: PropData[]; provider: string; updatedAt: string }) {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = usePersistentState<string[]>("stratiqa.props.favorites.v1", []);
  const [parlay, setParlay] = usePersistentState<string[]>("stratiqa.props.parlay.v1", []);
  const visible = useMemo(() => props.filter((prop) => (filter === "All" || prop.tags.includes(filter)) && `${prop.player} ${prop.team} ${prop.market}`.toLowerCase().includes(query.toLowerCase())), [filter, props, query]);
  const selectedProps = props.filter((prop) => parlay.includes(prop.id));

  function toggle(list: string[], setter: (items: string[]) => void, id: string) {
    setter(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  }

  return (
    <div className="props-lab-layout">
      <main>
        <section className="props-toolbar">
          <div className="filter-tabs">{filters.map((item) => <button className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
          <label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players or markets" /></label>
          <Button variant="secondary"><Filter size={15} /> Filters</Button>
        </section>
        {visible.length ? <section className="props-grid">{visible.map((prop) => (
          <Card className="prop-card glass-card" key={prop.id}>
            <header><div><Badge tone={prop.tags.includes("AI Pick") ? "accent" : "success"}>{prop.tags[0]}</Badge><small>{prop.matchup}</small></div><button className={favorites.includes(prop.id) ? "saved" : ""} aria-label={`Favorite ${prop.player}`} onClick={() => toggle(favorites, setFavorites, prop.id)}><Bookmark size={16} fill={favorites.includes(prop.id) ? "currentColor" : "none"} /></button></header>
            <div className="prop-player"><span>{prop.team}</span><div><h2>{prop.player}</h2><p>{prop.market} · {prop.line}</p></div><strong>{prop.price > 0 ? "+" : ""}{prop.price}</strong></div>
            <div className="prop-metrics"><span><small>Hit rate</small><strong>{prop.hitRate}%</strong></span><span><small>Expected value</small><strong>+{prop.expectedValue}%</strong></span><span><small>Confidence</small><strong>{prop.confidence}%</strong></span></div>
            <div className="prop-chart-row"><span><small>Last 7</small><TrendBars values={prop.trend} /></span><b>Projection {prop.projection}</b></div>
            <footer><div>{prop.tags.slice(1).map((tag) => <span key={tag}>{tag}</span>)}</div><button className={parlay.includes(prop.id) ? "added" : ""} onClick={() => toggle(parlay, setParlay, prop.id)}>{parlay.includes(prop.id) ? <Check size={14} /> : <Plus size={14} />}{parlay.includes(prop.id) ? "Added" : "Add to SGP"}</button></footer>
          </Card>
        ))}</section> : <Card className="premium-empty"><Search size={25} /><strong>No props match this view</strong><p>Adjust the search or clear the active category to see more opportunities.</p><button onClick={() => { setFilter("All"); setQuery(""); }}>Clear filters</button></Card>}
      </main>
      <aside className="parlay-builder">
        <Card>
          <header><span><Layers3 size={17} /> Same Game Parlay</span><Badge tone="accent">{selectedProps.length} legs</Badge></header>
          {selectedProps.length ? <div className="parlay-legs">{selectedProps.map((prop) => <div key={prop.id}><span><strong>{prop.player}</strong><small>{prop.line} {prop.market}</small></span><button aria-label={`Remove ${prop.player}`} onClick={() => toggle(parlay, setParlay, prop.id)}><X size={14} /></button></div>)}</div> : <div className="parlay-empty"><Plus size={21} /><p>Add correlated props to compare the combined angle.</p></div>}
          <div className="parlay-summary"><span>Combined confidence<strong>{selectedProps.length ? `${Math.round(selectedProps.reduce((sum, prop) => sum + prop.confidence, 0) / selectedProps.length)}%` : "—"}</strong></span><span>Average EV<strong>{selectedProps.length ? `+${(selectedProps.reduce((sum, prop) => sum + prop.expectedValue, 0) / selectedProps.length).toFixed(1)}%` : "—"}</strong></span></div>
          <Button disabled={selectedProps.length < 2}><Sparkles size={15} /> Analyze correlation</Button>
        </Card>
        <Card className="provider-status"><TrendingUp size={16} /><span><strong>{provider}</strong><small>Updated {new Date(updatedAt).toLocaleTimeString()} · mock mode</small></span></Card>
      </aside>
    </div>
  );
}
