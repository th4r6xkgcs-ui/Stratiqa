"use client";

import { ChevronDown, Sparkles } from "lucide-react";

export function ReasoningCard({ title, summary, detail, score }: { title: string; summary: string; detail: string; score?: number }) {
  return (
    <details className="reasoning-card">
      <summary>
        <span><Sparkles size={14} /><strong>{title}</strong><small>{summary}</small></span>
        {score !== undefined ? <b>{Math.round(score)}{score <= 20 ? "%" : ""}</b> : null}
        <ChevronDown size={15} />
      </summary>
      <p>{detail}</p>
    </details>
  );
}
