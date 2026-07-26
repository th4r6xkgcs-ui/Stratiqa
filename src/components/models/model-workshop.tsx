"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BrainCircuit, Check, ChevronDown, Gauge, Plus, Pencil, ShieldCheck, Sparkles, Target, Zap } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { factorWeights, modelIdentity } from "@/lib/models/profile";
import { addToSlip } from "@/lib/picks/slip";

type Performance = { verified: number; wins: number; losses: number; accuracy: number | null; rating: number };
type Model = { id: string; name: string; sport: string; category: string; description: string; factors: string[]; strategy: string; risk_profile: string; weights: Record<string, number>; version: number; status: string; performance: Performance };
type Recommendation = { id: string; modelId: string; modelName: string; category: string; title: string; selection: string; eventName: string; book: string; price: number; confidence: number; expectedValue: number; reasons: string[]; live: boolean; kind: "prop" | "matchup"; propId?: string; slug?: string; outcomeName?: string };
const sports = ["MLB", "NBA", "NFL", "NHL", "WNBA", "NCAAF", "NCAAB"];
const categories = [["player_prop", "Player Props", "Project individual player outcomes"], ["moneyline", "Game Winners", "Find the team most likely to win"], ["spread", "Point Spreads", "Measure performance against the line"], ["total", "Game Totals", "Project combined scoring"], ["live", "Live Markets", "React to in-game information"]];
const factorOptions = [
  ["market_value", "Best available price", "Find odds better than your projection"], ["recent_form", "Recent performance", "Reward meaningful form changes"],
  ["injuries", "Injuries & availability", "Adjust when important players change"], ["weather", "Weather & conditions", "Account for the playing environment"],
  ["matchup", "Matchup advantages", "Compare strengths against weaknesses"], ["line_movement", "Market movement", "Watch how sharp prices change"],
  ["player_usage", "Player opportunity", "Track minutes, touches, and roles"], ["bullpen", "Bullpen strength", "Measure late-game pitching depth"],
];
const riskOptions = [["selective", "Precision", "Fewer picks with stronger agreement"], ["balanced", "Balanced", "A practical mix of quality and opportunity"], ["opportunistic", "Explorer", "More chances when upside is compelling"]];
const label = (value: string) => factorOptions.find(([key]) => key === value)?.[1] ?? value.replace("_", " ");

