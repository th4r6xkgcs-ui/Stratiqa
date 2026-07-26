"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, Bell, BrainCircuit, Check, Clock3, Crown, LockKeyhole, Search, ShieldCheck, Sparkles, Target, Trophy, X } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import type { CategoryRating, TrackedCard, TrackedPick } from "@/repositories/picks";
import type { ManagedModel } from "@/components/models/model-command-center";

type Profile = { public_alias?: string; public_slug?: string; leaderboard_opt_in?: boolean };
type Feed = { id: string; tone: "win" | "loss" | "info"; title: string; detail: string; href: string };
const labels: Record<string, string> = { player_prop: "Player Props", moneyline: "Moneylines", spread: "Spreads", total: "Totals", parlay: "Parlays", live: "Live Markets" };
const ranks = [{ name: "Rookie", floor: 0 }, { name: "Scout", floor: 1200 }, { name: "Strategist", floor: 1450 }, { name: "Sharp", floor: 1650 }, { name: "Expert", floor: 1850 }, { name: "Elite", floor: 2000 }, { name: "Grandmaster", floor: 2250 }];

function resultLabel(result: TrackedPick["result"]) {
  if (result === "win") return "won";
  if (result === "loss") return "lost";
  if (result === "push") return "pushed";
  return "is waiting for an official result";
}

