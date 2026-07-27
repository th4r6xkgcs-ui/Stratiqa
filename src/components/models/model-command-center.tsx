"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, BrainCircuit, Check, Copy, GitCompareArrows, History, Pencil, RotateCcw, ShieldCheck, Sparkles, X } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { factorWeights, modelIdentity } from "@/lib/models/profile";
import { promotionReadiness } from "@/lib/models/validation.js";

type Performance = { verified: number; wins: number; losses: number; pushes?: number; accuracy: number | null; rating: number; roi?: number | null; recentVerified?: number; sample?: string };
export type ManagedModel = { id: string; name: string; sport: string; category: string; description: string; factors: string[]; strategy: string; risk_profile: string; weights: Record<string, number>; version: number; status: string; performance: Performance };
const factorOptions = [["market_value", "Price"], ["recent_form", "Recent form"], ["injuries", "Availability"], ["weather", "Conditions"], ["matchup", "Matchup"], ["line_movement", "Market movement"], ["player_usage", "Player usage"], ["bullpen", "Bullpen"]];
const factorLabel = (value: string) => factorOptions.find(([key]) => key === value)?.[1] ?? value.replace("_", " ");

function guidance(model: ManagedModel) {
  if (model.performance.verified < 5) return `Give it ${5 - model.performance.verified} more verified pick${5 - model.performance.verified === 1 ? "" : "s"} before changing its core signals.`;
  if ((model.performance.accuracy ?? 0) >= 58) return "This specialist is showing promise. Preserve this version and test it on more matching markets.";
  if (model.performance.rating < 1450) return `Create an experiment and reconsider ${factorLabel(model.strategy).toLowerCase()} as the primary signal.`;
  return "The sample is developing normally. Keep collecting verified evidence before making a major revision.";
}

