"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, Bell, BrainCircuit, Check, ChevronDown, ChevronUp, Clock3, Crown, Eye, EyeOff, GripVertical, LayoutGrid, LockKeyhole, Maximize2, RotateCcw, Search, ShieldCheck, SlidersHorizontal, Sparkles, Target, Trophy, X } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import { dashboardPresets, dashboardWidgetIds, defaultDashboardLayout, normalizeDashboardLayout, type DashboardLayout, type DashboardWidgetId, type DashboardWidgetSize } from "@/lib/dashboard/layout";
import { buildSettlementFeed } from "@/lib/notifications/settlement-feed.js";
import { competitiveStanding } from "@/lib/ratings/competitive-ranks.js";
import type { CategoryRating, PickRatingImpact, SettlementAudit, TrackedCard, TrackedPick } from "@/repositories/picks";
import type { ManagedModel } from "@/components/models/model-command-center";

type Profile = { public_alias?: string; public_slug?: string; leaderboard_opt_in?: boolean };
type Feed = { id: string; tone: "win" | "loss" | "info"; title: string; detail: string; href: string };
const labels: Record<string, string> = { player_prop: "Player Props", moneyline: "Moneylines", spread: "Spreads", total: "Totals", parlay: "Parlays", live: "Live Markets" };
const widgetLabels: Record<DashboardWidgetId, string> = { rating: "Rating", focus: "Next move", best: "Strongest", stats: "Quick stats", activity: "Recent picks", updates: "Updates", loop: "Competitive loop" };

