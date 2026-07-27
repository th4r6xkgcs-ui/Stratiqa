"use client";

import Link from "next/link";
import { Activity, Check, FlaskConical, Plus, Play, Save, SlidersHorizontal, Sparkles, Target, Trash2, Trophy } from "lucide-react";
import { useState } from "react";
import { useStrategyPortfolio } from "@/hooks/use-strategy-portfolio";
import { defaultStrategyBuilds, portfolioMetrics, type PickOutcome, type StrategyBuild } from "@/lib/strategies/builds";
import { Badge, Button, Card, Metric } from "@/components/ui/primitives";

export function StrategyLab() {
  const { builds, setBuilds, activeBuildId: activeId, setActiveBuildId: setActiveId, trackedPicks, setTrackedPicks, syncState } = useStrategyPortfolio();
  const [selectedId, setSelectedId] = useState(activeId);
  const selected = builds.find((build) => build.id === selectedId) ?? builds[0] ?? defaultStrategyBuilds[0];
  const metrics = portfolioMetrics(trackedPicks, selected.id);
  const backtest = {
    winRate: 51 + selected.weights.confidence * 0.16,
    roi: 2.4 + selected.weights.value * 0.11,
    drawdown: Math.max(4.2, 13.5 - selected.weights.market * 0.12),
    sample: 1200 + selected.minimumConfidence * 14,
  };

  const updateSelected = (patch: Partial<StrategyBuild>) => {
    setBuilds((current) => current.map((build) => build.id === selected.id ? { ...build, ...patch } : build));
  };

  const updateWeight = (key: keyof StrategyBuild["weights"], value: number) => {
    updateSelected({ weights: { ...selected.weights, [key]: value } });
  };

  const createBuild = () => {
    const id = `custom-${Date.now()}`;
    const build: StrategyBuild = { ...defaultStrategyBuilds[0], id, name: `Custom Build ${builds.length - defaultStrategyBuilds.length + 1}`, description: "A custom strategy tuned to your preferred risk and value signals.", weights: { ...defaultStrategyBuilds[0].weights } };
    setBuilds((current) => [...current, build]);
    setSelectedId(id);
  };

  const deleteBuild = () => {
    if (builds.length === 1) return;
    const remaining = builds.filter((build) => build.id !== selected.id);
    setBuilds(remaining);
    if (activeId === selected.id) setActiveId(remaining[0].id);
    setSelectedId(remaining[0].id);
  };

  const updatePick = (id: string, patch: { outcome?: PickOutcome; units?: number }) => {
    setTrackedPicks((current) => current.map((pick) => pick.id === id ? { ...pick, ...patch } : pick));
  };

  return (
    <div className="product-page strategy-lab">
      <header className="product-hero">
        <div><Badge tone="accent"><FlaskConical size={12} /> STRATIQA LAB</Badge><h1>Build the model that finds your picks.</h1><p>Tune signal priorities, set a confidence floor, and promote a build directly into Matchup Intelligence.</p></div>
        <Link className="button button--secondary" href="/matchups"><Target size={15} /> Find picks</Link>
      </header>

      <section className="product-metrics">
        <Card><Metric value={`${builds.length}`} label="Strategy builds" detail={syncState === "synced" ? "Cloud synced" : "Saved locally"} /></Card>
        <Card><Metric value={`${metrics.winRate.toFixed(1)}%`} label="Tracked win rate" detail={`${metrics.settled} settled picks`} positive={metrics.winRate >= 50} /></Card>
        <Card><Metric value={`${metrics.profit >= 0 ? "+" : ""}${metrics.profit.toFixed(2)}u`} label="Tracked profit" detail={`${metrics.roi.toFixed(1)}% ROI`} positive={metrics.profit > 0} /></Card>
      </section>

      <div className="strategy-layout">
        <Card className="strategy-list">
          <header><span><Sparkles size={16} /> Your builds</span><button className="lab-icon-button" onClick={createBuild} title="Create build" aria-label="Create strategy build"><Plus size={15} /></button></header>
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
          <label className="strategy-description">Description<textarea value={selected.description} maxLength={140} onChange={(event) => updateSelected({ description: event.target.value })} /></label>
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
            <div><Button variant="ghost" onClick={deleteBuild} disabled={builds.length === 1} aria-label={`Delete ${selected.name}`}><Trash2 size={14} /></Button><Button onClick={() => setActiveId(selected.id)} disabled={activeId === selected.id}><Play size={14} /> {activeId === selected.id ? "Build active" : "Use this build"}</Button></div>
          </footer>
        </Card>
      </div>

      <section className="lab-results-grid">
        <Card className="backtest-card">
          <header><span><Activity size={16} /> Representative backtest</span><Badge tone="warning">SIMULATED</Badge></header>
          <div>
            <Metric value={`${backtest.winRate.toFixed(1)}%`} label="Win rate" detail={`${backtest.sample.toLocaleString()} picks`} positive />
            <Metric value={`+${backtest.roi.toFixed(1)}%`} label="ROI" detail="Flat 1u staking" positive />
            <Metric value={`${backtest.drawdown.toFixed(1)}u`} label="Max drawdown" detail="Peak to trough" />
            <Metric value={`${(88 + selected.weights.market * .08).toFixed(1)}%`} label="Calibration" detail="Confidence accuracy" positive />
          </div>
          <p>Representative historical simulation for product evaluation. Live performance begins when you track and settle picks.</p>
        </Card>

        <Card className="pick-ledger">
          <header><span><Trophy size={16} /> Pick performance ledger</span><Badge tone="success">{trackedPicks.length} TRACKED</Badge></header>
          {trackedPicks.length ? <div className="ledger-rows">
            {trackedPicks.map((pick) => (
              <div key={pick.id}>
                <span><strong>{pick.selection}</strong><small>{pick.buildName} · {pick.buildScore} fit · {pick.price > 0 ? "+" : ""}{pick.price}</small></span>
                <label>Units<input type="number" min=".25" max="10" step=".25" value={pick.units} onChange={(event) => updatePick(pick.id, { units: Math.max(.25, Number(event.target.value)) })} /></label>
                <select aria-label={`Outcome for ${pick.selection}`} value={pick.outcome} onChange={(event) => updatePick(pick.id, { outcome: event.target.value as PickOutcome })}>
                  <option value="pending">Pending</option><option value="won">Won</option><option value="lost">Lost</option><option value="push">Push</option>
                </select>
                <button onClick={() => setTrackedPicks((current) => current.filter((item) => item.id !== pick.id))} aria-label={`Remove ${pick.selection}`}><Trash2 size={14} /></button>
              </div>
            ))}
          </div> : <div className="ledger-empty"><Target size={24} /><strong>No tracked picks yet</strong><p>Open Matchups and track a recommendation generated by one of your builds.</p><Link href="/matchups">Find picks</Link></div>}
        </Card>
      </section>
    </div>
  );
}
