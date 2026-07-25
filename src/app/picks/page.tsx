import { ClipboardCheck, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { PickLedger } from "@/components/picks/pick-ledger";

export default function PicksPage() {
  return (
    <div className="product-page picks-page">
      <section className="product-hero">
        <div><Badge tone="accent"><ClipboardCheck size={11} /> YOUR COMPETITIVE JOURNEY</Badge><h1>My Picks</h1><p>Make smarter picks, grow your rating, unlock new ranks, and discover exactly where your edge is strongest.</p></div>
        <div className="ledger-trust"><ShieldCheck /><span><strong>Every result is verified</strong><small>Competitive ratings only move after STRATIQA confirms the final result.</small></span></div>
      </section>
      <PickLedger />
    </div>
  );
}
