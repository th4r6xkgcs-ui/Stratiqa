"use client";

import { FormEvent, useEffect, useState } from "react";
import { BrainCircuit, Check, FlaskConical, Plus, ShieldCheck } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";

type Model = { id: string; name: string; sport: string; category: string; description: string; factors: string[]; version: number; status: string };
const factorOptions = [["market_value", "Market value"], ["recent_form", "Recent form"], ["injuries", "Injuries"], ["weather", "Weather"], ["matchup", "Matchup quality"], ["line_movement", "Line movement"], ["player_usage", "Player usage"], ["bullpen", "Bullpen"]];

export function ModelWorkshop() {
  const [models, setModels] = useState<Model[]>([]);
  const [selected, setSelected] = useState(["market_value", "recent_form"]);
  const [status, setStatus] = useState("");
  useEffect(() => { fetch("/api/models").then((response) => response.json()).then((result) => setModels(result.models ?? [])).catch(() => setStatus("Models could not be loaded.")); }, []);
  const toggle = (factor: string) => setSelected((current) => current.includes(factor) ? current.filter((item) => item !== factor) : [...current, factor]);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = { ...Object.fromEntries(new FormData(form)), factors: selected };
    const response = await fetch("/api/models", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) return setStatus(result.error);
    setModels((current) => [result.model, ...current]); form.reset(); setStatus("Model saved as a draft. Attach verified picks when you are ready to test it.");
  }
  return <div className="model-workshop">
    <Card className="model-builder"><header><span><Plus /> Create a specialized model</span><Badge tone="warning">DRAFT FIRST</Badge></header><form onSubmit={create}>
      <label>Model name<input name="name" required maxLength={60} placeholder="MLB Bullpen Edge" /></label>
      <div className="ledger-field-row"><label>Sport<input name="sport" required maxLength={20} placeholder="MLB" /></label><label>Category<select name="category"><option value="moneyline">Moneylines</option><option value="player_prop">Player props</option><option value="spread">Spreads</option><option value="total">Totals</option><option value="live">Live</option></select></label></div>
      <label>What is this model trying to find?<textarea name="description" maxLength={300} placeholder="Find underpriced teams with rested high-leverage bullpens." /></label>
      <fieldset><legend>Choose at least two factors</legend>{factorOptions.map(([value, label]) => <button type="button" className={selected.includes(value) ? "active" : ""} onClick={() => toggle(value)} key={value}>{label}<Check /></button>)}</fieldset>
      <Button><FlaskConical /> Save model draft</Button>
    </form></Card>
    <section className="model-roster"><header><div><span className="landing-kicker">YOUR MODEL ROSTER</span><h2>Specialists, not one-size-fits-all.</h2></div><Badge>{models.length} MODELS</Badge></header>
      {models.length ? <div>{models.map((model) => <Card key={model.id}><header><BrainCircuit /><Badge tone={model.status === "live" ? "success" : "warning"}>{model.status}</Badge></header><h3>{model.name}</h3><p>{model.sport} · {model.category.replace("_", " ")} · v{model.version}</p><small>{model.description || "No description yet."}</small><div>{model.factors.map((factor) => <span key={factor}>{factor.replace("_", " ")}</span>)}</div><footer><ShieldCheck /> Rating begins only with verified predictions</footer></Card>)}</div> : <Card className="model-empty"><BrainCircuit /><h3>Build your first specialist</h3><p>Start with one category you understand well. Every verified prediction will become evidence for that model&apos;s rating.</p></Card>}
    </section>{status ? <p className="ledger-status">{status}</p> : null}
  </div>;
}
