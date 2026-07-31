"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BrainCircuit, Crown, ShieldCheck, Trophy } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";

type Leader = { rank: number; model_id: string; model_name: string; owner_alias: string; owner_slug: string; sport: string; category: string; rating: number; graded_picks: number; wins: number; losses: number; roi_percent: number | null; version: number; sample_status: string; is_current_user: boolean };
const sports = ["MLB", "NBA", "NFL", "NHL", "WNBA"];
const categories = [["player_prop", "Player Props"], ["moneyline", "Moneylines"], ["spread", "Spreads"], ["total", "Totals"]];

export function PublicModelLeaderboard() {
  const [sport, setSport] = useState("MLB");
  const [category, setCategory] = useState("player_prop");
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const queryKey = `${sport}:${category}`;
  const loading = loadedKey !== queryKey;
  useEffect(() => {
    fetch(`/api/models/public?sport=${encodeURIComponent(sport)}&category=${encodeURIComponent(category)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { leaders: [] })
      .then((result) => setLeaders(result.leaders ?? []))
      .catch(() => setLeaders([]))
      .finally(() => setLoadedKey(queryKey));
  }, [category, queryKey, sport]);
  const categoryLabel = categories.find(([key]) => key === category)?.[1] ?? "Models";
  return <section className="public-model-leaderboard">
    <header><div><span className="landing-kicker">PUBLIC MODEL REPUTATION</span><h2>Systems earn a public record</h2><p>Only live models from analysts who opt in are listed. Strategies, weights, notes, and private recommendation history stay private.</p></div><Badge tone="accent">VERIFIED ONLY</Badge></header>
    <div className="model-public-filters"><div className="filter-tabs">{sports.map((item) => <button className={sport === item ? "active" : ""} onClick={() => setSport(item)} key={item}>{item}</button>)}</div><div className="filter-tabs">{categories.map(([key, label]) => <button className={category === key ? "active" : ""} onClick={() => setCategory(key)} key={key}>{label}</button>)}</div></div>
    <Card className="public-model-table"><header><span>Rank</span><span>Model</span><span>Rating</span><span>Verified record</span><span>Status</span></header>{loading ? <div className="public-model-loading">{[1, 2, 3, 4].map((item) => <i key={item} />)}</div> : leaders.length ? leaders.map((leader) => <article className={leader.is_current_user ? "current" : ""} key={leader.model_id}><b>#{leader.rank}</b><span><strong>{leader.rank === 1 ? <Crown /> : <BrainCircuit />}{leader.model_name}{leader.is_current_user ? " (Yours)" : ""}</strong><small>v{leader.version} · by {leader.owner_slug ? <Link href={`/analysts/${leader.owner_slug}`}>{leader.owner_alias}</Link> : leader.owner_alias}</small></span><strong>{Math.round(leader.rating)}<small>{leader.roi_percent === null ? "Verified rating" : `${Number(leader.roi_percent).toFixed(1)}% ROI`}</small></strong><span><b>{leader.wins}-{leader.losses}</b><small>{leader.graded_picks} automatic results</small></span><Badge tone={leader.sample_status === "Established" ? "success" : "warning"}>{leader.sample_status}</Badge></article>) : <div className="public-model-empty"><Trophy /><strong>{loading ? "Loading model league…" : `${sport} ${categoryLabel} is open`}</strong><p>Promote a model, earn 10 automatically verified outcomes, and opt into a public analyst profile to appear here.</p><Link href="/lab">Build a model <ArrowRight /></Link></div>}</Card>
    <footer><ShieldCheck /> A public model record shows evidence and sample size—not a guaranteed outcome. Ratings never reflect wager size.</footer>
  </section>;
}
