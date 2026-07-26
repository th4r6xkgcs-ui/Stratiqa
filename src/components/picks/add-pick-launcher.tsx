"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, Camera, Check, Plus, ScanLine, ShieldCheck, Target, X } from "lucide-react";

const books = ["DraftKings", "FanDuel", "BetMGM", "Caesars", "Fanatics", "BetRivers", "BetOnline", "Bovada", "MyBookie", "BetUS", "Other"];

export function AddPickLauncher() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"choose" | "screenshot" | "ticket">("choose");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const response = await fetch("/api/pick-evidence", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json(); setSaving(false); setStatus(result.message ?? result.error);
  }
  return <>
    <button className="add-pick-global" onClick={() => { setOpen(true); setMode("choose"); setStatus(""); }}><Plus /> <span>Add Pick</span></button>
    {open ? <div className="add-pick-backdrop"><section className="add-pick-sheet" role="dialog" aria-modal="true" aria-label="Add a pick">
      <header><div><span>ADD A PICK</span><strong>Choose it. Lock it. We verify it.</strong></div><button onClick={() => setOpen(false)} aria-label="Close"><X /></button></header>
      {mode === "choose" ? <div className="pick-methods">
        <Link href="/matchups" onClick={() => setOpen(false)}><i><Target /></i><span><strong>Pick from live board</strong><small>Fastest and automatically verified</small></span><BadgeText>RATING ELIGIBLE</BadgeText><ArrowRight /></Link>
        <button onClick={() => setMode("screenshot")}><i><Camera /></i><span><strong>Upload bet slip</strong><small>Import a screenshot for matching</small></span><BadgeText pending>PENDING</BadgeText><ArrowRight /></button>
        <button onClick={() => setMode("ticket")}><i><ScanLine /></i><span><strong>Enter ticket ID</strong><small>Submit sportsbook evidence</small></span><BadgeText pending>PENDING</BadgeText><ArrowRight /></button>
        <p><ShieldCheck /> Only independently confirmed picks can change ratings. Screenshots and ticket IDs are never trusted by themselves.</p>
      </div> : <form className="ticket-import" onSubmit={submit}>
        <button type="button" onClick={() => setMode("choose")}>← Back</button>
        <h2>{mode === "screenshot" ? "Upload your bet slip" : "Enter a ticket ID"}</h2>
        <p>We&apos;ll store the evidence securely and attempt to match it. It stays rating-ineligible while pending.</p>
        <label>Sportsbook<select name="sportsbook">{books.map((book) => <option key={book}>{book}</option>)}</select></label>
        <label>Ticket ID {mode === "screenshot" ? <small>Optional</small> : null}<input name="ticketId" required={mode === "ticket"} maxLength={120} placeholder="Enter the sportsbook ticket ID" /></label>
        {mode === "screenshot" ? <label className="ticket-file"><Camera /><span><strong>Choose screenshot</strong><small>JPG, PNG, or WebP · 5 MB max</small></span><input name="image" type="file" required accept="image/jpeg,image/png,image/webp" /></label> : null}
        <button className="ticket-submit" disabled={saving}><ShieldCheck /> {saving ? "Submitting…" : "Submit for verification"}</button>
        {status ? <p className="ticket-status"><Check /> {status}</p> : null}
      </form>}
    </section></div> : null}
  </>;
}

function BadgeText({ children, pending = false }: { children: React.ReactNode; pending?: boolean }) {
  return <em className={pending ? "pending" : ""}>{children}</em>;
}
