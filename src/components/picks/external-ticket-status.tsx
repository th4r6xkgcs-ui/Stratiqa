"use client";

import { useEffect, useState } from "react";
import { Check, Clock3, ShieldAlert } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";

type Ticket = { id: string; sportsbook: string; ticket_id: string | null; verification_status: string; rating_eligible: boolean; submitted_at: string; reviewed_at: string | null; review_note: string | null; rejection_reason: string | null; provider_reference: string | null };
export function ExternalTicketStatus() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  useEffect(() => { fetch("/api/ticket-imports", { cache: "no-store" }).then((response) => response.ok ? response.json() : { tickets: [] }).then((result) => setTickets(result.tickets ?? [])).catch(() => setTickets([])); }, []);
  if (!tickets.length) return null;
  return <Card className="external-ticket-status">
    <header><span><ShieldAlert /> Outside ticket reviews</span><Badge>{tickets.length}</Badge></header>
    <p>These are separate from picks locked in STRATIQA. They affect ratings only after independent verification.</p>
    <div>{tickets.map((ticket) => {
      const approved = ticket.verification_status === "matched" && ticket.rating_eligible;
      const rejected = ["rejected", "duplicate"].includes(ticket.verification_status);
      return <article key={ticket.id}><i className={approved ? "approved" : rejected ? "rejected" : "pending"}>{approved ? <Check /> : rejected ? <ShieldAlert /> : <Clock3 />}</i><span><strong>{ticket.sportsbook} · {ticket.ticket_id ?? "Screenshot submission"}</strong><small>{approved ? "Verified and added to your rated record" : rejected ? ticket.rejection_reason ?? "Not independently verifiable" : "Pending independent review · no rating impact"}</small></span><time>{new Date(ticket.reviewed_at ?? ticket.submitted_at).toLocaleDateString()}</time></article>;
    })}</div>
  </Card>;
}
