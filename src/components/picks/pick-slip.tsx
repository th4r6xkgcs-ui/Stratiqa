"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronDown, LockKeyhole, ReceiptText, ShieldCheck, Sparkles, X } from "lucide-react";
import { addToSlip, slipEvent, type SlipLeg } from "@/lib/picks/slip";
import { recommendedUnits } from "@/lib/picks/sizing";

const storageKey = "stratiqa.pick-slip.v1";
export function PickSlip() {
  const [legs, setLegs] = useState<SlipLeg[]>([]);
  const [open, setOpen] = useState(false);
  const [units, setUnits] = useState(1);
  const [sizingMode, setSizingMode] = useState<"auto" | "custom">("auto");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => {
    Promise.resolve().then(() => {
      try { setLegs(JSON.parse(localStorage.getItem(storageKey) ?? "[]")); } catch { /* ignore invalid local data */ }
    });
    const receive = (event: Event) => {
      const leg = (event as CustomEvent<SlipLeg>).detail;
      setLegs((current) => current.some((item) => item.id === leg.id) ? current : [...current, leg]);
      setOpen(true); setStatus("");
    };
    window.addEventListener(slipEvent, receive);
    return () => window.removeEventListener(slipEvent, receive);
  }, []);
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(legs)); }, [legs]);
  const analysis = useMemo(() => {
    const correlated = new Set(legs.map((leg) => leg.eventName)).size < legs.length;
    const rawConfidence = legs.length ? legs.reduce((product, leg) => product * leg.confidence / 100, 1) ** (1 / legs.length) * 100 : 0;
    const confidence = Math.round(rawConfidence * (correlated ? .92 : 1));
    const ev = legs.length ? legs.reduce((sum, leg) => sum + leg.expectedValue, 0) / legs.length : 0;
    const risk = legs.length >= 4 ? "High" : confidence >= 75 ? "Controlled" : "Balanced";
    const grade = confidence >= 82 && ev >= 8 ? "A" : confidence >= 72 && ev >= 5 ? "B+" : confidence >= 62 ? "B" : "C";
    const winGain = legs.reduce((sum, leg) => sum + Math.round(28 * (1 - (leg.price > 0 ? 100 / (leg.price + 100) : Math.abs(leg.price) / (Math.abs(leg.price) + 100)))), 0);
    const loss = legs.reduce((sum, leg) => sum + Math.round(28 * (leg.price > 0 ? 100 / (leg.price + 100) : Math.abs(leg.price) / (Math.abs(leg.price) + 100))), 0);
    return { confidence, ev, risk, grade, winGain, loss, correlated, autoUnits: recommendedUnits(confidence, correlated) };
  }, [legs]);
  async function lock() {
    if (legs.some((leg) => !leg.live || !leg.slug)) return setStatus("Demo props can be analyzed, but only live provider lines can be locked for ratings.");
    setSaving(true);
    const effectiveUnits = sizingMode === "auto" ? analysis.autoUnits : units;
    const response = await fetch("/api/picks/verified/batch", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        units: effectiveUnits, sizingMode,
        legs: legs.map((leg) => ({ kind: leg.kind ?? "matchup", slug: leg.slug, propId: leg.propId, outcomeName: leg.outcomeName, book: leg.book, line: leg.selection, modelName: leg.modelName, origin: leg.origin ?? "stratiqa" })),
      }),
    });
    const result = await response.json(); setSaving(false);
    if (!response.ok) return setStatus(result.error);
    setStatus(`${result.picks.length} pick${result.picks.length === 1 ? "" : "s"} locked. Results will verify automatically.`);
    setLegs([]);
  }
  const remove = (id: string) => setLegs((current) => current.filter((leg) => leg.id !== id));
  return <>
    <button className="slip-fab" onClick={() => setOpen((value) => !value)}><ReceiptText /><span>My Slip</span><b>{legs.length}</b></button>
    <aside className={open ? "global-slip open" : "global-slip"}>
      <header><span><ReceiptText /> STRATIQA SLIP <b>{legs.length}</b></span><button onClick={() => setOpen(false)}><X /></button></header>
      {legs.length ? <>
        <div className="global-slip-legs">{legs.map((leg) => <article key={leg.id}><button onClick={() => remove(leg.id)}><X /></button><small>{leg.eventName}</small><strong>{leg.selection}</strong><p>{leg.book}<b>{leg.price > 0 ? "+" : ""}{leg.price}</b></p><div className="slip-leg-badges"><em>{leg.origin === "model" ? `MY MODEL${leg.modelName ? ` · ${leg.modelName}` : ""}` : leg.origin === "personal" ? "MY PICK" : "STRATIQA PICK"}</em>{!leg.live ? <em>DEMO · NOT VERIFIED</em> : <em className="verified"><ShieldCheck /> VERIFIABLE LINE</em>}</div></article>)}</div>
        <section className="slip-analysis"><header><Sparkles /> CARD ANALYSIS <strong>{analysis.grade}</strong></header><div><span>Overall confidence<b>{analysis.confidence}%</b></span><span>Average EV<b>+{analysis.ev.toFixed(1)}%</b></span><span>Risk level<b>{analysis.risk}</b></span></div><footer><span>If all win <b>≈ +{analysis.winGain}</b></span><span>If all lose <b>≈ −{analysis.loss}</b></span></footer></section>
        <section className="slip-sizing"><div><span>Stake tracking <small>Optional · never changes rating points</small></span><nav><button className={sizingMode === "auto" ? "active" : ""} onClick={() => setSizingMode("auto")}>Auto</button><button className={sizingMode === "custom" ? "active" : ""} onClick={() => setSizingMode("custom")}>Custom</button></nav></div>{sizingMode === "auto" ? <p><Sparkles /> Recommended for this card: <b>{analysis.autoUnits}u</b></p> : <label>Unit size<input aria-label="Custom unit size" type="number" min=".25" max="10" step=".25" value={units} onChange={(event) => setUnits(Number(event.target.value))} /></label>}</section>
        {legs.length > 1 ? <p className="slip-note"><AlertTriangle /> Rating changes are calculated per verified selection, preventing multi-leg inflation.</p> : null}
        {analysis.correlated ? <p className="slip-note"><AlertTriangle /> This card contains selections from the same event. Confidence and automatic sizing are reduced.</p> : null}
        <button className="lock-slip" disabled={saving} onClick={lock}><LockKeyhole /> {saving ? "Locking…" : "Lock My Picks"}</button>
      </> : <div className="global-slip-empty"><ReceiptText /><strong>Your slip is empty</strong><p>Tap any live price or prop to add it here.</p></div>}
      {status ? <p className="slip-status"><Check /> {status}</p> : null}
      <button className="slip-collapse" onClick={() => setOpen(false)}><ChevronDown /> Keep browsing</button>
    </aside>
  </>;
}

export { addToSlip };