export function HomeCommandCenter() {
  const [picks, setPicks] = useState<TrackedPick[]>([]);
  const [ratings, setRatings] = useState<CategoryRating[]>([]);
  const [cards, setCards] = useState<TrackedCard[]>([]);
  const [models, setModels] = useState<ManagedModel[]>([]);
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/picks", { cache: "no-store" }).then((response) => response.ok ? response.json() : { picks: [], ratings: [], cards: [] }),
      fetch("/api/models", { cache: "no-store" }).then((response) => response.ok ? response.json() : { models: [] }),
      fetch("/api/competitive-profile", { cache: "no-store" }).then((response) => response.ok ? response.json() : { profile: {} }),
    ]).then(([pickData, modelData, profileData]) => {
      setPicks(pickData.picks ?? []);
      setRatings(pickData.ratings ?? []);
      setCards(pickData.cards ?? []);
      setModels(modelData.models ?? []);
      setProfile(profileData.profile ?? {});
    }).finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    const samples = ratings.reduce((sum, item) => sum + item.gradedPicks, 0);
    const rating = samples ? Math.round(ratings.reduce((sum, item) => sum + item.rating * item.gradedPicks, 0) / samples) : 1500;
    const rankIndex = Math.max(0, ranks.findLastIndex((rank) => rating >= rank.floor));
    const rank = ranks[rankIndex];
    const next = ranks[Math.min(ranks.length - 1, rankIndex + 1)];
    const progress = next === rank ? 100 : Math.max(0, Math.min(100, (rating - rank.floor) / (next.floor - rank.floor) * 100));
    const strongest = [...ratings].sort((a, b) => b.rating - a.rating)[0];
    const bestModel = [...models].filter((model) => model.status !== "retired").sort((a, b) => b.performance.rating - a.performance.rating)[0];
    const pending = picks.filter((pick) => pick.source === "provider" && pick.result === "pending");
    const recent = picks.filter((pick) => pick.source === "provider").slice(0, 6);
    const settled = picks.filter((pick) => pick.source === "provider" && ["win", "loss", "push"].includes(pick.result));
    const decisions = settled.filter((pick) => pick.result !== "push");
    const wins = decisions.filter((pick) => pick.result === "win").length;
    return { rating, rank, next, progress, strongest, bestModel, pending, recent, settled, accuracy: decisions.length ? wins / decisions.length * 100 : null };
  }, [models, picks, ratings]);

  const feed = useMemo<Feed[]>(() => {
    const items: Feed[] = summary.recent.slice(0, 4).map((pick) => ({
      id: `pick-${pick.id}`,
      tone: pick.result === "win" ? "win" : pick.result === "loss" ? "loss" : "info",
      title: pick.result === "pending" ? "Pick locked successfully" : `Pick ${resultLabel(pick.result)}`,
      detail: `${pick.selection} · ${pick.result === "pending" ? "Automatic settlement pending" : pick.settlementReason ?? "Official result confirmed"}`,
      href: "/picks",
    }));
    const rankedModel = models.find((model) => model.performance.verified >= 10);
    if (rankedModel) items.push({ id: `model-${rankedModel.id}`, tone: "win", title: `${rankedModel.name} is ranked`, detail: `${rankedModel.performance.rating} model rating across ${rankedModel.performance.verified} settled picks`, href: "/lab" });
    if (profile.leaderboard_opt_in && summary.strongest?.gradedPicks >= 25) items.push({ id: "leaderboard-ready", tone: "win", title: "Your public ranking is live", detail: `${labels[summary.strongest.category] ?? summary.strongest.category} is now eligible for competition`, href: "/leaderboard" });
    return items.filter((item) => !dismissed.includes(item.id)).slice(0, 5);
  }, [dismissed, models, profile.leaderboard_opt_in, summary.recent, summary.strongest]);

  if (loading) return <div className="dashboard-page home-command"><div className="home-loading">{[1, 2, 3, 4, 5].map((item) => <i key={item} />)}</div></div>;

  return <div className="dashboard-page home-command">
    <section className="home-welcome">
      <div><Badge tone="accent"><Sparkles /> YOUR COMMAND CENTER</Badge><h1>Welcome back{profile.public_alias ? `, ${profile.public_alias}` : ""}.</h1><p>One clear view of your picks, rating, models, and next move.</p></div>
      <div className="home-primary-actions"><Link href="/matchups"><Search /> Find picks</Link><Link href="/props"><Target /> Browse props</Link><Link href="/picks"><Trophy /> My performance</Link></div>
    </section>

    <section className="home-journey-grid">
      <Card className="home-rating-card">
        <header><span><Trophy /> YOUR RATING</span><Badge tone={summary.settled.length >= 25 ? "success" : "warning"}>{summary.settled.length >= 25 ? "RANKED" : "PROVISIONAL"}</Badge></header>
        <div><strong>{summary.rating}</strong><span>{summary.rank.name}</span></div>
        <p>{summary.next === summary.rank ? "You reached the highest rank." : `${Math.max(0, summary.next.floor - summary.rating)} points to ${summary.next.name}`}</p>
        <i><em style={{ width: `${summary.progress}%` }} /></i>
        <Link href="/picks">View full performance <ArrowRight /></Link>
      </Card>

      <Card className="home-focus-card">
        <span className="landing-kicker">YOUR NEXT MOVE</span>
        {summary.pending.length ? <><Clock3 /><h2>{summary.pending.length} pick{summary.pending.length === 1 ? "" : "s"} in play</h2><p>They are locked. STRATIQA will grade them automatically when official results arrive.</p><Link href="/picks">Follow live picks <ArrowRight /></Link></> : <><Target /><h2>Build today&apos;s card</h2><p>Choose a live market, review the reasoning, and lock the picks you believe in.</p><Link href="/matchups">Explore today&apos;s board <ArrowRight /></Link></>}
      </Card>

      <Card className="home-best-card">
        <span className="landing-kicker">STRONGEST RIGHT NOW</span>
        {summary.bestModel && (!summary.strongest || summary.bestModel.performance.rating >= summary.strongest.rating) ? <><BrainCircuit /><h2>{summary.bestModel.name}</h2><strong>{summary.bestModel.performance.rating}<small> model rating</small></strong><p>{summary.bestModel.sport} · {labels[summary.bestModel.category] ?? summary.bestModel.category} · {summary.bestModel.performance.verified} settled</p><Link href="/lab">Open Model Arena <ArrowRight /></Link></> : summary.strongest ? <><Crown /><h2>{labels[summary.strongest.category] ?? summary.strongest.category}</h2><strong>{Math.round(summary.strongest.rating)}<small> category rating</small></strong><p>{summary.strongest.gradedPicks} automatically settled picks</p><Link href="/leaderboard">View category ranking <ArrowRight /></Link></> : <><BrainCircuit /><h2>Find your specialty</h2><p>Your strongest category and model will appear as verified results accumulate.</p><Link href="/lab">Build a model <ArrowRight /></Link></>}
      </Card>
    </section>

    <section className="home-stat-strip">
      <div><small>SETTLED PICKS</small><strong>{summary.settled.length}</strong><span>STRATIQA record</span></div>
      <div><small>ACCURACY</small><strong>{summary.accuracy === null ? "—" : `${summary.accuracy.toFixed(0)}%`}</strong><span>Wins vs losses</span></div>
      <div><small>ACTIVE MODELS</small><strong>{models.filter((model) => model.status === "live").length}</strong><span>{models.length} total built</span></div>
      <div><small>OPEN CARDS</small><strong>{cards.filter((card) => card.result === "pending").length}</strong><span>Singles and parlays</span></div>
    </section>

    <div className="home-detail-grid">
      <Card className="home-activity">
        <header><span><Clock3 /> Recent picks</span><Link href="/picks">View all <ArrowRight /></Link></header>
        {summary.recent.length ? summary.recent.map((pick) => <article key={pick.id}>
          <b className={pick.result}>{pick.result === "win" ? <Check /> : pick.result === "loss" ? <X /> : <Clock3 />}</b>
          <span><strong>{pick.selection}</strong><small>{pick.eventName} · {labels[pick.category] ?? pick.category}</small></span>
          <div><strong>{pick.result === "pending" ? "In play" : pick.result.toUpperCase()}</strong><small>{pick.certificationStatus === "certified" ? "Sportsbook confirmed" : pick.result === "pending" ? "Awaiting official result" : "STRATIQA settled"}</small></div>
        </article>) : <div className="home-empty"><Target /><strong>No live picks yet</strong><p>Find a market and lock your first position.</p><Link href="/matchups">Find picks <ArrowRight /></Link></div>}
      </Card>

      <Card className="home-notifications" id="updates">
        <header><span><Bell /> Updates</span><Badge tone={feed.length ? "accent" : "neutral"}>{feed.length}</Badge></header>
        {feed.length ? feed.map((item) => <article className={item.tone} key={item.id}><i>{item.tone === "win" ? <ArrowUp /> : item.tone === "loss" ? <ArrowDown /> : <ShieldCheck />}</i><Link href={item.href}><strong>{item.title}</strong><small>{item.detail}</small></Link><button onClick={() => setDismissed((current) => [...current, item.id])} aria-label={`Dismiss ${item.title}`}><X /></button></article>) : <div className="home-empty compact"><Check /><strong>You&apos;re all caught up</strong><p>Settlements and milestones will appear here.</p></div>}
      </Card>
    </div>

    <Card className="home-how-it-works">
      <header><LockKeyhole /> Your competitive loop</header>
      <div><span><b>1</b><strong>Find an edge</strong><small>Explore games, props, or model recommendations.</small></span><span><b>2</b><strong>Lock your decision</strong><small>Your line and model attribution become immutable.</small></span><span><b>3</b><strong>Automatic result</strong><small>Official data settles the pick—never self-graded.</small></span><span><b>4</b><strong>Build your rating</strong><small>Climb personal, category, location, and model boards.</small></span></div>
    </Card>
  </div>;
}
