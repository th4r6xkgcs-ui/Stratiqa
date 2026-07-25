"use client";

import { useState } from "react";
import Link from "next/link";
import { BrainCircuit, Check, LockKeyhole, Target, X } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import type { SportsbookQuote } from "@/services/types";

export function TrackPickButton({ slug, quotes, live }: { slug: string; quotes: SportsbookQuote[]; live: boolean }) {
  const [open, setOpen] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [attribution, setAttribution] = useState<"judgment" | "model">("judgment");
  const [modelName, setModelName] = useState("");
  const [units, setUnits] = useState(1);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const quote = quotes[quoteIndex];

  async function lockPick() {
    setSaving(true);
    const response = await fetch("/api/picks/verified", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, book: quote.book, line: quote.line, stakeUnits: units, attributionType: attribution, modelName }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return setStatus(result.error);
    setStatus("Pick locked. STRATIQA will verify the result automatically.");
  }

  return <>
    <Button className="track-pick-trigger" onClick={() => setOpen(true)}><Target /> Track this pick</Button>
    {open ? <div className="pick-confirm-backdrop" role="presentation">
      <section className="pick-confirm" role="dialog" aria-modal="true" aria-labelledby="track-pick-title">
        <header><span><LockKeyhole /> VERIFIED PICK</span><button aria-label="Close" onClick={() => setOpen(false)}><X /></button></header>
        <div className="pick-confirm-copy"><small>YOUR NEXT MOVE</small><h2 id="track-pick-title">{quote.line}</h2><p>{quote.book} · {quote.price > 0 ? "+" : ""}{quote.price}</p></div>
        {!live ? <div className="pick-live-required"><BrainCircuit /><strong>Live market required</strong><p>This preview uses demonstration data. Verified tracking activates when this matchup is available from your live odds provider.</p></div> : <>
          <label>Choose the live line<select value={quoteIndex} onChange={(event) => setQuoteIndex(Number(event.target.value))}>{quotes.map((item, index) => <option key={`${item.book}-${item.line}-${index}`} value={index}>{item.line} · {item.book} · {item.price > 0 ? "+" : ""}{item.price}</option>)}</select></label>
          <label>Unit size<input type="number" min=".25" max="10" step=".25" value={units} onChange={(event) => setUnits(Number(event.target.value))} /></label>
          <fieldset><legend>Who made this pick?</legend><button className={attribution === "judgment" ? "active" : ""} onClick={() => setAttribution("judgment")}><Target /> My judgment<small>Build my analyst rating</small></button><button className={attribution === "model" ? "active" : ""} onClick={() => setAttribution("model")}><BrainCircuit /> My model<small>Build a model track record</small></button></fieldset>
          {attribution === "model" ? <label>Model name<input maxLength={60} placeholder="Example: MLB Bullpen Edge v1" value={modelName} onChange={(event) => setModelName(event.target.value)} /></label> : null}
          <Button disabled={saving || (attribution === "model" && !modelName.trim())} onClick={lockPick}><LockKeyhole /> {saving ? "Locking…" : "Lock verified pick"}</Button>
        </>}
        {status ? <p className="pick-confirm-status"><Check /> {status} <Link href="/picks">View My Picks</Link></p> : null}
        <footer>The line and attribution are locked before the event. Results cannot be self-graded.</footer>
      </section>
    </div> : null}
  </>;
}
