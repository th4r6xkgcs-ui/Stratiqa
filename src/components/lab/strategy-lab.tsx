"use client";

import Link from "next/link";
import { Check, FlaskConical, Play, Save, SlidersHorizontal, Sparkles, Target } from "lucide-react";
import { useState } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { activeStrategyStorageKey, defaultStrategyBuilds, strategyStorageKey, type StrategyBuild } from "@/lib/strategies/builds";
import { Badge, Button, Card, Metric } from "@/components/ui/primitives";

export function StrategyLab() {
  const [builds, setBuilds] = usePersistentState<StrategyBuild[]>(strategyStorageKey, defaultStrategyBuilds);
  const [activeId, setActiveId] = usePersistentState(activeStrategyStorageKey, defaultStrategyBuilds[0].id);
  const [selectedId, setSelectedId] = useState(activeId);
  const selected = builds.find((build) => build.id === selectedId) ?? builds[0];
  const total = selected.weights.confidence + selected.weights.value + selected.weights.market;

  const updateSelected = (patch: Partial<StrategyBuild>) => {
    setBuilds((current) => current.map((build) => build.id === selected.id ? { ...build, ...patch } : build));
  };

  const updateWeight = (key: keyof StrategyBuild["weights"], value: number) => {
    updateSelected({ weights: { ...selected.weights, [key]: value } });
  };

  return (
    <div className="product-page strategy-lab">
      <header className="product-hero">
        <div><Badge tone="accent"><FlaskConical size={12} /> STRATIQA LAB</Badge><h1>Build the model that finds your picks.</h1><p>Tune signal priorities, set a confidence floor, and promote a build directly into Matchup Intelligence.</p></div>
        <Link className="button button--secondary" href="/matchups"><Target size={15} /> Find picks</Link>
      </header>

      <section className="product-metrics">
        <Card><Metric value={`${builds.length}`} label="Strategy builds" detail="Saved locally" /></Card>
        <Card><Metric value={`${selected.minimumConfidence}%`} label="Confidence floor" detail="Active threshold" positive /></Card>
        <Card><Metric value={`${total}%`} label="Weight allocation" detail={total === 100 ? "Calibrated" : "Normalize on ranking"} positive={total === 100} /></Card>
      </section>

      <div className="strategy-layout">
        <Card className="strategy-list">
          <header><span><Sparkles size={16} /> Your builds</span><Badge tone="success">{builds.length} READY</Badge></header>
          {builds.map((build) => (
            <button className={selected.id === build.id ? "selected" : ""} onClick={() => setSelectedId(build.id)} key={build.id}>
              <span><strong>{build.name}</strong><small>{build.description}</small></span>
              {activeId === build.id ? <Badge tone="success"><Check size={11} /> ACTIVE</Badge> : null}
            </button>
          ))}
        </Card>

        <Card className="strategy-editor">
          <header><span><SlidersHorizontal size={16} /> Build controls</span><Badge tone="accent">LIVE PREVIEW</Badge></header>
          <label className="strategy-name">Build name<input value={selected.name} maxLength={32} onChange={(event) => updateSelected({ name: event.target.value })} /></label>
          <p>{selected.description}</p>
          <div className="strategy-sliders">
            {([
              ["confidence", "Model confidence", "Favor stable, high-agreement projections."],
              ["value", "Expected value", "Favor the largest gap between price and probability."],
              ["market", "Market confirmation", "Favor sharp money and constructive line movement."],
            ] as const).map(([key, label, detail]) => (
              <label key={key}>
                <span><strong>{label}</strong><small>{detail}</small></span>
                <input type="range" min="0" max="100" value={selected.weights[key]} onChange={(event) => updateWeight(key, Number(event.target.value))} />
                <b>{selected.weights[key]}</b>
              </label>
            ))}
            <label>
              <span><strong>Minimum confidence</strong><small>Hide picks below this model confidence.</small></span>
              <input type="range" min="55" max="95" value={selected.minimumConfidence} onChange={(event) => updateSelected({ minimumConfidence: Number(event.target.value) })} />
              <b>{selected.minimumConfidence}%</b>
            </label>
          </div>
          <footer>
            <span><Save size={14} /> Changes save automatically</span>
            <Button onClick={() => setActiveId(selected.id)} disabled={activeId === selected.id}><Play size={14} /> {activeId === selected.id ? "Build active" : "Use this build"}</Button>
          </footer>
        </Card>
      </div>
    </div>
  );
}
