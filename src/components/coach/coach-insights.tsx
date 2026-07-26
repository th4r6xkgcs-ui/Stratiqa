"use client";

import { AlertTriangle, BrainCircuit, CheckCircle2 } from "lucide-react";
import type { CoachReply } from "@/lib/intelligence/types";
import { ReasoningCard } from "@/components/intelligence/reasoning-card";

export function CoachInsights({ reply }: { reply: CoachReply }) {
  return (
    <div className="coach-insights">
      <div className="coach-explain-grid">
        <section><CheckCircle2 /><span><small>Confidence</small><strong>{reply.confidence.value}%</strong><p>{reply.confidence.explanation}</p></span></section>
        <section><AlertTriangle /><span><small>Risk level</small><strong>{reply.risk.level}</strong><p>{reply.risk.explanation}</p></span></section>
      </div>
      <div className="coach-reasoning">
        <h3><BrainCircuit size={16} /> Expand the reasoning</h3>
        {reply.reasoning.map((item) => <ReasoningCard key={item.title} title={item.title} summary="Model factor" detail={item.detail} />)}
      </div>
      <div className="coach-alternatives">
        <h3>Alternative recommendations</h3>
        {reply.alternatives.map((item) => (
          <div key={item.selection}><span><strong>{item.selection}</strong><small>{Math.round(item.confidence * 100)}% confidence</small></span><b>+{(item.expectedValue * 100).toFixed(1)}% EV</b></div>
        ))}
      </div>
    </div>
  );
}
