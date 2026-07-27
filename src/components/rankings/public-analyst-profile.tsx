"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowLeft, BrainCircuit, Check, Crown, GitCompareArrows, LockKeyhole, MapPin, ShieldCheck, Swords, Target, TrendingUp, Trophy } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import { verifiedAchievements } from "@/lib/ratings/achievements.js";
import { categoryForm } from "@/lib/ratings/competitive-overview.js";

type Rating = { category: string; rating: number; gradedPicks: number; wins: number; losses: number; pushes: number; roi: number; clv: number };
type Model = { id: string; name: string; sport: string; category: string; version: number; rating: number; gradedPicks: number };
type Pick = { selection: string; eventName: string; sport: string; category: string; result: "win" | "loss" | "push"; profitUnits: number; gradedAt: string };
type Analyst = {
  profile: { alias: string; slug: string; country?: string; region?: string; locality?: string };
  ratings: Rating[]; models: Model[]; recentPicks: Pick[];
  realMoney: { confirmedBets: number; profit: number; stake: number } | null;
};
type LeaderOption = { public_alias: string; public_slug?: string };

const labels: Record<string, string> = { player_prop: "Player Props", moneyline: "Moneylines", spread: "Spreads", total: "Totals", parlay: "Parlays", live: "Live Markets" };

function aggregate(analyst: Analyst) {
  const samples = analyst.ratings.reduce((sum, item) => sum + item.gradedPicks, 0);
  const decisions = analyst.ratings.reduce((sum, item) => sum + item.wins + item.losses, 0);
  const wins = analyst.ratings.reduce((sum, item) => sum + item.wins, 0);
  const rating = samples ? Math.round(analyst.ratings.reduce((sum, item) => sum + item.rating * item.gradedPicks, 0) / samples) : 1500;
  return { samples, decisions, wins, rating, accuracy: decisions ? wins / decisions * 100 : 0 };
}

function ProfileIdentity({ analyst }: { analyst: Analyst }) {
  const stats = aggregate(analyst);
  const strongest = analyst.ratings[0];
  return <Card className="public-analyst-hero">
    <div className="public-avatar">{analyst.profile.alias.slice(0, 1).toUpperCase()}<i /></div>
    <div><Badge tone="accent"><ShieldCheck /> VERIFIED ANALYST</Badge><h1>{analyst.profile.alias}</h1><p><MapPin /> {[analyst.profile.locality, analyst.profile.region, analyst.profile.country].filter(Boolean).join(", ") || "Global analyst"}</p><span>{strongest ? `${labels[strongest.category] ?? strongest.category} specialist` : "Building a verified record"}</span></div>
    <div className="public-rating"><small>STRATIQA RATING</small><strong>{stats.rating}</strong><span>{stats.samples >= 25 ? "RANKED" : "PROVISIONAL"}</span></div>
  </Card>;
}

