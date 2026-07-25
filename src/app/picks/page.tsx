import { ClipboardCheck, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { PickLedger } from "@/components/picks/pick-ledger";

export default function PicksPage() {
  return (
    <div className="product-page picks-page">
      <section className="product-hero">
        <div><Badge tone="accent"><ClipboardCheck size={11} /> V16.2 VERIFIED PERFORMANCE</Badge><h1>Pick Ledger</h1><p>Track every position, grade outcomes transparently, and build the sample required for category ratings and verified rankings.</p></div>
        <div className="ledger-trust"><ShieldCheck /><span><strong>Integrity first</strong><small>Manual results remain self-reported until independently verified.</small></span></div>
      </section>
      <PickLedger />
    </div>
  );
}
