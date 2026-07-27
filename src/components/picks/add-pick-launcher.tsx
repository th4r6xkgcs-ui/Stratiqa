"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, Camera, Check, Plus, ScanLine, ShieldCheck, Target, X } from "lucide-react";

type Mode = "choose" | "screenshot" | "ticket" | "external";
export function AddPickLauncher() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("choose");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [picks, setPicks] = useState<Array<{ id: string; selection: string; sportsbook: string }>>([]);
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
      <header><div><span>ADD A PICK</span><strong>Choose before start. Track during play.</strong></div><button onClick={() => setOpen(false)} aria-label="Close"><X /></button></header>
      {mode === "choose" ? <div className="pick-methods">
        <Link href="/matchups" onClick={() => setOpen(false)}><i><Target /></i><span><strong>Lock a pregame pick</strong><small>Choose before game time, then track it live</small></span><BadgeText>STEP 1</BadgeText><ArrowRight /></Link>
        <button onClick={() => setMode("screenshot")}><i><Camera /></i><span><strong>Prove a locked pick</strong><small>Match a screenshot for real-money stats</small></span><BadgeText>OPTIONAL</BadgeText><ArrowRight /></button>
        <button onClick={() => setMode("ticket")}><i><ScanLine /></i><span><strong>Enter ticket ID</strong><small>Match an order reference to a locked pick</small></span><BadgeText>OPTIONAL</BadgeText><ArrowRight /></button>
        <button onClick={() => setMode("external")}><i><Camera /></i><span><strong>Import an outside live bet</strong><small>Submit a sportsbook ticket for independent review</small></span><BadgeText pending>REVIEW ONLY</BadgeText><ArrowRight /></button>
        <p><ShieldCheck /> Pregame STRATIQA picks count automatically. Outside live bets count only after independent verification.</p>
      </div> : <form className="ticket-import" onSubmit={submit}>
        <button type="button" onClick={() => setMode("choose")}>← Back</button>
        <h2>{mode === "external" ? "Import an outside live bet" : mode === "screenshot" ? "Upload your bet slip" : "Enter a ticket ID"}</h2>
        <p>{mode === "external" ? "This has no rating impact unless STRATIQA independently verifies the ticket, placement time, market, and result." : "Connect proof to your locked pick to confirm real-world stake, payout, profit, and ROI."}</p>
        {mode === "external" ? <input type="hidden" name="claimType" value="external_ticket" /> : <><label>Locked pick<select name="pickId" required value={selectedPickId} onChange={(event) => setSelectedPickId(event.target.value)}><option value="" disabled>Select a pick</option>{picks.map((pick) => <option value={pick.id} key={pick.id}>{pick.selection}</option>)}</select></label>{picks.length ? null : <p className="ticket-status">Lock a pregame pick first, then return here with optional proof.</p>}</>}
        <label>Sportsbook{mode === "external" ? <input name="sportsbook" required maxLength={60} placeholder="Sportsbook shown on ticket" /> : <input name="sportsbook" value={selectedPick?.sportsbook ?? ""} readOnly placeholder="Set by your locked pick" />}</label>
        <label>Ticket ID {mode === "screenshot" ? <small>Optional</small> : null}<input name="ticketId" required={mode === "ticket"} maxLength={120} placeholder="Sportsbook ticket or order ID" /></label>
        {mode === "screenshot" || mode === "external" ? <label className="ticket-file"><Camera /><span><strong>Choose screenshot</strong><small>JPG, PNG, or WebP · 5 MB max</small></span><input name="image" type="file" required accept="image/jpeg,image/png,image/webp" /></label> : null}
        <button className="ticket-submit" disabled={saving}><ShieldCheck /> {saving ? "Submitting…" : "Submit for verification"}</button>
        {status ? <p className="ticket-status"><Check /> {status}</p> : null}
      </form>}
    </section></div> : null}
  </>;
}

function BadgeText({ children, pending = false }: { children: React.ReactNode; pending?: boolean }) {
  return <em className={pending ? "pending" : ""}>{children}</em>;
}