export function ModelCommandCenter({ models, onModels, onStatus }: { models: ManagedModel[]; onModels: (models: ManagedModel[]) => void; onStatus: (status: string) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<ManagedModel | null>(null);
  const [history, setHistory] = useState<Array<ManagedModel & { current?: boolean; archived_at?: string }> | null>(null);
  const [working, setWorking] = useState("");
  const compared = useMemo(() => selected.map((id) => models.find((model) => model.id === id)).filter(Boolean) as ManagedModel[], [models, selected]);
  const select = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 2 ? [...current, id] : [current[1], id]);
  async function action(model: ManagedModel, actionName: "promote" | "retire" | "restore" | "duplicate") {
    setWorking(`${model.id}:${actionName}`);
    const response = await fetch(`/api/models/${model.id}`, { method: actionName === "duplicate" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: actionName === "duplicate" ? undefined : JSON.stringify({ action: actionName }) });
    const result = await response.json(); setWorking("");
    if (!response.ok) return onStatus(result.error);
    if (actionName === "duplicate") {
      onModels([{ ...result.model, performance: { verified: 0, wins: 0, losses: 0, accuracy: null, rating: 1500 } }, ...models]);
      return onStatus(`${result.model.name} is ready as a separate experiment.`);
    }
    onModels(models.map((item) => item.id === model.id ? { ...item, ...result.model } : item));
    onStatus(actionName === "promote" ? `${model.name} joined your active lineup.` : actionName === "retire" ? `${model.name} retired. Its history is preserved.` : `${model.name} returned to testing.`);
  }
  async function saveEdit() {
    if (!editing) return;
    setWorking(`${editing.id}:edit`);
    const response = await fetch(`/api/models/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editing.name, description: editing.description, factors: editing.factors, strategy: editing.strategy, riskProfile: editing.risk_profile, weights: factorWeights(editing.factors, editing.strategy) }) });
    const result = await response.json(); setWorking("");
    if (!response.ok) return onStatus(result.error);
    onModels(models.map((item) => item.id === editing.id ? { ...item, ...result.model } : item));
    setEditing(null); onStatus(`${result.model.name} is now v${result.model.version}. Earlier picks still belong to their original versions.`);
  }
  async function openHistory(model: ManagedModel) {
    setWorking(`${model.id}:history`);
    const response = await fetch(`/api/models/${model.id}`, { cache: "no-store" });
    const result = await response.json(); setWorking("");
    if (!response.ok) return onStatus(result.error);
    setHistory(result.versions);
  }
  const toggleEditFactor = (factor: string) => {
    if (!editing) return;
    const next = editing.factors.includes(factor) ? editing.factors.length > 2 ? editing.factors.filter((item) => item !== factor) : editing.factors : [...editing.factors, factor];
    setEditing({ ...editing, factors: next, strategy: next.includes(editing.strategy) ? editing.strategy : next[0] });
  };
  return <section className="model-command-center">
    <header><div><span className="landing-kicker">MODEL COMMAND CENTER</span><h2>Coach your model team</h2><p>Improve specialists without rewriting what they did before.</p></div><Badge tone="accent">{models.filter((model) => model.status === "live").length} ACTIVE</Badge></header>
    {compared.length === 2 ? <Card className="model-comparison"><header><span><GitCompareArrows /> HEAD-TO-HEAD</span><button onClick={() => setSelected([])}><X /></button></header><div>{compared.map((model) => <article key={model.id}><small>{model.sport} · {model.category.replace("_", " ")}</small><h3>{model.name}</h3><strong>{model.performance.rating}<small> rating</small></strong><p>{model.performance.accuracy === null ? "No decisions yet" : `${model.performance.accuracy}% accuracy`} · {model.performance.verified} verified</p><span>{modelIdentity(model.category, model.factors, model.risk_profile).archetype}</span></article>)}</div><footer><Sparkles /> {compared[0].performance.verified + compared[1].performance.verified < 10 ? "Both samples are still small. Compare their process before declaring a winner." : compared[0].performance.rating >= compared[1].performance.rating ? `${compared[0].name} currently leads on verified rating.` : `${compared[1].name} currently leads on verified rating.`}</footer></Card> : null}
    <div className="command-model-grid">{models.map((model) => { const readiness = promotionReadiness(model.performance); return <Card className={`command-model-card ${model.status}`} key={model.id}><header><button className={selected.includes(model.id) ? "selected" : ""} onClick={() => select(model.id)} aria-label={`Compare ${model.name}`}><GitCompareArrows /></button><Badge tone={model.status === "live" ? "success" : model.status === "retired" ? "neutral" : "warning"}>{model.status}</Badge></header><div className="command-model-identity"><BrainCircuit /><span><small>{model.sport} · {model.category.replace("_", " ")} · v{model.version}</small><h3>{model.name}</h3></span></div><div className="command-model-score"><strong>{model.performance.rating}</strong><span>{model.performance.accuracy === null ? "—" : `${model.performance.accuracy}%`}<small>accuracy</small></span><span>{model.performance.verified}<small>verified</small></span></div><div className="model-validation-strip"><span><b>{model.performance.roi === null || model.performance.roi === undefined ? "N/A" : `${Number(model.performance.roi).toFixed(1)}%`}</b><small>verified ROI</small></span><span><b>{model.performance.recentVerified ?? 0}</b><small>last 30 days</small></span><span><b>{model.performance.sample ?? "early"}</b><small>sample quality</small></span></div>{model.status === "testing" ? <div className="model-promotion-readiness"><header><span>Promotion readiness</span><b>{readiness.ready ? "READY" : `${readiness.checks[0].remaining} TO GO`}</b></header><i><em style={{ width: `${Math.min(100, model.performance.verified / 5 * 100)}%` }} /></i><small>Promotion unlocks after five automatically verified recommendations.</small></div> : null}<p className="model-coach-note"><Sparkles /> {guidance(model)}</p><div className="command-model-actions"><button onClick={() => setEditing(model)}><Pencil /> Improve</button><button disabled={working === `${model.id}:duplicate`} onClick={() => action(model, "duplicate")}><Copy /> Experiment</button><button onClick={() => openHistory(model)}><History /> Versions</button>{model.status === "retired" ? <button onClick={() => action(model, "restore")}><RotateCcw /> Restore</button> : model.status === "live" ? <button onClick={() => action(model, "retire")}><X /> Retire</button> : <button disabled={!readiness.ready} title={!readiness.ready ? "Five verified recommendations required" : "Promote to active lineup"} onClick={() => action(model, "promote")}><ArrowUpRight /> Promote</button>}</div><footer><ShieldCheck /> Forward-tested on immutable verified results—no simulated claims</footer></Card>; })}</div>
    {editing ? <div className="model-editor-backdrop"><Card className="model-editor"><header><div><span className="landing-kicker">CREATE VERSION {editing.version + 1}</span><h2>Improve {editing.name}</h2></div><button onClick={() => setEditing(null)}><X /></button></header><p>Changes create a new version. Existing verified picks remain attached to the configuration that produced them.</p><label>Model name<input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></label><span className="model-field-title">Signals</span><div className="model-editor-factors">{factorOptions.map(([value, title]) => <button className={editing.factors.includes(value) ? "selected" : ""} onClick={() => toggleEditFactor(value)} key={value}>{title}<Check /></button>)}</div><label>Primary signal<select value={editing.strategy} onChange={(event) => setEditing({ ...editing, strategy: event.target.value })}>{editing.factors.map((factor) => <option value={factor} key={factor}>{factorLabel(factor)}</option>)}</select></label><label>Style<select value={editing.risk_profile} onChange={(event) => setEditing({ ...editing, risk_profile: event.target.value })}><option value="selective">Precision</option><option value="balanced">Balanced</option><option value="opportunistic">Explorer</option></select></label><label>Model note<textarea value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} /></label><footer><Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={working === `${editing.id}:edit`} onClick={saveEdit}><History /> {working ? "Saving…" : "Save New Version"}</Button></footer></Card></div> : null}
    {history ? <div className="model-editor-backdrop"><Card className="model-editor model-history"><header><div><span className="landing-kicker">VERIFIED VERSION COMPARISON</span><h2>{history[0]?.name} versions</h2></div><button onClick={() => setHistory(null)}><X /></button></header><p>Every result stays attached to the version that produced it. This is real forward-test evidence, not a simulated backtest.</p><div>{history.map((version) => <article key={version.version}><span><b>v{version.version}</b>{version.current ? <Badge tone="success">CURRENT</Badge> : <Badge>ARCHIVED</Badge>}</span><strong>{version.name}</strong><small>{factorLabel(version.strategy)} first · {version.factors.length} signals · {version.risk_profile}</small><div className="model-version-results"><span><b>{version.performance?.verified ?? 0}</b> verified</span><span><b>{version.performance?.accuracy === null || version.performance?.accuracy === undefined ? "—" : `${version.performance.accuracy}%`}</b> accuracy</span><span><b>{version.performance?.roi === null || version.performance?.roi === undefined ? "N/A" : `${version.performance.roi}%`}</b> ROI</span></div></article>)}</div><footer><Button onClick={() => setHistory(null)}>Done</Button></footer></Card></div> : null}
  </section>;
}
