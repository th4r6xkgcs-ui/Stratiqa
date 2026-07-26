"use client";

import { AlertTriangle, BrainCircuit, CheckCircle2, Plus, ShieldCheck } from "lucide-react";
import type { CoachReply } from "@/lib/intelligence/types";
import { ReasoningCard } from "@/components/intelligence/reasoning-card";
import { addToSlip } from "@/lib/picks/slip";

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
      {reply.recommendation ? <section className="coach-pick-action"><div><ShieldCheck /><span><small>AI COACH PICK</small><strong>{reply.recommendation.selection}</strong><p>{reply.recommendation.book ?? reply.snapshot.provider} · {reply.recommendation.price > 0 ? "+" : ""}{reply.recommendation.price} · {reply.recommendation.live ? "verifiable live line" : "analysis watchlist"}</p></span></div><button onClick={() => addToSlip({ id: reply.recommendation!.id, kind: reply.recommendation!.kind, slug: reply.recommendation!.slug, propId: reply.recommendation!.propId, outcomeName: reply.recommendation!.outcomeName, selection: reply.recommendation!.selection, eventName: reply.recommendation!.matchup, book: reply.recommendation!.book ?? reply.snapshot.provider, price: reply.recommendation!.price, confidence: Math.round(reply.recommendation!.confidence * 100), expectedValue: reply.recommendation!.expectedValue * 100, live: Boolean(reply.recommendation!.live), origin: "stratiqa", coachRecommendationId: reply.recommendation!.id })}><Plus /> Accept Coach Pick</button><footer>This becomes a STRATIQA pick only when accepted here. You still own the decision and its verified result.</footer></section> : null}
      <div className="coach-alternatives">
        <h3>Alternative recommendations</h3>
        {reply.alternatives.map((item) => (
          <div key={item.selection}><span><strong>{item.selection}</strong><small>{Math.round(item.confidence * 100)}% confidence</small></span><b>+{(item.expectedValue * 100).toFixed(1)}% EV</b></div>
        ))}
      </div>
    </div>
  );
}
