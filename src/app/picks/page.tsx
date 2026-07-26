import { ShieldCheck, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { PickLedger } from "@/components/picks/pick-ledger";

export default function PicksPage() {
  return (
    <div className="product-page picks-page">
      <section className="product-hero">
        <div><Badge tone="accent"><Trophy size={11} /> YOUR COMPETITIVE JOURNEY</Badge><h1>My Performance</h1><p>Your rating, category strengths, parlays, and real-world results—organized in one place.</p></div>
        <div className="ledger-trust"><ShieldCheck /><span><strong>You never grade yourself</strong><small>STRATIQA automatically settles locked picks. Sportsbook proof unlocks confirmed money stats.</small></span></div>
      </section>
      <PickLedger />
    </div>
  );
}
