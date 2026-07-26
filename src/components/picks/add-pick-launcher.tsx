"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, Camera, Check, Plus, ScanLine, ShieldCheck, Target, X } from "lucide-react";

export function AddPickLauncher() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"choose" | "screenshot" | "ticket">("choose");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [picks, setPicks] = useState<Array<{ id: string; selection: string; eventName: string; sportsbook: string; certificationStatus: string }>>([]);
  const [selectedPickId, setSelectedPickId] = useState("");
  const selectedPick = picks.find((pick) => pick.id === selectedPickId);
  function launch() {
    setOpen(true); setMode("choose"); setStatus(""); setSelectedPickId("");
    fetch("/api/picks", { cache: "no-store" }).then((response) => response.ok ? response.json() : { picks: [] }).then((result) => setPicks((result.picks ?? []).filter((pick: { source: string; certificationStatus: string }) => pick.source === "provider" && ["tracked", "rejected"].includes(pick.certificationStatus)))).catch(() => setPicks([]));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const response = await fetch("/api/pick-evidence", { method: "POST", body: new FormData(event.currentTarget) });
    const result = await response.json(); setSaving(false); setStatus(result.message ?? result.error);
  }
  return <>
    <button className="add-pick-global" onClick={launch}><Plus /> <span>Add Pick</span></button>
    {open ? <div className="add-pick-backdrop"><section className="add-pick-sheet" role="dialog" aria-modal="true" aria-label="Add a pick">
      <header><div><span>ADD A PICK</span><strong>Choose it. Lock it. We verify it.</strong></div><button onClick={() => setOpen(false)} aria-label="Close"><X /></button></header>
      {mode === "choose" ? <div className="pick-methods">
        <Link href="/matchups" onClick={() => setOpen(false)}><i><Target /></i><span><strong>Lock a pick from the live board</strong><small>Preserves the line before you submit sportsbook proof</small></span><BadgeText>STEP 1</BadgeText><ArrowRight /></Link>
        <button onClick={() => setMode("screenshot")}><i><Camera /></i><span><strong>Upload bet slip</strong><small>Import a screenshot for matching</small></span><BadgeText pending>PENDING</BadgeText><ArrowRight /></button>
        <button onClick={() => setMode("ticket")}><i><ScanLine /></i><span><strong>Enter ticket ID</strong><small>Submit sportsbook evidence</small></span><BadgeText pending>PENDING</BadgeText><ArrowRight /></button>
        <p><ShieldCheck /> Every locked pick affects ratings. Optional sportsbook proof unlocks confirmed real-money stats.</p>
      </div> : <form className="ticket-import" onSubmit={submit}>
        <button type="button" onClick={() => setMode("choose")}>← Back</button>
        <h2>{mode === "screenshot" ? "Upload your bet slip" : "Enter a ticket ID"}</h2>
        <p>Connect proof to the exact pick you locked to confirm real-world stake, payout, profit, and ROI.</p>
        <label>Locked pick<select name="pickId" required value={selectedPickId} onChange={(event) => setSelectedPickId(event.target.value)}><option value="" disabled>Select a pick</option>{picks.map((pick) => <option value={pick.id} key={pick.id}>{pick.selection} · {pick.sportsbook}</option>)}</select></label>
        {picks.length ? null : <p className="ticket-status">Lock a live line first, then return here with sportsbook proof.</p>}
        <label>Sportsbook<input name="sportsbook" value={selectedPick?.sportsbook ?? ""} readOnly placeholder="Set by your locked pick" /></label>
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
