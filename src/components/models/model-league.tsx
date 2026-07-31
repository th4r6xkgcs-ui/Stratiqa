"use client";

import { useState } from "react";
import { ArrowRight, BarChart3, BrainCircuit, Crown, Gauge, Medal, ShieldCheck, Swords, Trophy } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";

type Entry = {
  modelId: string; modelName: string; sport: string; category: string; status: string; version: number;
  rating: number; leagueScore: number; resolved: number; wins: number; losses: number; winRate: number;
  averageScore: number | null; calibrationGap: number | null; passes: number; rank: number; divisionRank?: number;
  stage: { key: string; label: string; detail: string };
};
export type ModelLeagueData = {
  entries: Entry[];
  divisions: Array<{ key: string; sport: string; category: string; table: Entry[] }>;
  matchups: Array<{ id: string; sport: string; category: string; champion: Entry; challenger: Entry; leader: string; gap: number; reviewReady: boolean }>;
};
const categoryName = (value: string) => value.replaceAll("_", " ");

export function ModelLeague({ league }: { league: ModelLeagueData }) {
  const [advanced, setAdvanced] = useState(false);
  const [division, setDivision] = useState(league.divisions[0]?.key ?? "");
  const selected = league.divisions.find((item) => item.key === division) ?? league.divisions[0];
  if (!league.entries.length) return null;
  const titleCount = league.divisions.filter((item) => item.table[0]?.stage.key === "promotion_ready").length;
  return <section className="model-league">
    <header><div><span className="landing-kicker">MODEL LEAGUE</span><h2>Champions earn their place</h2><p>Models compete inside their own sport and category. Small samples remain provisional and no status changes automatically.</p></div><div><button className={!advanced ? "active" : ""} onClick={() => setAdvanced(false)}>Simple</button><button className={advanced ? "active" : ""} onClick={() => setAdvanced(true)}><BarChart3 /> Advanced</button></div></header>
    <div className="league-summary"><Card><Trophy /><span><small>DIVISION TITLES</small><strong>{titleCount}</strong><p>Leaders with promotion-ready evidence</p></span></Card><Card><Swords /><span><small>ACTIVE MATCHUPS</small><strong>{league.matchups.length}</strong><p>Champion-versus-challenger races</p></span></Card><Card><ShieldCheck /><span><small>PROTECTED MODELS</small><strong>{league.entries.length}</strong><p>No automatic promotion or retirement</p></span></Card></div>
    <div className="league-division-tabs">{league.divisions.map((item) => <button className={selected?.key === item.key ? "active" : ""} onClick={() => setDivision(item.key)} key={item.key}>{item.sport}<span>{categoryName(item.category)}</span></button>)}</div>
    {selected ? <Card className="league-table"><header><div><Medal /><span><strong>{selected.sport} {categoryName(selected.category)} division</strong><small>Ranked by verified rating plus matched-outcome evidence</small></span></div><Badge tone="accent">{selected.table.length} MODELS</Badge></header><div className="league-table-head"><span>Rank</span><span>Model</span><span>Stage</span><span>League score</span>{advanced ? <><span>Record</span><span>Calibration</span><span>Passes</span></> : <span>Next step</span>}</div>{selected.table.map((entry) => <article key={entry.modelId} className={entry.status}><b>#{entry.divisionRank}</b><span><strong>{entry.modelName}{entry.status === "live" ? <Crown /> : null}</strong><small>v{entry.version} · {entry.status}</small></span><Badge tone={entry.stage.key === "promotion_ready" ? "success" : entry.stage.key === "provisional" ? "warning" : "accent"}>{entry.stage.label}</Badge><strong>{entry.leagueScore}<small>{entry.rating} verified rating</small></strong>{advanced ? <><span><b>{entry.wins}-{entry.losses}</b><small>{entry.resolved} matched</small></span><span><b>{entry.calibrationGap === null ? "N/A" : `${entry.calibrationGap > 0 ? "+" : ""}${entry.calibrationGap}`}</b><small>score gap</small></span><span><b>{entry.passes}</b><small>disciplined</small></span></> : <span className="league-next"><small>{entry.resolved >= 20 && entry.winRate < 45 ? "Review this model—retirement may be worth considering, but remains your decision." : entry.stage.detail}</small><ArrowRight /></span>}</article>)}</Card> : null}
    {league.matchups.length ? <div className="league-matchups"><header><Swords /><span><strong>Weekly model matchups</strong><small>Same-category champions and challengers</small></span></header><div>{league.matchups.map((matchup) => <Card key={matchup.id}><header><Badge tone="accent">{matchup.sport} · {categoryName(matchup.category)}</Badge><span>{matchup.reviewReady ? "REVIEW READY" : "EVIDENCE BUILDING"}</span></header><div><span><Crown /><small>CHAMPION</small><strong>{matchup.champion.modelName}</strong><b>{matchup.champion.leagueScore}</b></span><em>VS</em><span><BrainCircuit /><small>CHALLENGER</small><strong>{matchup.challenger.modelName}</strong><b>{matchup.challenger.leagueScore}</b></span></div><footer><Gauge /> {matchup.leader} leads by {matchup.gap} league points. {matchup.reviewReady ? "Promotion review is available; no change happens automatically." : matchup.challenger.stage.detail}</footer></Card>)}</div></div> : null}
  </section>;
}
