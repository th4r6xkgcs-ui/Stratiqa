"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BrainCircuit, Check, ChevronDown, Clock3, EyeOff, Gauge, GitCompareArrows, History, Plus, Pencil, ShieldCheck, Sparkles, Target, Users, Zap } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { factorWeights, modelIdentity } from "@/lib/models/profile";
import { addToSlip } from "@/lib/picks/slip";
import { ModelCommandCenter, type ManagedModel } from "@/components/models/model-command-center";
import { ModelArena } from "@/components/models/model-arena";
import { ModelImprovementStudio, type ImprovementStudioData } from "@/components/models/model-improvement-studio";
import { ModelLeague, type ModelLeagueData } from "@/components/models/model-league";
import { ModelPromotionPath } from "@/components/models/model-promotion-path";

type Model = ManagedModel;
type Signal = { factor: string; weight: number; signal: number; contribution: number };
type Recommendation = { id: string; modelId: string; modelName: string; category: string; title: string; selection: string; eventName: string; book: string; price: number; confidence: number; expectedValue: number; threshold: number; decision: "recommend" | "pass"; signalAgreement: number; signals: Signal[]; reasons: string[]; modelAgreement?: number; live: boolean; kind: "prop" | "matchup"; propId?: string; slug?: string; outcomeName?: string };
type ModelDesk = { bestEdge: Recommendation | null; safest: Recommendation | null; consensus: Recommendation[]; disagreements: Recommendation[]; passes: number };
type MemoryItem = { id: string; model_id: string; model_version: number; event_name: string; selection: string; model_score: number; qualification_threshold: number; decision: "recommend" | "pass"; result: "win" | "loss" | "push" | null; observed_at: string };
type Calibration = { resolved: number; unresolved: number; passes: number; buckets: Array<{ label: string; min: number; max: number; sample: number; wins: number; actual: number | null }> };
const sports = ["MLB", "NBA", "NFL", "NHL", "WNBA", "NCAAF", "NCAAB"];
const categories = [["player_prop", "Player Props", "Project individual player outcomes"], ["moneyline", "Game Winners", "Find the team most likely to win"], ["spread", "Point Spreads", "Measure performance against the line"], ["total", "Game Totals", "Project combined scoring"], ["live", "Live Markets", "React to in-game information"]];
const factorOptions = [
  ["market_value", "Best available price", "Find odds better than your projection"], ["recent_form", "Recent performance", "Reward meaningful form changes"],
  ["injuries", "Injuries & availability", "Adjust when important players change"], ["weather", "Weather & conditions", "Account for the playing environment"],
  ["matchup", "Matchup advantages", "Compare strengths against weaknesses"], ["line_movement", "Market movement", "Watch how sharp prices change"],
  ["player_usage", "Player opportunity", "Track minutes, touches, and roles"], ["bullpen", "Bullpen strength", "Measure late-game pitching depth"],
];
const riskOptions = [["selective", "Precision", "Fewer picks with stronger agreement"], ["balanced", "Balanced", "A practical mix of quality and opportunity"], ["opportunistic", "Explorer", "More chances when upside is compelling"]];
const templates = [
  { name: "Value Hunter", category: "moneyline", factors: ["market_value", "line_movement", "matchup"], strategy: "market_value", risk: "selective" },
  { name: "Props Specialist", category: "player_prop", factors: ["player_usage", "recent_form", "matchup"], strategy: "player_usage", risk: "balanced" },
  { name: "Totals Reader", category: "total", factors: ["recent_form", "weather", "matchup"], strategy: "matchup", risk: "balanced" },
  { name: "Spread Analyst", category: "spread", factors: ["market_value", "injuries", "recent_form"], strategy: "injuries", risk: "selective" },
];
const label = (value: string) => factorOptions.find(([key]) => key === value)?.[1] ?? value.replace("_", " ");
const impliedProbability = (americanOdds: number) => americanOdds > 0 ? 100 / (americanOdds + 100) * 100 : Math.abs(americanOdds) / (Math.abs(americanOdds) + 100) * 100;
const signalContribution = (signal: Signal) => signal.contribution || signal.signal * signal.weight / 100;

