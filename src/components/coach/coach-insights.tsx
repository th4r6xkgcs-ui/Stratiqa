"use client";

import { AlertTriangle, BrainCircuit, CheckCircle2 } from "lucide-react";
import type { CoachReply } from "@/lib/intelligence/types";
import { ReasoningCard } from "@/components/intelligence/reasoning-card";

export function CoachInsights({ reply }: { reply: CoachReply }) {
  const reasoning = Array.isArray(reply.reasoning) ? reply.reasoning : [];
  const alternatives = Array.isArray(reply.alternatives) ? reply.alternatives : [];
  return (
    <div className="coach-insights">
      <div className="coach-explain-grid">
        <section><CheckCircle2 /><span><small>Confidence</small><strong>{reply.confidence.value}%</strong><p>{reply.confidence.explanation}</p></span></section>
        <section><AlertTriangle /><span><small>Risk level</small><strong>{reply.risk.level}</strong><p>{reply.risk.explanation}</p></span></section>
      </div>
      <div className="coach-reasoning">
        <h3><BrainCircuit size={16} /> Expand the reasoning</h3>
        {reasoning.length ? reasoning.map((item) => <ReasoningCard key={item.title} title={item.title} summary="Model factor" detail={item.detail} />) : <p>Research details are refreshing. Verify the current price and availability before acting.</p>}
      </div>
      <div className="coach-alternatives">
        <h3>Alternative recommendations</h3>
        {alternatives.length ? alternatives.map((item) => (
          <div key={item.selection}><span><strong>{item.selection}</strong><small>{Math.round(item.confidence * 100)}% confidence</small></span><b>+{(item.expectedValue * 100).toFixed(1)}% EV</b></div>
        )) : <p>No alternate market is being presented while research data refreshes.</p>}
      </div>
    </div>
  );
}