export function PublicAnalystProfile({ slug }: { slug: string }) {
  const [analyst, setAnalyst] = useState<Analyst | null>(null);
  const [comparison, setComparison] = useState<Analyst | null>(null);
  const [candidates, setCandidates] = useState<LeaderOption[]>([]);
  const [isRival, setIsRival] = useState(false);
  const [status, setStatus] = useState("Loading verified profile…");

  useEffect(() => {
    Promise.all([
      fetch(`/api/analysts/${encodeURIComponent(slug)}`, { cache: "no-store" }).then(async (response) => ({ ok: response.ok, result: await response.json() })),
      fetch("/api/leaderboard?category=player_prop", { cache: "no-store" }).then((response) => response.ok ? response.json() : { leaders: [] }),
      fetch("/api/rivals", { cache: "no-store" }).then((response) => response.ok ? response.json() : { rivals: [] }),
    ]).then(([profileResponse, board, rivalData]) => {
      if (!profileResponse.ok) return setStatus(profileResponse.result.error);
      setAnalyst(profileResponse.result.profile);
      setCandidates((board.leaders ?? []).filter((leader: LeaderOption) => leader.public_slug && leader.public_slug !== slug));
      setIsRival((rivalData.rivals ?? []).some((rival: { public_slug: string }) => rival.public_slug === slug));
      setStatus("");
    }).catch(() => setStatus("This verified profile could not be loaded."));
  }, [slug]);

  async function compare(nextSlug: string) {
    if (!nextSlug) return setComparison(null);
    setStatus("Loading comparison…");
    const response = await fetch(`/api/analysts/${encodeURIComponent(nextSlug)}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) return setStatus(result.error);
    setComparison(result.profile);
    setStatus("");
  }

  async function toggleRival() {
    setStatus(isRival ? "Removing rival..." : "Adding rival...");
    const response = await fetch(isRival ? `/api/rivals?slug=${encodeURIComponent(slug)}` : "/api/rivals", {
      method: isRival ? "DELETE" : "POST",
      headers: isRival ? undefined : { "Content-Type": "application/json" },
      body: isRival ? undefined : JSON.stringify({ slug }),
    });
    const result = await response.json();
    if (!response.ok) return setStatus(result.error);
    setIsRival(!isRival);
    setStatus(isRival ? "Removed from your rival board." : "Added to your private rival board.");
  }

  const stats = useMemo(() => analyst ? aggregate(analyst) : null, [analyst]);
  const comparisonStats = useMemo(() => comparison ? aggregate(comparison) : null, [comparison]);
  if (!analyst) return <div className="product-page"><Card className="premium-empty"><Trophy /><strong>{status}</strong><Link href="/leaderboard">Return to leaderboard</Link></Card></div>;
  const realRoi = analyst.realMoney?.stake ? analyst.realMoney.profit / analyst.realMoney.stake * 100 : null;
  const publicAchievements = verifiedAchievements({
    categories: analyst.ratings.map((rating) => ({ ...rating, form: categoryForm(analyst.recentPicks, rating.category), globalRank: null, regionRank: null })),
    settledPicks: stats?.samples ?? 0,
  });

  return <div className="product-page public-profile-page">
    <div className="public-profile-nav"><Link href="/leaderboard"><ArrowLeft /> Leaderboards</Link><div><button type="button" className={isRival ? "active" : ""} onClick={toggleRival}><Swords /> {isRival ? "Rival tracked" : "Add rival"}</button><label><GitCompareArrows /> Compare with<select defaultValue="" onChange={(event) => void compare(event.target.value)}><option value="">Choose analyst</option>{candidates.map((candidate) => <option value={candidate.public_slug} key={candidate.public_slug}>{candidate.public_alias}</option>)}</select></label></div></div>
    <ProfileIdentity analyst={analyst} />

    {comparison && comparisonStats && stats ? <Card className="analyst-head-to-head">
      <header><span><GitCompareArrows /> HEAD-TO-HEAD</span><Badge tone="accent">VERIFIED DATA</Badge></header>
      <div className="comparison-names"><strong>{analyst.profile.alias}</strong><i>VS</i><strong>{comparison.profile.alias}</strong></div>
      {[["Overall rating", stats.rating, comparisonStats.rating], ["Accuracy", `${stats.accuracy.toFixed(1)}%`, `${comparisonStats.accuracy.toFixed(1)}%`], ["Settled picks", stats.samples, comparisonStats.samples], ["Ranked categories", analyst.ratings.filter((item) => item.gradedPicks >= 25).length, comparison.ratings.filter((item) => item.gradedPicks >= 25).length]].map(([label, left, right]) => <div className="comparison-row" key={label}><strong className={Number(left) > Number(right) ? "winner" : ""}>{left}</strong><span>{label}</span><strong className={Number(right) > Number(left) ? "winner" : ""}>{right}</strong></div>)}
      <footer><ShieldCheck /> Comparisons use automatically settled STRATIQA results. Bet size cannot improve a rating.</footer>
    </Card> : null}

    <section className="public-profile-metrics">
      <Card><Activity /><span><small>ACCURACY</small><strong>{stats?.accuracy.toFixed(1)}%</strong><p>{stats?.samples} settled picks</p></span></Card>
      <Card><Crown /><span><small>BEST CATEGORY</small><strong>{analyst.ratings[0] ? labels[analyst.ratings[0].category] : "Developing"}</strong><p>{analyst.ratings[0] ? `${Math.round(analyst.ratings[0].rating)} rating` : "No ranked category yet"}</p></span></Card>
      <Card><BrainCircuit /><span><small>ACTIVE MODELS</small><strong>{analyst.models.length}</strong><p>{analyst.models[0] ? `${analyst.models[0].name} leads` : "Roster private or empty"}</p></span></Card>
      <Card><TrendingUp /><span><small>CONFIRMED MONEY</small><strong>{analyst.realMoney ? `${analyst.realMoney.profit >= 0 ? "+" : ""}$${Number(analyst.realMoney.profit).toFixed(2)}` : "PRIVATE"}</strong><p>{realRoi === null ? "Analyst controls visibility" : `${realRoi.toFixed(1)}% real ROI`}</p></span></Card>
    </section>

    <div className="public-profile-grid">
      <Card className="public-category-card">
        <header><span><Trophy /> Category ratings</span><Badge>{analyst.ratings.length}</Badge></header>
        {analyst.ratings.length ? analyst.ratings.map((rating, index) => <article key={rating.category}><b>#{index + 1}</b><span><strong>{labels[rating.category] ?? rating.category}</strong><small>{rating.wins}-{rating.losses} · {rating.gradedPicks} settled</small></span><strong>{Math.round(rating.rating)}</strong><em>{rating.gradedPicks >= 25 ? "RANKED" : "PROVISIONAL"}</em></article>) : <div className="public-private-state"><Target /><strong>No category record yet</strong></div>}
      </Card>
      <Card className="public-achievements">
        <header><span><Crown /> Permanent trophies</span><Badge tone="success">{publicAchievements.filter((item) => item.earned).length}</Badge></header>
        <div>{publicAchievements.filter((item) => item.earned).map((item) => <span className="earned" key={item.id}><Trophy /><strong>{item.name}</strong><small>{item.detail}</small></span>)}{!publicAchievements.some((item) => item.earned) ? <span><ShieldCheck /><strong>Building a verified legacy</strong><small>Trophies appear after official milestones.</small></span> : null}</div>
      </Card>
    </div>

    <div className="public-profile-grid">
      <Card className="public-picks-card">
        <header><span><Check /> Recent verified picks</span><Badge tone="success">AUTOMATIC RESULTS</Badge></header>
        {analyst.recentPicks.length ? analyst.recentPicks.map((pick, index) => <article key={`${pick.selection}-${index}`}><b className={pick.result}>{pick.result.slice(0, 1).toUpperCase()}</b><span><strong>{pick.selection}</strong><small>{pick.eventName} · {pick.sport} · {labels[pick.category] ?? pick.category}</small></span><em>{pick.profitUnits > 0 ? "+" : ""}{Number(pick.profitUnits).toFixed(2)}u</em></article>) : <div className="public-private-state"><LockKeyhole /><strong>Recent picks are private</strong><p>This analyst chose not to publish individual selections.</p></div>}
      </Card>
      <Card className="public-models-card">
        <header><span><BrainCircuit /> Model roster</span></header>
        {analyst.models.length ? analyst.models.map((model) => <article key={model.id}><BrainCircuit /><span><strong>{model.name}</strong><small>{model.sport} · {labels[model.category] ?? model.category} · v{model.version}</small></span><b>{Math.round(model.rating)}<small>{model.gradedPicks >= 10 ? "RANKED" : "TESTING"}</small></b></article>) : <div className="public-private-state"><LockKeyhole /><strong>Model roster is private</strong></div>}
      </Card>
    </div>
    {status ? <p className="ledger-status">{status}</p> : null}
  </div>;
}
