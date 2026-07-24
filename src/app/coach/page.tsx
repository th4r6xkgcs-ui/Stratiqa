import { Sparkles } from "lucide-react";
import { CoachWorkspace } from "@/components/coach/coach-workspace";

export default function CoachPage() {
  return (
    <div className="product-page coach-page">
      <section className="product-hero">
        <div>
          <span className="eyebrow"><Sparkles size={13} /> AI DECISION SUPPORT</span>
          <h1>Your STRATIQA Coach</h1>
          <p>Grounded analysis of the current board, with transparent data mode, model reasoning, and risk-aware follow-ups.</p>
        </div>
      </section>
      <CoachWorkspace />
    </div>
  );
}