export function HomeCommandCenter() {
  const [picks, setPicks] = useState<TrackedPick[]>([]);
  const [ratings, setRatings] = useState<CategoryRating[]>([]);
  const [cards, setCards] = useState<TrackedCard[]>([]);
  const [settlementAudit, setSettlementAudit] = useState<SettlementAudit[]>([]);
  const [ratingImpacts, setRatingImpacts] = useState<PickRatingImpact[]>([]);
  const [models, setModels] = useState<ManagedModel[]>([]);
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [dashboardLayout, setDashboardLayout] = useState<DashboardLayout>(structuredClone(defaultDashboardLayout));
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState<DashboardWidgetId | null>(null);
  const [layoutSync, setLayoutSync] = useState<"device" | "saving" | "synced">("device");

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setDismissed(JSON.parse(localStorage.getItem("stratiqa-dismissed-updates") ?? "[]")); } catch { setDismissed([]); }
      try {
        const saved = JSON.parse(localStorage.getItem("stratiqa.dashboard.layout.v2") ?? "null");
        if (saved) setDashboardLayout(normalizeDashboardLayout(saved));
        else {
          const legacy = JSON.parse(localStorage.getItem("stratiqa.dashboard.layout.v1") ?? "[]");
          if (Array.isArray(legacy) && legacy.length) setDashboardLayout(normalizeDashboardLayout({ ...defaultDashboardLayout, order: legacy }));
        }
      } catch { setDashboardLayout(structuredClone(defaultDashboardLayout)); }
      fetch("/api/dashboard-layout", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (!data.layout) {
          const saved = JSON.parse(localStorage.getItem("stratiqa.dashboard.layout.v2") ?? "null");
          const legacy = JSON.parse(localStorage.getItem("stratiqa.dashboard.layout.v1") ?? "[]");
          const local = normalizeDashboardLayout(saved ?? (Array.isArray(legacy) && legacy.length ? { ...defaultDashboardLayout, order: legacy } : null));
          await fetch("/api/dashboard-layout", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ layout: local }) });
          setLayoutSync("synced");
          return;
        }
        const synced = normalizeDashboardLayout(data.layout);
        setDashboardLayout(synced);
        localStorage.setItem("stratiqa.dashboard.layout.v2", JSON.stringify(synced));
        setLayoutSync("synced");
      }).catch(() => undefined);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    Promise.all([
      fetch("/api/picks", { cache: "no-store" }).then((response) => response.ok ? response.json() : { picks: [], ratings: [], cards: [] }),
      fetch("/api/models", { cache: "no-store" }).then((response) => response.ok ? response.json() : { models: [] }),
      fetch("/api/competitive-profile", { cache: "no-store" }).then((response) => response.ok ? response.json() : { profile: {} }),
    ]).then(([pickData, modelData, profileData]) => {
      setPicks(pickData.picks ?? []);
      setRatings(pickData.ratings ?? []);
      setCards(pickData.cards ?? []);
      setSettlementAudit(pickData.settlementAudit ?? []);
      setRatingImpacts(pickData.ratingImpacts ?? []);
      setModels(modelData.models ?? []);
      setProfile(profileData.profile ?? {});
    }).finally(() => setLoading(false));
  }, []);
  function dismissFeedItem(id: string) {
    setDismissed((current) => {
      const next = [id, ...current.filter((item) => item !== id)].slice(0, 100);
      localStorage.setItem("stratiqa-dismissed-updates", JSON.stringify(next));
      return next;
    });
  }
  function saveLayout(next: DashboardLayout) {
    const normalized = normalizeDashboardLayout(next);
    setDashboardLayout(normalized);
    localStorage.setItem("stratiqa.dashboard.layout.v2", JSON.stringify(normalized));
    setLayoutSync("saving");
    fetch("/api/dashboard-layout", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ layout: normalized }) })
      .then((response) => setLayoutSync(response.ok ? "synced" : "device"))
      .catch(() => setLayoutSync("device"));
  }
  function moveWidget(id: DashboardWidgetId, direction: -1 | 1) {
    const index = dashboardLayout.order.indexOf(id);
    const target = index + direction;
    if (target < 0 || target >= dashboardLayout.order.length) return;
    const next = [...dashboardLayout.order];
    [next[index], next[target]] = [next[target], next[index]];
    saveLayout({ ...dashboardLayout, order: next });
  }
  function dropWidget(target: DashboardWidgetId) {
    if (!dragging || dragging === target) return setDragging(null);
    const next = dashboardLayout.order.filter((id) => id !== dragging);
    next.splice(next.indexOf(target), 0, dragging);
    saveLayout({ ...dashboardLayout, order: next }); setDragging(null);
  }
  function setWidgetSize(id: DashboardWidgetId) {
    const rotation: DashboardWidgetSize[] = ["compact", "standard", "wide"];
    const current = rotation.indexOf(dashboardLayout.sizes[id]);
    saveLayout({ ...dashboardLayout, sizes: { ...dashboardLayout.sizes, [id]: rotation[(current + 1) % rotation.length] } });
  }
  function toggleWidget(id: DashboardWidgetId) {
    const hidden = dashboardLayout.hidden.includes(id) ? dashboardLayout.hidden.filter((item) => item !== id) : [...dashboardLayout.hidden, id];
    saveLayout({ ...dashboardLayout, hidden });
  }
  const widgetProps = (id: DashboardWidgetId) => ({
    className: `home-widget widget-size-${dashboardLayout.sizes[id]}${editing ? " is-editing" : ""}${dragging === id ? " is-dragging" : ""}`,
    style: { order: dashboardLayout.order.indexOf(id) },
    draggable: editing,
    onDragStart: () => setDragging(id),
    onDragEnd: () => setDragging(null),
    onDragOver: (event: React.DragEvent) => event.preventDefault(),
    onDrop: () => dropWidget(id),
  });
  const controls = (id: DashboardWidgetId) => {
    const label = widgetLabels[id];
    const position = dashboardLayout.order.indexOf(id);
    return editing ? <div className="widget-edit-controls"><GripVertical aria-hidden="true" /><span>{label}</span><button type="button" onClick={() => setWidgetSize(id)} aria-label={`Resize ${label}`} title={`Size: ${dashboardLayout.sizes[id]}`}><Maximize2 /></button><button type="button" onClick={() => toggleWidget(id)} aria-label={`Hide ${label}`}><EyeOff /></button><button type="button" disabled={position === 0} onClick={() => moveWidget(id, -1)} aria-label={`Move ${label} up`}><ChevronUp /></button><button type="button" disabled={position === dashboardLayout.order.length - 1} onClick={() => moveWidget(id, 1)} aria-label={`Move ${label} down`}><ChevronDown /></button></div> : null;
  };

  const summary = useMemo(() => {
    const samples = ratings.reduce((sum, item) => sum + item.gradedPicks, 0);
    const rating = samples ? Math.round(ratings.reduce((sum, item) => sum + item.rating * item.gradedPicks, 0) / samples) : 1500;
    const standing = competitiveStanding(rating, samples);
    const strongest = [...ratings].sort((a, b) => b.rating - a.rating)[0];
    const bestModel = [...models].filter((model) => model.status !== "retired").sort((a, b) => b.performance.rating - a.performance.rating)[0];
    const pending = picks.filter((pick) => pick.source === "provider" && pick.result === "pending");
    const recent = picks.filter((pick) => pick.source === "provider").slice(0, 6);
    const settled = picks.filter((pick) => pick.source === "provider" && ["win", "loss", "push"].includes(pick.result));
    const decisions = settled.filter((pick) => pick.result !== "push");
    const wins = decisions.filter((pick) => pick.result === "win").length;
    return { rating, rank: standing.tier, next: standing.nextTier, progress: standing.tierProgress, strongest, bestModel, pending, recent, settled, accuracy: decisions.length ? wins / decisions.length * 100 : null };
  }, [models, picks, ratings]);

  const feed = useMemo<Feed[]>(() => {
    const items = buildSettlementFeed({ picks, audits: settlementAudit, impacts: ratingImpacts }).slice(0, 6) as Feed[];
    const rankedModel = models.find((model) => model.performance.verified >= 10);
    if (rankedModel) items.push({ id: `model-${rankedModel.id}`, tone: "win", title: `${rankedModel.name} is ranked`, detail: `${rankedModel.performance.rating} model rating across ${rankedModel.performance.verified} settled picks`, href: "/lab" });
    if (profile.leaderboard_opt_in && summary.strongest?.gradedPicks >= 25) items.push({ id: "leaderboard-ready", tone: "win", title: "Your public ranking is live", detail: `${labels[summary.strongest.category] ?? summary.strongest.category} is now eligible for competition`, href: "/leaderboard" });
    return items.filter((item) => !dismissed.includes(item.id)).slice(0, 5);
  }, [dismissed, models, picks, profile.leaderboard_opt_in, ratingImpacts, settlementAudit, summary.strongest]);

  if (loading) return <div className="dashboard-page home-command"><div className="home-loading">{[1, 2, 3, 4, 5].map((item) => <i key={item} />)}</div></div>;

  return <div className="dashboard-page home-command">
    <section className="home-welcome">
      <div><Badge tone="accent"><Sparkles /> YOUR COMMAND CENTER</Badge><h1>Welcome back{profile.public_alias ? `, ${profile.public_alias}` : ""}.</h1><p>One clear view of your picks, rating, models, and next move.</p></div>
      <div className="home-welcome-actions"><div className="home-primary-actions"><Link href="/matchups"><Search /> Find a Pick</Link><Link href="/picks#history"><Target /> Track My Picks</Link><Link href="/leaderboard"><Trophy /> Build My Rating</Link></div><div className="dashboard-layout-actions"><span>{layoutSync === "synced" ? "Synced" : layoutSync === "saving" ? "Saving…" : "Saved on device"}</span><button type="button" className={editing ? "active" : ""} aria-pressed={editing} onClick={() => setEditing((value) => !value)}><SlidersHorizontal /> {editing ? "Done" : "Customize"}</button>{editing ? <button type="button" onClick={() => saveLayout(structuredClone(defaultDashboardLayout))}><RotateCcw /> Reset</button> : null}</div></div>
    </section>

    {editing ? <section className="dashboard-studio" aria-label="Dashboard customization">
      <div><LayoutGrid /><span><strong>Choose a layout</strong><small>Start with a view that fits how you use STRATIQA.</small></span>{Object.entries(dashboardPresets).map(([name, preset]) => <button type="button" key={name} onClick={() => saveLayout(structuredClone(preset))}>{name}</button>)}</div>
      <div><Eye /><span><strong>Visible blocks</strong><small>Hidden blocks stay available here.</small></span>{dashboardWidgetIds.map((id) => <button type="button" className={dashboardLayout.hidden.includes(id) ? "" : "active"} key={id} onClick={() => toggleWidget(id)}>{dashboardLayout.hidden.includes(id) ? <EyeOff /> : <Eye />}{widgetLabels[id]}</button>)}</div>
    </section> : null}

    <section className={editing ? "home-custom-grid editing" : "home-custom-grid"}>
      {!dashboardLayout.hidden.includes("rating") ? <div {...widgetProps("rating")}>{controls("rating")}
      <Card className="home-rating-card">
        <header><span><Trophy /> YOUR RATING</span><Badge tone={summary.settled.length >= 25 ? "success" : "warning"}>{summary.settled.length >= 25 ? "RANKED" : "PROVISIONAL"}</Badge></header>
        <div><strong>{summary.rating}</strong><span>{summary.rank.name}</span></div>
        <p>{summary.next === summary.rank ? "You reached the highest rank." : `${Math.max(0, summary.next.floor - summary.rating)} points to ${summary.next.name}`}</p>
        <i><em style={{ width: `${summary.progress}%` }} /></i>
        <Link href="/picks">View full performance <ArrowRight /></Link>
      </Card>
      </div> : null}

      {!dashboardLayout.hidden.includes("focus") ? <div {...widgetProps("focus")}>{controls("focus")}
      <Card className="home-focus-card">
        <span className="landing-kicker">YOUR NEXT MOVE</span>
        {summary.pending.length ? <><Clock3 /><h2>{summary.pending.length} pick{summary.pending.length === 1 ? "" : "s"} in play</h2><p>Watch the games and follow picks you locked before they started. No live betting.</p><Link href="/picks">Track my picks <ArrowRight /></Link></> : <><Target /><h2>Build today&apos;s card</h2><p>Choose a pregame market, review the reasoning, and lock your decision before game time.</p><Link href="/matchups">Explore today&apos;s board <ArrowRight /></Link></>}
      </Card>
      </div> : null}

      {!dashboardLayout.hidden.includes("best") ? <div {...widgetProps("best")}>{controls("best")}
      <Card className="home-best-card">
        <span className="landing-kicker">STRONGEST RIGHT NOW</span>
        {summary.bestModel && (!summary.strongest || summary.bestModel.performance.rating >= summary.strongest.rating) ? <><BrainCircuit /><h2>{summary.bestModel.name}</h2><strong>{summary.bestModel.performance.rating}<small> model rating</small></strong><p>{summary.bestModel.sport} · {labels[summary.bestModel.category] ?? summary.bestModel.category} · {summary.bestModel.performance.verified} settled</p><Link href="/lab">Open Model Arena <ArrowRight /></Link></> : summary.strongest ? <><Crown /><h2>{labels[summary.strongest.category] ?? summary.strongest.category}</h2><strong>{Math.round(summary.strongest.rating)}<small> category rating</small></strong><p>{summary.strongest.gradedPicks} automatically settled picks</p><Link href="/leaderboard">View category ranking <ArrowRight /></Link></> : <><BrainCircuit /><h2>Find your specialty</h2><p>Your strongest category and model will appear as verified results accumulate.</p><Link href="/lab">Build a model <ArrowRight /></Link></>}
      </Card>
      </div> : null}

    {!dashboardLayout.hidden.includes("stats") ? <div {...widgetProps("stats")}>{controls("stats")}
    <section className="home-stat-strip">
      <div><small>SETTLED PICKS</small><strong>{summary.settled.length}</strong><span>STRATIQA record</span></div>
      <div><small>ACCURACY</small><strong>{summary.accuracy === null ? "—" : `${summary.accuracy.toFixed(0)}%`}</strong><span>Wins vs losses</span></div>
      <div><small>ACTIVE MODELS</small><strong>{models.filter((model) => model.status === "live").length}</strong><span>{models.length} total built</span></div>
      <div><small>OPEN CARDS</small><strong>{cards.filter((card) => card.result === "pending").length}</strong><span>Singles and parlays</span></div>
    </section>
    </div> : null}

      {!dashboardLayout.hidden.includes("activity") ? <div {...widgetProps("activity")}>{controls("activity")}
      <Card className="home-activity">
        <header><span><Clock3 /> Recent picks</span><Link href="/picks">View all <ArrowRight /></Link></header>
        {summary.recent.length ? summary.recent.map((pick) => <article key={pick.id}>
          <b className={pick.result}>{pick.result === "win" ? <Check /> : pick.result === "loss" ? <X /> : <Clock3 />}</b>
          <span><strong>{pick.selection}</strong><small>{pick.eventName} · {labels[pick.category] ?? pick.category}</small></span>
          <div><strong>{pick.result === "pending" ? "In play" : pick.result.toUpperCase()}</strong><small>{pick.certificationStatus === "certified" ? "Sportsbook confirmed" : pick.result === "pending" ? "Awaiting official result" : "STRATIQA settled"}</small></div>
        </article>) : <div className="home-empty"><Target /><strong>No tracked picks yet</strong><p>Find a pregame market and lock your first decision.</p><Link href="/matchups">Find picks <ArrowRight /></Link></div>}
      </Card>
      </div> : null}

      {!dashboardLayout.hidden.includes("updates") ? <div {...widgetProps("updates")}>{controls("updates")}
      <Card className="home-notifications" id="updates">
        <header><span><Bell /> Updates</span><Badge tone={feed.length ? "accent" : "neutral"}>{feed.length}</Badge></header>
        {feed.length ? feed.map((item) => <article className={item.tone} key={item.id}><i>{item.tone === "win" ? <ArrowUp /> : item.tone === "loss" ? <ArrowDown /> : <ShieldCheck />}</i><Link href={item.href}><strong>{item.title}</strong><small>{item.detail}</small></Link><button onClick={() => dismissFeedItem(item.id)} aria-label={`Dismiss ${item.title}`}><X /></button></article>) : <div className="home-empty compact"><Check /><strong>You&apos;re all caught up</strong><p>Settlements and milestones will appear here.</p></div>}
      </Card>
      </div> : null}

    {!dashboardLayout.hidden.includes("loop") ? <div {...widgetProps("loop")}>{controls("loop")}
    <Card className="home-how-it-works">
      <header><LockKeyhole /> Your competitive loop</header>
      <div><span><b>1</b><strong>Find an edge</strong><small>Explore games, props, or model recommendations.</small></span><span><b>2</b><strong>Lock your decision</strong><small>Your line and model attribution become immutable.</small></span><span><b>3</b><strong>Automatic result</strong><small>Official data settles the pick—never self-graded.</small></span><span><b>4</b><strong>Build your rating</strong><small>Climb personal, category, location, and model boards.</small></span></div>
    </Card>
    </div> : null}
    </section>
  </div>;
}
