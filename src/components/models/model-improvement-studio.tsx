"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, BrainCircuit, FlaskConical, Gauge, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";
import type { ManagedModel } from "@/components/models/model-command-center";

type Suggestion = { factor: string | null; direction: "increase" | "decrease" | "hold"; delta: number; explanation: string };
type Diagnostic = {
  modelId: string; modelName: string; sport: string; category: string; status: string; version: number;
  matched: number; wins: number; actual: number | null; averageScore: number | null; calibrationGap: number | null; calibrationLabel: string;
  factors: Array<{ factor: string; label: string; separation: number; currentWeight: number }>;
  suggestions: Suggestion[]; proposedWeights: Record<string, number>;
};
export type ImprovementStudioData = { diagnostics: Diagnostic[]; matchups: Array<{ champion: Diagnostic; challengers: Diagnostic[] }> };

export function ModelImprovementStudio({ studio, models, onModels, onStatus }: { studio: ImprovementStudioData; models: ManagedModel[]; onModels: (models: ManagedModel[]) => void; onStatus: (status: string) => void }) {
  const [selectedId, setSelectedId] = useState(studio.diagnostics[0]?.modelId ?? "");
  const [working, setWorking] = useState(false);
  const selected = useMemo(() => studio.diagnostics.find((item) => item.modelId === selectedId) ?? studio.diagnostics[0], [selectedId, studio.diagnostics]);
  if (!selected) return null;
  const changed = selected.suggestions.some((item) => item.direction !== "hold" && item.delta > 0);
  const model = models.find((item) => item.id === selected.modelId);
  async function createChallenger() {
    if (!model || !changed) return;
    setWorking(true);
    const response = await fetch(`/api/models/${model.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `${model.name} Challenger`, suggestedWeights: selected.proposedWeights }),
    });
    const result = await response.json(); setWorking(false);
    if (!response.ok) return onStatus(result.error);
    onModels([{ ...result.model, performance: { verified: 0, wins: 0, losses: 0, accuracy: null, rating: 1500, roi: null, recentVerified: 0, sample: "early" } }, ...models]);
    onStatus(`${result.model.name} is testing separately. ${model.name} remains your unchanged champion.`);
  }
  const matchup = studio.matchups.find((item) => item.champion.modelId === selected.modelId);
  return <section className="model-improvement-studio">
    <header><div><span className="landing-kicker">MODEL IMPROVEMENT STUDIO</span><h2>Improve with evidence, never hindsight</h2><p>STRATIQA proposes. You decide. Confirmed changes create a separate challenger and never rewrite the champion.</p></div><Badge tone="accent">{studio.diagnostics.length} MODELS</Badge></header>
    <div className="improvement-model-tabs">{studio.diagnostics.map((item) => <button className={selected.modelId === item.modelId ? "active" : ""} onClick={() => setSelectedId(item.modelId)} key={item.modelId}><BrainCircuit /><span><strong>{item.modelName}</strong><small>{item.sport} · {item.category.replace("_", " ")} · v{item.version}</small></span></button>)}</div>
    <div className="improvement-grid">
      <Card className="improvement-diagnosis"><header><Gauge /><span><strong>Verified diagnosis</strong><small>{selected.matched} matched outcomes · {selected.calibrationLabel}</small></span></header><div className="improvement-stats"><span><b>{selected.actual === null ? "N/A" : `${selected.actual}%`}</b><small>actual win rate</small></span><span><b>{selected.averageScore === null ? "N/A" : `${selected.averageScore}%`}</b><small>average score</small></span><span><b>{selected.calibrationGap === null ? "N/A" : `${selected.calibrationGap > 0 ? "+" : ""}${selected.calibrationGap}`}</b><small>calibration gap</small></span></div><div className="factor-diagnostics">{selected.factors.map((factor) => <article key={factor.factor}><span><strong>{factor.label}</strong><small>{factor.separation > 0 ? "Stronger in wins" : factor.separation < 0 ? "Stronger in losses" : "No separation yet"}</small></span><b className={factor.separation > 0 ? "up" : factor.separation < 0 ? "down" : ""}>{factor.separation > 0 ? <ArrowUp /> : factor.separation < 0 ? <ArrowDown /> : null}{factor.separation > 0 ? "+" : ""}{factor.separation}</b></article>)}</div></Card>
      <Card className="improvement-preview"><header><FlaskConical /><span><strong>Challenger preview</strong><small>No change occurs until you confirm</small></span></header><div>{Object.entries(selected.proposedWeights).map(([factor, proposed]) => { const current = model?.weights[factor] ?? proposed; return <article key={factor}><span><strong>{factor.replaceAll("_", " ")}</strong><small>{current}% champion</small></span><i><em style={{ width: `${proposed / 60 * 100}%` }} /></i><b className={proposed > current ? "up" : proposed < current ? "down" : ""}>{proposed}%</b></article>; })}</div><aside>{selected.suggestions.map((item) => <p key={`${item.factor}-${item.direction}`}><Sparkles /> {item.explanation}</p>)}</aside><Button disabled={!changed || working} onClick={createChallenger}>{working ? "Creating challenger…" : changed ? "Create Separate Challenger" : "Keep Collecting Evidence"} <ArrowRight /></Button></Card>
    </div>
    {matchup ? <Card className="champion-challenger"><header><Trophy /><span><strong>Champion versus challengers</strong><small>Promotion remains locked behind verified results</small></span></header><div><article className="champion"><Badge tone="success">CHAMPION</Badge><strong>{matchup.champion.modelName}</strong><small>{matchup.champion.matched} matched outcomes · v{matchup.champion.version}</small></article>{matchup.challengers.length ? matchup.challengers.map((challenger) => <article key={challenger.modelId}><Badge tone="warning">CHALLENGER</Badge><strong>{challenger.modelName}</strong><small>{challenger.matched}/5 minimum evidence · {challenger.calibrationLabel}</small></article>) : <article className="empty"><ShieldCheck /><strong>No challenger yet</strong><small>Your champion remains untouched until evidence supports an experiment.</small></article>}</div></Card> : null}
  </section>;
}
