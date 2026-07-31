"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowUpRight, BrainCircuit, ShieldCheck, Users } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";

type Update = {
  model_id: string; model_name: string; owner_alias: string; owner_slug: string; sport: string; category: string;
  rating: number; rating_change: number; weekly_results: number; weekly_wins: number; weekly_losses: number;
  follower_count: number; is_following: boolean;
};

const categoryName = (value: string) => value.replaceAll("_", " ");

export function ModelPulse() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/models/pulse", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { updates: [] })
      .then((result) => setUpdates(result.updates ?? []))
      .catch(() => setUpdates([]))
      .finally(() => setLoading(false));
  }, []);
  if (!loading && !updates.length) return null;
  return <section className="model-pulse">
    <header><div><span className="landing-kicker">MODEL PULSE</span><h2>What changed this week</h2><p>Public model movement is driven only by automatically verified outcomes.</p></div><Badge tone="accent"><Activity /> WEEKLY</Badge></header>
    <div className="model-pulse-grid">{loading ? [1, 2, 3].map((item) => <Card className="model-pulse-loading" key={item}><i /><i /><i /></Card>) : updates.slice(0, 6).map((update) => <Card key={update.model_id} className="model-pulse-card"><header><Badge tone={update.rating_change > 0 ? "success" : update.rating_change < 0 ? "warning" : "accent"}>{update.rating_change > 0 ? "+" : ""}{Math.round(update.rating_change)} RATING</Badge><span><Users /> {update.follower_count}</span></header><div><BrainCircuit /><span><strong>{update.model_name}</strong><small>{update.sport} · {categoryName(update.category)} · by {update.owner_slug ? <Link href={`/analysts/${update.owner_slug}`}>{update.owner_alias}</Link> : update.owner_alias}</small></span></div><footer><b>{Math.round(update.rating)}</b><span>{update.weekly_results ? `${update.weekly_wins}-${update.weekly_losses} across ${update.weekly_results} automatic result${update.weekly_results === 1 ? "" : "s"}` : "No new automatic results this week"}</span><ArrowUpRight /></footer></Card>)}</div>
    <aside><ShieldCheck /> Public pulse never publishes strategy, wager size, private picks, or a guarantee of future performance.</aside>
  </section>;
}
