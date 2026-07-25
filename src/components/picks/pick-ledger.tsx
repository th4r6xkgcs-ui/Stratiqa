"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, CircleDollarSign, Clock3, Plus, ShieldAlert, Target, TrendingUp, X } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";
import type { TrackedPick } from "@/repositories/picks";

const categories = [
  ["player_prop", "Player prop"], ["moneyline", "Moneyline"], ["spread", "Spread"],
  ["total", "Total"], ["parlay", "Parlay"], ["live", "Live market"],
];
const sportsbooks = ["DraftKings", "FanDuel", "BetMGM", "Caesars", "Fanatics", "BetRivers", "BetOnline", "Bovada", "MyBookie", "BetUS", "Other"];

export function PickLedger() {
  const [picks, setPicks] = useState<TrackedPick[]>([]);
  const [status, setStatus] = useState("Loading your ledger…");
  const [signedIn, setSignedIn] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/picks", { cache: "no-store" })
      .then(async (response) => ({ response, result: await response.json() }))
      .then(({ response, result }) => {
        if (response.status === 401) {
          setSignedIn(false);
          setStatus("Sign in to begin tracking picks.");
          return;
        }
        if (!response.ok) {
          setStatus(result.error);
          return;
        }
        setPicks(result.picks);
        setStatus(result.picks.length ? "" : "Your ledger is ready for its first tracked pick.");
      })
      .catch(() => setStatus("Your ledger could not be loaded. Please try again."));
  }, []);

  const summary = useMemo(() => {
    const graded = picks.filter((pick) => pick.result !== "pending");
    const wins = graded.filter((pick) => pick.result === "win").length;
    const decisions = graded.filter((pick) => pick.result === "win" || pick.result === "loss").length;
    const profit = graded.reduce((sum, pick) => sum + (pick.profitUnits ?? 0), 0);
    const stake = graded.reduce((sum, pick) => sum + pick.stakeUnits, 0);
    return { graded: graded.length, winRate: decisions ? wins / decisions * 100 : 0, profit, roi: stake ? profit / stake * 100 : 0 };
  }, [picks]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form);
    const response = await fetch("/api/picks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return setStatus(result.error);
    setPicks((current) => [result.pick, ...current]);
    event.currentTarget.reset();
    setStatus("Pick added as self-reported and pending.");
  }

  async function grade(id: string, resultValue: "win" | "loss" | "push" | "void") {
    const response = await fetch("/api/picks", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, result: resultValue }) });
    const result = await response.json();
    if (!response.ok) return setStatus(result.error);
    setPicks((current) => current.map((pick) => pick.id === id ? result.pick : pick));
    setStatus("Self-reported result saved. Provider verification remains pending.");
  }

  return (
    <div className="ledger-layout">
      <Card className="ledger-entry glass-card">
        <header><span><Plus /> Track a position</span><Badge tone="warning">Self-reported</Badge></header>
        {signedIn ? <form onSubmit={create}>
          <div className="ledger-field-row"><label>Sport<input name="sport" required placeholder="MLB" maxLength={20} /></label><label>Category<select name="category">{categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
          <label>Event<input name="eventName" required placeholder="Mariners at Giants" maxLength={120} /></label>
          <div className="ledger-field-row"><label>Selection<input name="selection" required placeholder="Mariners ML" maxLength={120} /></label><label>Market<input name="market" required placeholder="Moneyline" maxLength={120} /></label></div>
          <div className="ledger-field-row ledger-field-row--three"><label>Sportsbook<select name="sportsbook">{sportsbooks.map((book) => <option key={book}>{book}</option>)}</select></label><label>American odds<input name="americanOdds" type="number" required defaultValue={-110} /></label><label>Stake units<input name="stakeUnits" type="number" required min=".01" max="100" step=".01" defaultValue="1" /></label></div>
          <label>Confidence <span>1–100</span><input name="confidence" type="range" min="1" max="100" defaultValue="65" /></label>
          <label>Private note<textarea name="notes" maxLength={500} placeholder="Why you tracked this position…" /></label>
          <Button disabled={saving}><Plus /> {saving ? "Saving…" : "Add to ledger"}</Button>
        </form> : <div className="ledger-signin"><ShieldAlert /><strong>Authentication required</strong><p>Sign in through Account to create a private pick ledger.</p><Link href="/account">Open account</Link></div>}
      </Card>

      <main className="ledger-main">
        <section className="ledger-metrics">
          <Card><Target /><span><small>Graded picks</small><strong>{summary.graded}</strong></span></Card>
          <Card><Check /><span><small>Win rate</small><strong>{summary.graded ? `${summary.winRate.toFixed(1)}%` : "—"}</strong></span></Card>
          <Card><CircleDollarSign /><span><small>Net units</small><strong className={summary.profit >= 0 ? "positive" : "negative"}>{summary.profit >= 0 ? "+" : ""}{summary.profit.toFixed(2)}</strong></span></Card>
          <Card><TrendingUp /><span><small>Self-reported ROI</small><strong>{summary.graded ? `${summary.roi.toFixed(1)}%` : "—"}</strong></span></Card>
        </section>
        <Card className="ledger-history">
          <header><span><Clock3 /> Pick history</span><Badge>{picks.length} tracked</Badge></header>
          {picks.length ? <div>{picks.map((pick) => <article key={pick.id}>
            <div className="ledger-pick-main"><span><Badge tone={pick.result === "win" ? "success" : pick.result === "loss" ? "warning" : "neutral"}>{pick.result}</Badge><small>{pick.sport} · {pick.category.replace("_", " ")}</small></span><strong>{pick.selection}</strong><p>{pick.eventName} · {pick.market}</p></div>
            <div className="ledger-pick-price"><strong>{pick.americanOdds > 0 ? "+" : ""}{pick.americanOdds}</strong><small>{pick.sportsbook} · {pick.stakeUnits}u</small>{pick.profitUnits !== null ? <b>{pick.profitUnits >= 0 ? "+" : ""}{pick.profitUnits.toFixed(2)}u</b> : null}</div>
            {pick.result === "pending" ? <div className="grade-actions"><small>Grade manually</small><span><button onClick={() => grade(pick.id, "win")}><Check /> Win</button><button onClick={() => grade(pick.id, "loss")}><X /> Loss</button><button onClick={() => grade(pick.id, "push")}>Push</button></span></div> : <div className="pick-source"><ShieldAlert /> Self-reported</div>}
          </article>)}</div> : <div className="ledger-empty"><Target /><strong>No tracked picks yet</strong><p>Add a position to begin building your performance history.</p></div>}
        </Card>
        {status ? <p className="ledger-status" role="status">{status}</p> : null}
      </main>
    </div>
  );
}
