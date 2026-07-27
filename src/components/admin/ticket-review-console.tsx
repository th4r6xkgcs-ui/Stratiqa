"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, RefreshCw, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";

type Ticket = {
  id: string; user_id: string; sportsbook: string; ticket_id: string | null; submitted_at: string;
  imageUrl: string | null; extracted_sportsbook: string | null; extracted_ticket_id: string | null;
  extracted_stake: number | null; extracted_payout: number | null; extracted_selections: string[];
  extracted_event: string | null; extraction_confidence: number | null; match_score: number | null;
};
const defaults = { sport: "MLB", category: "moneyline", eventName: "", selection: "", market: "Moneyline", americanOdds: "-110", stakeUnits: "1", result: "win", placedAt: "", eventCommenceAt: "", providerEventId: "", providerSportKey: "baseball_mlb", marketKey: "h2h", outcomeName: "", linePoint: "", confidence: "65", realStake: "", realPayout: "", providerReference: "", note: "" };

export function TicketReviewConsole() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState("");
  const [working, setWorking] = useState("");
  const load = useCallback(() => {
    setError("");
    fetch("/api/admin/ticket-reviews", { cache: "no-store" }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setTickets(result.tickets ?? []);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Review queue unavailable."));
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(load);
    return () => cancelAnimationFrame(frame);
  }, [load]);
  async function review(form: HTMLFormElement, ticket: Ticket, action: "approved" | "rejected") {
    setWorking(ticket.id);
    const values = Object.fromEntries(new FormData(form));
    const response = await fetch("/api/admin/ticket-reviews", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, evidenceId: ticket.id, action }),
    });
    const result = await response.json(); setWorking("");
    if (!response.ok) return setError(result.error);
    setTickets((current) => current.filter((item) => item.id !== ticket.id));
  }
  return <div className="product-page ticket-review-page">
    <header className="product-hero"><div><Badge tone="warning"><ShieldAlert /> PRIVATE ADMIN</Badge><h1>External Ticket Review</h1><p>Independent verification only. Approval creates an audited rating result from official event and market data.</p></div><button onClick={load}><RefreshCw /> Refresh queue</button></header>
    {error ? <Card className="admin-denied"><ShieldAlert /><strong>{error}</strong><p>Only emails listed in STRATIQA_ADMIN_EMAILS can access this page.</p></Card> : null}
    {!error && !tickets.length ? <Card className="admin-denied"><ShieldCheck /><strong>Review queue is clear</strong><p>No outside tickets are waiting.</p></Card> : null}
    <section className="ticket-review-list">{tickets.map((ticket) => <Card className="ticket-review-card" key={ticket.id}>
      <header><span><Badge tone="warning">PENDING REVIEW</Badge><strong>{ticket.sportsbook}</strong><small>{ticket.ticket_id ?? "Screenshot only"} · {new Date(ticket.submitted_at).toLocaleString()}</small></span>{ticket.imageUrl ? <a href={ticket.imageUrl} target="_blank" rel="noreferrer">Secure screenshot <ExternalLink /></a> : null}</header>
      <div className="ticket-extraction"><span><small>Extracted event</small><strong>{ticket.extracted_event ?? "Not extracted"}</strong></span><span><small>Selections</small><strong>{ticket.extracted_selections?.join(", ") || "Not extracted"}</strong></span><span><small>Stake / payout</small><strong>{ticket.extracted_stake ?? "—"} / {ticket.extracted_payout ?? "—"}</strong></span><span><small>OCR confidence</small><strong>{ticket.extraction_confidence == null ? "—" : `${ticket.extraction_confidence}%`}</strong></span></div>
      <form onSubmit={(event) => { event.preventDefault(); review(event.currentTarget, ticket, "approved"); }}>
        <div className="review-form-grid">{Object.entries(defaults).map(([name, value]) => {
          if (name === "category") return <label key={name}>Category<select name={name} defaultValue={value}><option value="moneyline">Moneyline</option><option value="spread">Spread</option><option value="total">Total</option><option value="player_prop">Player prop</option><option value="parlay">Parlay</option></select></label>;
          if (name === "result") return <label key={name}>Official result<select name={name} defaultValue={value}><option value="win">Win</option><option value="loss">Loss</option><option value="push">Push</option><option value="void">Void</option></select></label>;
          const date = name === "placedAt" || name === "eventCommenceAt";
          return <label key={name}>{name.replace(/([A-Z])/g, " $1")}<input name={name} type={date ? "datetime-local" : ["americanOdds","stakeUnits","linePoint","confidence","realStake","realPayout"].includes(name) ? "number" : "text"} step={["stakeUnits","linePoint","realStake","realPayout"].includes(name) ? "0.01" : undefined} defaultValue={value} required={["eventName","selection","providerEventId","providerReference","note","outcomeName","placedAt"].includes(name)} /></label>;
        })}</div>
        <footer><button type="button" disabled={working === ticket.id} onClick={(event) => review(event.currentTarget.form!, ticket, "rejected")} className="reject-ticket"><X /> Reject</button><button disabled={working === ticket.id} className="approve-ticket"><Check /> Approve verified result</button></footer>
      </form>
    </Card>)}</section>
  </div>;
}