export function ModelWorkshop() {
  const [models, setModels] = useState<Model[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [step, setStep] = useState(0);
  const [sport, setSport] = useState("MLB");
  const [category, setCategory] = useState("player_prop");
  const [selected, setSelected] = useState(["market_value", "recent_form", "matchup"]);
  const [strategy, setStrategy] = useState("market_value");
  const [risk, setRisk] = useState("balanced");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Loading your model roster…");
  useEffect(() => {
    fetch("/api/models").then(async (response) => ({ response, result: await response.json() })).then(({ response, result }) => {
      if (response.status === 401) return setStatus("Sign in to build and save your models.");
      if (!response.ok) return setStatus(result.error);
      setModels(result.models ?? []); setStatus("");
    }).catch(() => setStatus("Models could not be loaded."));
  }, []);
  const loadRecommendations = () => fetch("/api/models/recommendations", { cache: "no-store" }).then((response) => response.ok ? response.json() : { recommendations: [] }).then((result) => setRecommendations(result.recommendations ?? [])).catch(() => undefined);
  useEffect(() => { void loadRecommendations(); }, []);
  const profile = useMemo(() => modelIdentity(category, selected, risk), [category, selected, risk]);
  const suggestedName = `${sport} ${profile.archetype}`;
  const toggle = (factor: string) => setSelected((current) => current.includes(factor) ? current.length > 2 ? current.filter((item) => item !== factor) : current : [...current, factor]);
  const canContinue = step === 0 || (step === 1 && selected.length >= 2) || (step === 2 && (name.trim() || suggestedName));
  async function save() {
    setSaving(true);
    const response = await fetch("/api/models", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || suggestedName, sport, category, description, factors: selected, strategy, riskProfile: risk, weights: factorWeights(selected, strategy) }),
    });
    const result = await response.json(); setSaving(false);
    if (!response.ok) return setStatus(result.error);
    setModels((current) => [result.model, ...current]); setStatus(`${result.model.name} is ready for verified testing.`);
    void loadRecommendations();
    setStep(0); setName(""); setDescription("");
    document.querySelector(".model-roster")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return <div className="model-workshop-v2">
    <Card className="guided-model-builder">
      <header><div><span className="landing-kicker">GUIDED MODEL BUILDER</span><h2>{step === 0 ? "Choose your arena" : step === 1 ? "Teach it what matters" : "Meet your model"}</h2></div><Badge tone="accent">STEP {step + 1} OF 3</Badge></header>
      <div className="model-stepper">{[0, 1, 2].map((item) => <i className={item <= step ? "active" : ""} key={item}><b>{item < step ? <Check /> : item + 1}</b><span>{item === 0 ? "Focus" : item === 1 ? "Signals" : "Identity"}</span></i>)}</div>

      {step === 0 ? <section className="model-build-step"><div className="model-question"><Target /><div><h3>What should this model specialize in?</h3><p>One model masters one type of decision. You can build as many specialists as you want.</p></div></div><span className="model-field-title">Choose a sport</span><div className="model-sport-grid">{sports.map((item) => <button className={sport === item ? "selected" : ""} onClick={() => setSport(item)} key={item}>{item}<Check /></button>)}</div><span className="model-field-title">Choose a pick category</span><div className="model-category-grid">{categories.map(([value, title, copy]) => <button className={category === value ? "selected" : ""} onClick={() => setCategory(value)} key={value}><span><strong>{title}</strong><small>{copy}</small></span><Check /></button>)}</div></section> : null}

      {step === 1 ? <section className="model-build-step"><div className="model-question"><BrainCircuit /><div><h3>Which signals should earn its trust?</h3><p>Pick at least two. STRATIQA creates sensible weights automatically.</p></div></div><div className="model-factor-grid">{factorOptions.map(([value, title, copy]) => <button className={selected.includes(value) ? "selected" : ""} onClick={() => toggle(value)} key={value}><span><strong>{title}</strong><small>{copy}</small></span><Check /></button>)}</div><div className="model-primary-signal"><span><Sparkles /> Most important signal</span><select value={strategy} onChange={(event) => setStrategy(event.target.value)}>{selected.map((item) => <option value={item} key={item}>{label(item)}</option>)}</select></div></section> : null}

      {step === 2 ? <section className="model-build-step"><div className="model-identity-card"><div><Sparkles /><small>MODEL ARCHETYPE</small><strong>{profile.archetype}</strong><p>{sport} · {categories.find(([value]) => value === category)?.[1]}</p></div><Gauge /><span>{profile.discipline}<small>Discipline</small></span></div><span className="model-field-title">How often should it act?</span><div className="model-risk-grid">{riskOptions.map(([value, title, copy]) => <button className={risk === value ? "selected" : ""} onClick={() => setRisk(value)} key={value}><strong>{title}</strong><small>{copy}</small><Check /></button>)}</div><label className="model-name-field"><span><Pencil /> Give it a name <small>or keep our suggestion</small></span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder={suggestedName} /></label><details className="model-advanced"><summary>Optional model note</summary><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={300} placeholder="What should future-you remember about this model?" /></details><div className="model-build-summary"><span><b>{selected.length}</b> signals</span><span><b>{label(strategy)}</b> priority</span><span><b>1500</b> starting rating</span></div></section> : null}

      <footer>{step ? <Button variant="secondary" onClick={() => setStep((value) => value - 1)}><ArrowLeft /> Back</Button> : <span />}<Button disabled={!canContinue || saving} onClick={() => step < 2 ? setStep((value) => value + 1) : save()}>{saving ? "Building…" : step < 2 ? "Continue" : "Build My Model"} {step < 2 ? <ArrowRight /> : <Zap />}</Button></footer>
    </Card>

    {models.length ? <section className="model-recommendations"><header><div><span className="landing-kicker">YOUR MODELS&apos; BOARD</span><h2>Markets your specialists understand</h2><p>These are matches, not guarantees. Open the reasoning, then decide what deserves your slip.</p></div><Badge tone={recommendations.some((item) => item.live) ? "success" : "warning"}>{recommendations.some((item) => item.live) ? "LIVE LINES" : "ANALYSIS MODE"}</Badge></header>{recommendations.length ? <div>{recommendations.slice(0, 6).map((item) => <Card className="model-recommendation-card" key={item.id}><header><span><BrainCircuit /> {item.modelName}</span><Badge tone={item.live ? "success" : "warning"}>{item.live ? "VERIFIABLE" : "WATCHLIST"}</Badge></header><small>{item.eventName}</small><h3>{item.title}</h3><div className="recommendation-score"><span><b>{item.confidence}%</b>Model fit</span><span><b>+{item.expectedValue.toFixed(1)}%</b>Market EV</span><span><b>{item.price > 0 ? "+" : ""}{item.price}</b>{item.book}</span></div><details><summary>Why it fits this model <ChevronDown /></summary><ul>{item.reasons.map((reason) => <li key={reason}><Check /> {reason}</li>)}</ul></details><Button onClick={() => addToSlip({ id: item.id, kind: item.kind, propId: item.propId, slug: item.slug, outcomeName: item.outcomeName, selection: item.selection, eventName: item.eventName, book: item.book, price: item.price, confidence: item.confidence, expectedValue: item.expectedValue, live: item.live, origin: "model", modelId: item.modelId, modelName: item.modelName })}><Plus /> Add as {item.modelName} pick</Button></Card>)}</div> : <Card className="model-empty"><Target /><h3>No compatible markets right now</h3><p>Your models are ready. Their board will populate when supported markets are available.</p></Card>}</section> : null}

    <section className="model-roster">
      <header><div><span className="landing-kicker">YOUR MODEL TEAM</span><h2>Build specialists. Prove them with real picks.</h2><p>Each model earns its own verified record and rating in its category.</p></div><Badge>{models.length} MODELS</Badge></header>
      {models.length ? <div>{models.map((model) => {
        const modelProfile = modelIdentity(model.category, model.factors, model.risk_profile);
        return <Card key={model.id} className="model-performance-card"><header><div><BrainCircuit /><span><small>{model.sport} · {model.category.replace("_", " ")}</small><strong>{model.name}</strong></span></div><Badge tone={model.performance.verified >= 10 ? "success" : "warning"}>{model.performance.verified >= 10 ? "RATED" : "PROVISIONAL"}</Badge></header><div className="model-rating"><strong>{model.performance.rating}</strong><span>{modelProfile.archetype}<small>{model.performance.verified} verified picks</small></span></div><div className="model-record"><span><b>{model.performance.accuracy === null ? "—" : `${model.performance.accuracy}%`}</b>Accuracy</span><span><b>{model.performance.wins}-{model.performance.losses}</b>Record</span><span><b>v{model.version}</b>Version</span></div><div className="model-strengths">{model.factors.slice(0, 4).map((factor) => <span key={factor}>{label(factor)}</span>)}</div><footer><ShieldCheck /> Verified model picks count toward both your overall record and this model</footer></Card>;
      })}</div> : <Card className="model-empty"><BrainCircuit /><h3>Your first specialist is three simple steps away</h3><p>Choose its category, teach it what matters, and let verified picks build its reputation.</p></Card>}
    </section>{status ? <p className="ledger-status" role="status">{status}</p> : null}
  </div>;
}