export function ModelWorkshop() {
  const [models, setModels] = useState<Model[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [passes, setPasses] = useState<Recommendation[]>([]);
  const [desk, setDesk] = useState<ModelDesk | null>(null);
  const [memory, setMemory] = useState<MemoryItem[]>([]);
  const [calibration, setCalibration] = useState<Calibration | null>(null);
  const [studio, setStudio] = useState<ImprovementStudioData | null>(null);
  const [league, setLeague] = useState<ModelLeagueData | null>(null);
  const [step, setStep] = useState(0);
  const [sport, setSport] = useState("MLB");
  const [category, setCategory] = useState("player_prop");
  const [selected, setSelected] = useState(["market_value", "recent_form", "matchup"]);
  const [strategy, setStrategy] = useState("market_value");
  const [risk, setRisk] = useState("balanced");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [weights, setWeights] = useState<Record<string, number>>(() => factorWeights(selected, strategy));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Loading your model roster…");
  useEffect(() => {
    fetch("/api/models").then(async (response) => ({ response, result: await response.json() })).then(({ response, result }) => {
      if (response.status === 401) return setStatus("Sign in to build and save your models.");
      if (!response.ok) return setStatus(result.error);
      setModels(result.models ?? []); setStatus("");
    }).catch(() => setStatus("Models could not be loaded."));
  }, []);
  const loadMemory = useCallback(() => fetch("/api/models/history", { cache: "no-store" }).then((response) => response.ok ? response.json() : { history: [] }).then((result) => { setMemory(result.history ?? []); setCalibration(result.calibration ?? null); setStudio(result.studio ?? null); setLeague(result.league ?? null); }).catch(() => undefined), []);
  const loadRecommendations = useCallback(() => fetch("/api/models/recommendations", { cache: "no-store" }).then((response) => response.ok ? response.json() : { recommendations: [] }).then((result) => { setRecommendations(result.recommendations ?? []); setPasses(result.passes ?? []); setDesk(result.desk ?? null); void loadMemory(); }).catch(() => undefined), [loadMemory]);
  useEffect(() => { void loadRecommendations(); }, [loadRecommendations]);
  const profile = useMemo(() => modelIdentity(category, selected, risk), [category, selected, risk]);
  const suggestedName = `${sport} ${profile.archetype}`;
  const selectedWeightTotal = selected.reduce((total, factor) => total + (weights[factor] ?? 0), 0);
  const toggle = (factor: string) => setSelected((current) => {
    const next = current.includes(factor) ? current.length > 2 ? current.filter((item) => item !== factor) : current : [...current, factor];
    setWeights((value) => ({ ...factorWeights(next, next.includes(strategy) ? strategy : next[0]), ...Object.fromEntries(next.filter((item) => value[item] !== undefined).map((item) => [item, value[item]])) }));
    if (!next.includes(strategy)) setStrategy(next[0]);
    return next;
  });
  const applyTemplate = (template: typeof templates[number]) => {
    setCategory(template.category); setSelected(template.factors); setStrategy(template.strategy); setRisk(template.risk);
    setWeights(factorWeights(template.factors, template.strategy)); setName(`${sport} ${template.name}`);
  };
  const canContinue = step === 0 || (step === 1 && selected.length >= 2) || (step === 2 && (name.trim() || suggestedName));
  async function save() {
    setSaving(true);
    const response = await fetch("/api/models", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || suggestedName, sport, category, description, factors: selected, strategy, riskProfile: risk, weights }),
    });
    const result = await response.json(); setSaving(false);
    if (!response.ok) return setStatus(result.error);
    setModels((current) => [result.model, ...current]); setStatus(`${result.model.name} is ready for verified testing.`);
    void loadRecommendations();
    setStep(0); setName(""); setDescription("");
    document.querySelector(".model-command-center")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return <div className="model-workshop-v2">
    <Card className="guided-model-builder">
      <header><div><span className="landing-kicker">GUIDED MODEL BUILDER</span><h2>{step === 0 ? "Choose your arena" : step === 1 ? "Teach it what matters" : "Meet your model"}</h2></div><Badge tone="accent">STEP {step + 1} OF 3</Badge></header>
      <div className="model-stepper">{[0, 1, 2].map((item) => <i className={item <= step ? "active" : ""} key={item}><b>{item < step ? <Check /> : item + 1}</b><span>{item === 0 ? "Focus" : item === 1 ? "Signals" : "Identity"}</span></i>)}</div>

      {step === 0 ? <section className="model-build-step"><div className="model-question"><Target /><div><h3>What should this model specialize in?</h3><p>One model masters one type of decision. You can build as many specialists as you want.</p></div></div><span className="model-field-title">Start from a proven structure</span><div className="model-template-grid">{templates.map((template) => <button onClick={() => applyTemplate(template)} key={template.name}><Sparkles /><span><strong>{template.name}</strong><small>{categories.find(([value]) => value === template.category)?.[1]} · fully adjustable</small></span><ArrowRight /></button>)}</div><span className="model-field-title">Choose a sport</span><div className="model-sport-grid">{sports.map((item) => <button className={sport === item ? "selected" : ""} onClick={() => setSport(item)} key={item}>{item}<Check /></button>)}</div><span className="model-field-title">Choose a pick category</span><div className="model-category-grid">{categories.map(([value, title, copy]) => <button className={category === value ? "selected" : ""} onClick={() => setCategory(value)} key={value}><span><strong>{title}</strong><small>{copy}</small></span><Check /></button>)}</div></section> : null}

      {step === 1 ? <section className="model-build-step"><div className="model-question"><BrainCircuit /><div><h3>Which signals should earn its trust?</h3><p>Pick at least two, then tune how much influence each signal receives.</p></div></div><div className="model-factor-grid">{factorOptions.map(([value, title, copy]) => <button className={selected.includes(value) ? "selected" : ""} onClick={() => toggle(value)} key={value}><span><strong>{title}</strong><small>{copy}</small></span><Check /></button>)}</div><div className="model-primary-signal"><span><Sparkles /> Most important signal</span><select value={strategy} onChange={(event) => { const next = event.target.value; setStrategy(next); setWeights((current) => ({ ...current, [next]: Math.max(35, current[next] ?? 35) })); }}>{selected.map((item) => <option value={item} key={item}>{label(item)}</option>)}</select></div><div className="model-weight-editor"><header><span>Signal influence</span><small>Higher numbers give a signal more influence. You can revise this in a new version later.</small></header>{selected.map((factor) => <label key={factor}><span><strong>{label(factor)}</strong><b>{weights[factor] ?? 20}%</b></span><input type="range" min="5" max="60" step="5" value={weights[factor] ?? 20} onChange={(event) => setWeights((current) => ({ ...current, [factor]: Number(event.target.value) }))} /></label>)}</div><details className="model-signal-explainer"><summary><BrainCircuit /> Understand this signal mix <ChevronDown /></summary><p>Your sliders are relative influence, not a probability forecast. STRATIQA normalizes them when the model scores a market.</p><div>{selected.map((factor) => <span key={factor}><b>{label(factor)}</b><small>{Math.round((weights[factor] ?? 0) / Math.max(1, selectedWeightTotal) * 100)}% of this model&apos;s current influence</small></span>)}</div><footer><ShieldCheck /> Only information available before the game is used when the model records a recommendation.</footer></details></section> : null}

      {step === 2 ? <section className="model-build-step"><div className="model-identity-card"><div><Sparkles /><small>MODEL ARCHETYPE</small><strong>{profile.archetype}</strong><p>{sport} · {categories.find(([value]) => value === category)?.[1]}</p></div><Gauge /><span>{profile.discipline}<small>Discipline</small></span></div><span className="model-field-title">How often should it act?</span><div className="model-risk-grid">{riskOptions.map(([value, title, copy]) => <button className={risk === value ? "selected" : ""} onClick={() => setRisk(value)} key={value}><strong>{title}</strong><small>{copy}</small><Check /></button>)}</div><label className="model-name-field"><span><Pencil /> Give it a name <small>or keep our suggestion</small></span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder={suggestedName} /></label><details className="model-advanced"><summary>Optional model note</summary><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={300} placeholder="What should future-you remember about this model?" /></details><div className="model-build-summary"><span><b>{selected.length}</b> signals</span><span><b>{label(strategy)}</b> priority</span><span><b>1500</b> starting rating</span></div></section> : null}

      <footer>{step ? <Button variant="secondary" onClick={() => setStep((value) => value - 1)}><ArrowLeft /> Back</Button> : <span />}<Button disabled={!canContinue || saving} onClick={() => step < 2 ? setStep((value) => value + 1) : save()}>{saving ? "Building…" : step < 2 ? "Continue" : "Build My Model"} {step < 2 ? <ArrowRight /> : <Zap />}</Button></footer>
    </Card>

    <details className="model-learning-hub">
      <summary><BrainCircuit /><span><strong>Model Builder Field Guide</strong><small>Open the detail when you want to understand the evidence behind a signal.</small></span><ChevronDown /></summary>
      <div className="model-learning-grid">{factorOptions.map(([factor, title, copy]) => <article key={factor}><strong>{title}</strong><p>{copy}</p><small>{factor === "market_value" ? "Compares your model projection with the available pregame price." : factor === "line_movement" ? "Records how a pregame market moved; it never creates a late or live pick." : factor === "injuries" ? "Uses availability context, but questionable designations should stay a reason to be cautious." : factor === "weather" ? "Most useful for outdoor sports; it has limited relevance to indoor leagues." : factor === "player_usage" ? "Measures expected opportunity such as minutes, touches, and role—not a guarantee of production." : factor === "bullpen" ? "MLB-specific late-inning depth context." : "Combines the relevant pregame matchup context for that market."}</small></article>)}</div>
      <footer><ShieldCheck /> A model earns trust from automatically verified, forward-looking results—not from simulated backtests or self-reported outcomes.</footer>
    </details>

    {models.length ? <><ModelArena models={models} /><ModelPromotionPath models={models} /></> : null}

    {models.length && desk ? <section className="model-desk"><header><div><span className="landing-kicker">DAILY MODEL DESK</span><h2>Your systems&apos; clearest decisions</h2><p>Agreement is earned independently. Passed markets stay informational and never become user picks.</p></div><Badge tone="accent">{recommendations.length} QUALIFIED</Badge></header><div><Card><Sparkles /><span><small>BEST VALUE EDGE</small><strong>{desk.bestEdge?.selection ?? "No qualified edge"}</strong><p>{desk.bestEdge ? `${desk.bestEdge.modelName} · +${desk.bestEdge.expectedValue.toFixed(1)}% EV` : "Your models chose patience today."}</p></span></Card><Card><ShieldCheck /><span><small>SAFEST QUALIFIED EDGE</small><strong>{desk.safest?.selection ?? "No qualified edge"}</strong><p>{desk.safest ? `${desk.safest.confidence}% fit · ${desk.safest.signalAgreement}% signal agreement` : "No market cleared the threshold."}</p></span></Card><Card><Users /><span><small>MODEL CONSENSUS</small><strong>{desk.consensus.length > 1 ? desk.consensus[0].selection : "No consensus yet"}</strong><p>{desk.consensus.length > 1 ? `${desk.consensus.length} models independently agree` : "Models are evaluating different edges."}</p></span></Card><Card><EyeOff /><span><small>DISCIPLINED PASSES</small><strong>{desk.passes}</strong><p>Weak markets rejected instead of forced into picks.</p></span></Card></div>{desk.disagreements.length ? <aside><GitCompareArrows /><span><strong>Model disagreement</strong><small>{desk.disagreements.map((item) => `${item.modelName}: ${item.selection}`).join(" · ")}</small></span></aside> : null}</section> : null}

    {models.length && calibration ? <section className="model-memory"><header><div><span className="landing-kicker">RECOMMENDATION MEMORY</span><h2>Confidence that proves itself over time</h2><p>Only exact, automatically verified matches enter calibration. Unresolved observations remain visible but unscored.</p></div><Badge tone={calibration.resolved >= 10 ? "success" : "warning"}>{calibration.resolved} RESOLVED</Badge></header><div className="model-memory-grid"><Card className="model-calibration"><header><Gauge /><span><strong>Confidence calibration</strong><small>Model score compared with actual tracked outcomes</small></span></header><div>{calibration.buckets.map((bucket) => <article key={bucket.label}><span><strong>{bucket.label}</strong><small>{bucket.sample} matched result{bucket.sample === 1 ? "" : "s"}</small></span><i><em style={{ width: `${bucket.actual ?? 0}%` }} /></i><b>{bucket.actual === null ? "N/A" : `${bucket.actual}%`}<small>actual wins</small></b></article>)}</div><footer><span><b>{calibration.unresolved}</b> awaiting a matched official result</span><span><b>{calibration.passes}</b> passes preserved</span></footer></Card><Card className="model-audit"><header><History /><span><strong>Immutable audit trail</strong><small>What each version believed before the event</small></span></header>{memory.length ? <div>{memory.slice(0, 8).map((item) => <article key={item.id}><i className={item.result ?? item.decision}>{item.result ? item.result.slice(0, 1).toUpperCase() : item.decision === "pass" ? <EyeOff /> : <Clock3 />}</i><span><strong>{item.selection}</strong><small>v{item.model_version} · {item.event_name} · {new Date(item.observed_at).toLocaleDateString()}</small></span><b>{item.model_score}<small>needed {item.qualification_threshold}</small></b></article>)}</div> : <div className="model-memory-empty"><Clock3 /><strong>Memory begins with today&apos;s board</strong><p>Refresh the Model Desk after migration to capture the first immutable snapshots.</p></div>}</Card></div></section> : null}

    {models.length && studio ? <ModelImprovementStudio studio={studio} models={models} onModels={setModels} onStatus={setStatus} /> : null}

    {models.length && league ? <ModelLeague league={league} /> : null}

    {models.length ? <section className="model-recommendations"><header><div><span className="landing-kicker">YOUR MODELS&apos; BOARD</span><h2>Markets your specialists understand</h2><p>These are matches, not guarantees. Open the weighted reasoning, then decide what deserves your slip.</p></div><Badge tone={recommendations.some((item) => item.live) ? "success" : "warning"}>{recommendations.some((item) => item.live) ? "PREGAME LINES" : "ANALYSIS MODE"}</Badge></header>{recommendations.length ? <div>{recommendations.slice(0, 8).map((item) => {
      const signals = [...item.signals].sort((left, right) => signalContribution(right) - signalContribution(left));
      const strongest = signals[0]; const weakest = signals.at(-1); const implied = impliedProbability(item.price);
      return <Card className="model-recommendation-card" key={item.id}><header><span><BrainCircuit /> {item.modelName}</span><Badge tone={(item.modelAgreement ?? 1) > 1 ? "success" : item.live ? "success" : "warning"}>{(item.modelAgreement ?? 1) > 1 ? `${item.modelAgreement} MODEL CONSENSUS` : item.live ? "LOCK BEFORE START" : "WATCHLIST"}</Badge></header><small>{item.eventName}</small><h3>{item.title}</h3><div className="recommendation-score"><span><b>{item.confidence}%</b>Model fit</span><span><b>+{item.expectedValue.toFixed(1)}%</b>Market EV</span><span><b>{item.signalAgreement}%</b>Signals aligned</span></div><details><summary>Weighted model reasoning <ChevronDown /></summary><ul>{item.reasons.map((reason) => <li key={reason}><Check /> {reason}</li>)}</ul><div className="recommendation-signals">{signals.slice(0, 4).map((signal) => <span key={signal.factor}><small>{label(signal.factor)} · {signal.weight}% weight</small><i><em style={{ width: `${signal.signal}%` }} /></i><b>{Math.round(signal.signal)}</b></span>)}</div></details><details className="recommendation-decision-brief"><summary><BrainCircuit /> Explain this decision <ChevronDown /></summary><div><span><small>Market price</small><b>{item.price > 0 ? "+" : ""}{item.price}</b><em>{implied.toFixed(1)}% implied</em></span><span><small>Model threshold</small><b>{item.confidence}/{item.threshold}</b><em>+{Math.max(0, item.confidence - item.threshold)} above minimum</em></span><span><small>Strongest evidence</small><b>{strongest ? label(strongest.factor) : "Awaiting data"}</b><em>{strongest ? `${Math.round(strongest.signal)} signal at ${strongest.weight}% weight` : ""}</em></span><span><small>Counter-case</small><b>{weakest ? label(weakest.factor) : "No conflict"}</b><em>{weakest ? `${Math.round(weakest.signal)} signal still considered` : ""}</em></span></div><footer><ShieldCheck /> This is a pregame model explanation, not a promise of an outcome. The recommendation is recorded before start and judged only after official settlement.</footer></details><Button onClick={() => addToSlip({ id: item.id, kind: item.kind, propId: item.propId, slug: item.slug, outcomeName: item.outcomeName, selection: item.selection, eventName: item.eventName, book: item.book, price: item.price, confidence: item.confidence, expectedValue: item.expectedValue, live: item.live, origin: "model", modelId: item.modelId, modelName: item.modelName })}><Plus /> Review in my slip</Button></Card>;
    })}</div> : <Card className="model-empty"><Target /><h3>Your models passed today</h3><p>No supported market cleared their configured thresholds. A disciplined no-bet is a valid model decision.</p></Card>}{passes.length ? <details className="model-pass-log"><summary><EyeOff /> Show {passes.length} highest-scoring passes <ChevronDown /></summary><div>{passes.map((item) => <article key={item.id}><span><strong>{item.modelName}</strong><small>{item.eventName} · {item.selection}</small></span><b>{item.confidence}/{item.threshold}<small>score / needed</small></b></article>)}</div></details> : null}</section> : null}

    {models.length ? <ModelCommandCenter models={models} onModels={setModels} onStatus={setStatus} /> : <Card className="model-empty"><BrainCircuit /><h3>Your first specialist is three simple steps away</h3><p>Choose its category, teach it what matters, and let verified picks build its reputation.</p></Card>}{status ? <p className="ledger-status" role="status">{status}</p> : null}
  </div>;
}
