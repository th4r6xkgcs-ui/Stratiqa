"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Crown, Flame, Globe2, MapPin, ShieldCheck, Sparkles, Target, Trophy } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import { competitiveStanding } from "@/lib/ratings/competitive-ranks.js";

type Category = {
  category: string; rating: number; gradedPicks: number; globalRank: number | null;
  countryRank: number | null; regionRank: number | null; localRank: number | null; eligibleCount: number;
  form: { streak: number; streakResult: "win" | "loss" | null; recent: string[]; recentWinRate: number | null };
};
type Goal = { kind: "start" | "placement" | "top10" | "defend"; category: string | null; value: number };
type Overview = { categories: Category[]; goal: Goal; settledPicks: number };
const labels: Record<string, string> = { player_prop: "Player Props", moneyline: "Moneylines", spread: "Spreads", total: "Totals", parlay: "Parlays" };

function goalCopy(goal: Goal) {
  const category = goal.category ? labels[goal.category] ?? goal.category : "first category";
  if (goal.kind === "start") return { title: "Establish your first rating", detail: "Lock pregame decisions and let official results build your competitive identity." };
  if (goal.kind === "placement") return { title: `${goal.value} picks to rank in ${category}`, detail: "This is your closest category placement. Wins and losses both improve rating accuracy." };
  if (goal.kind === "top10") return { title: `${goal.value} places from the global top 10`, detail: `${category} is your clearest competitive climb right now.` };
  return { title: `Defend your ${category} specialty`, detail: "You reached the top tier of your current competitive path. Keep the record active." };
}

export function CompetitiveOverview() {
  const [overview, setOverview] = useState<Overview | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch("/api/competitive-overview", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then(setOverview).catch(() => setOverview(null));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const strongest = overview?.categories[0];
  const standing = competitiveStanding(strongest?.rating ?? 1500, strongest?.gradedPicks ?? 0);
  const goal = goalCopy(overview?.goal ?? { kind: "start", category: null, value: 25 });
  const activeStreak = useMemo(() => overview?.categories.filter((item) => item.form.streak > 0).sort((a, b) => b.form.streak - a.form.streak)[0], [overview]);

  if (!overview) return <section className="competition-overview-loading">{[1, 2, 3].map((item) => <i key={item} />)}</section>;
  return <section className="competition-overview">
    <Card className="competition-identity">
      <div><Badge tone="accent"><Sparkles /> YOUR COMPETITIVE IDENTITY</Badge><h2>{strongest ? `${labels[strongest.category] ?? strongest.category} ${standing.tier.name}` : "Unranked Analyst"}</h2><p>{strongest ? `Your strongest verified specialty is rated ${strongest.rating}. Every category develops independently.` : "Your identity will emerge from automatically settled decisions—not a quiz or self-reported record."}</p></div>
      <div className="competition-rating-orbit"><Crown /><strong>{strongest?.rating ?? 1500}</strong><span style={{ color: standing.tier.color }}>{standing.tier.name}</span></div>
      <dl><span><dt>Rated categories</dt><dd>{overview.categories.length}</dd></span><span><dt>Official results</dt><dd>{overview.settledPicks}</dd></span><span><dt>Best global rank</dt><dd>{Math.min(...overview.categories.map((item) => item.globalRank ?? Number.POSITIVE_INFINITY)) === Number.POSITIVE_INFINITY ? "—" : `#${Math.min(...overview.categories.map((item) => item.globalRank ?? Number.POSITIVE_INFINITY))}`}</dd></span></dl>
    </Card>

    <div className="competition-next-row">
      <Card className="competition-next-goal"><Target /><span><small>YOUR NEXT CLIMB</small><strong>{goal.title}</strong><p>{goal.detail}</p></span><Link href="/matchups">Find next edge <ArrowRight /></Link></Card>
      <Card className={`competition-streak ${activeStreak?.form.streakResult ?? ""}`}><Flame /><span><small>ACTIVE FORM</small><strong>{activeStreak ? `${activeStreak.form.streak}${activeStreak.form.streakResult === "win" ? "W" : "L"} ${labels[activeStreak.category] ?? activeStreak.category} streak` : "No active streak yet"}</strong><p>{activeStreak?.form.recentWinRate != null ? `${activeStreak.form.recentWinRate}% across the latest decisions` : "Recent verified form appears here."}</p></span></Card>
    </div>

    <Card className="competition-category-matrix">
      <header><div><Trophy /><span><strong>Your category ladder</strong><small>Separate ratings reveal what you actually do best.</small></span></div><Badge tone="success"><ShieldCheck /> VERIFIED ONLY</Badge></header>
      <div className="competition-matrix-head"><span>Category</span><span>Rating</span><span>Form</span><span><Globe2 /> Global</span><span><MapPin /> State</span><span>Local</span></div>
      {overview.categories.length ? overview.categories.map((item) => {
        const categoryStanding = competitiveStanding(item.rating, item.gradedPicks);
        return <article key={item.category}>
          <span><strong>{labels[item.category] ?? item.category}</strong><small>{item.gradedPicks >= 25 ? categoryStanding.tier.name : `${25 - item.gradedPicks} to rank`}</small></span>
          <strong>{item.rating}</strong>
          <span className="form-dots">{item.form.recent.slice(0, 5).map((result, index) => <i className={result} key={`${result}-${index}`}>{result.slice(0, 1).toUpperCase()}</i>)}{!item.form.recent.length ? <small>—</small> : null}</span>
          <b>{item.globalRank ? `#${item.globalRank}` : "—"}</b><b>{item.regionRank ? `#${item.regionRank}` : "—"}</b><b>{item.localRank ? `#${item.localRank}` : "—"}</b>
        </article>;
      }) : <div className="competition-matrix-empty"><Target /><strong>Your ladder begins with your first settled pick</strong><p>Practice picks never enter competitive rankings.</p></div>}
    </Card>
  </section>;
}
