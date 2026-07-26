"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, BrainCircuit, ChevronDown, Crown, GitCompareArrows, Target } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import type { ManagedModel } from "@/components/models/model-command-center";
import { competitiveStanding } from "@/lib/ratings/competitive-ranks.js";

type ArenaLeader = {
  rank: number; model_id: string; model_name: string; owner_alias: string; sport: string; category: string;
  rating: number; rating_change: number; graded_picks: number; wins: number; losses: number; pushes: number;
  roi_percent: number; version: number; is_current_user: boolean;
};

const sports = ["ALL", "MLB", "NBA", "NFL", "NHL", "WNBA"];
const categories = [["all", "All Categories"], ["player_prop", "Player Props"], ["moneyline", "Moneylines"], ["spread", "Spreads"], ["total", "Totals"], ["live", "Live Markets"]];
const categoryLabel = (value: string) => categories.find(([key]) => key === value)?.[1] ?? value.replaceAll("_", " ");

export function ModelArena({ models }: { models: ManagedModel[] }) {
  const [leaders, setLeaders] = useState<ArenaLeader[]>([]);
  const [sport, setSport] = useState("ALL");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const best = useMemo(() => [...models].filter((model) => model.status !== "retired").sort((a, b) => b.performance.rating - a.performance.rating)[0], [models]);
  const rankedModels = models.filter((model) => model.performance.verified >= 10).length;
  const bestDivision = competitiveStanding(best?.performance.rating ?? 1500, best?.performance.verified ?? 0);

  useEffect(() => {
    const query = new URLSearchParams();
    if (sport !== "ALL") query.set("sport", sport);
    if (category !== "all") query.set("category", category);
    fetch(`/api/models/arena?${query}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setLeaders(result.leaders ?? []);
      })
      .catch(() => setLeaders([]))
      .finally(() => setLoading(false));
  }, [category, sport]);

  return <section className="model-arena">
    <header>
      <div><span className="landing-kicker">MODEL ARENA</span><h2>Prove which systems actually work</h2><p>Model ratings track recommendations. Your personal rating still tracks your final decisions.</p></div>
      <Badge tone="accent">{rankedModels} RANKED MODELS</Badge>
    </header>

    <div className="model-arena-summary">
      <Card><Crown /><span><small>YOUR TOP MODEL · {bestDivision.tier.name.toUpperCase()} DIVISION</small><strong>{best?.name ?? "Build your first model"}</strong><p>{best ? `${best.performance.rating} rating · ${best.sport} ${categoryLabel(best.category)} · ${bestDivision.pointsToNext ? `${bestDivision.pointsToNext} to ${bestDivision.nextTier.name}` : "top division"}` : "Every model starts at 1500"}</p></span></Card>
      <Card><Target /><span><small>PATH TO RANKED</small><strong>{best ? Math.max(0, 10 - best.performance.verified) : 10} settled picks</strong><p>Models enter public competition after 10 automatic results.</p></span></Card>
      <Card><GitCompareArrows /><span><small>SEPARATE REPUTATIONS</small><strong>Model ≠ User</strong><p>You own the decision. The model owns its recommendation record.</p></span></Card>
    </div>

    <Card className="model-arena-board">
      <header>
        <div className="filter-tabs">{sports.map((item) => <button className={sport === item ? "active" : ""} onClick={() => { setLoading(true); setSport(item); }} key={item}>{item}</button>)}</div>
        <select aria-label="Model category" value={category} onChange={(event) => { setLoading(true); setCategory(event.target.value); }}>{categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
      </header>
      <div className="model-arena-head"><span>Rank</span><span>Model</span><span>Rating</span><span>Move</span><span>Record</span></div>
      {loading ? <div className="model-arena-loading">{[1, 2, 3, 4].map((item) => <i key={item} />)}</div> : leaders.length ? leaders.map((leader) => {
        const division = competitiveStanding(leader.rating, leader.graded_picks);
        return <details key={leader.model_id} className={leader.is_current_user ? "owned" : ""}>
        <summary>
          <b>#{leader.rank}</b>
          <span><strong>{leader.model_name}{leader.is_current_user ? " (Yours)" : ""}</strong><small>{leader.owner_alias} · {leader.sport} · {categoryLabel(leader.category)} · {division.tier.name} Division · v{leader.version}</small></span>
          <strong>{Math.round(leader.rating)}</strong>
          <em className={leader.rating_change > 0 ? "up" : leader.rating_change < 0 ? "down" : ""}>{leader.rating_change > 0 ? <ArrowUp /> : leader.rating_change < 0 ? <ArrowDown /> : null}{leader.rating_change ? Math.abs(Math.round(leader.rating_change)) : "—"}</em>
          <span><strong>{leader.wins}-{leader.losses}</strong><small>{leader.graded_picks} settled</small></span>
          <ChevronDown />
        </summary>
        <div><span><small>ACCURACY</small><strong>{leader.wins + leader.losses ? (leader.wins / (leader.wins + leader.losses) * 100).toFixed(1) : "0.0"}%</strong></span><span><small>DIVISION</small><strong style={{ color: division.tier.color }}>{division.tier.name}</strong></span><span><small>NEXT DIVISION</small><strong>{division.pointsToNext ? `${division.pointsToNext} points` : "Peak"}</strong></span><span><small>SAMPLE</small><strong>{leader.graded_picks >= 50 ? "Established" : "Developing"}</strong></span></div>
      </details>;
      }) : <div className="model-arena-empty"><BrainCircuit /><strong>This arena is wide open</strong><p>Promote a model to your active lineup and settle 10 attributed picks to claim a ranking.</p></div>}
    </Card>
  </section>;
}
