"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, ChevronDown, Clock3, LockKeyhole, Plus, ShieldAlert, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { lifecycleLabel, pickLifecycle } from "@/lib/picks/lifecycle.js";
import { ratingImpactExplanation } from "@/lib/notifications/settlement-feed.js";
import { competitiveStanding } from "@/lib/ratings/competitive-ranks.js";
import type { CategoryRating, PickRatingImpact, SettlementAudit, TrackedCard, TrackedPick } from "@/repositories/picks";

const categories = [
  ["player_prop", "Player prop"], ["moneyline", "Moneyline"], ["spread", "Spread"],
  ["total", "Total"], ["parlay", "Parlay"],
];
const sportsbooks = ["DraftKings", "FanDuel", "BetMGM", "Caesars", "Fanatics", "BetRivers", "BetOnline", "Bovada", "MyBookie", "BetUS", "Other"];
const categoryNames: Record<string, string> = {
  player_prop: "Player Props",
  moneyline: "Moneylines",
  spread: "Spreads",
  total: "Totals",
  parlay: "Parlays",
  live: "Live Markets",
};
type LifecycleState = "upcoming" | "live" | "awaiting" | "settled";
type LivePickStatus = {
  pickId: string; state: LifecycleState; homeTeam: string | null; awayTeam: string | null;
  homeScore: number | null; awayScore: number | null;
};

function ratingFromPicks(picks: TrackedPick[]) {
  return Math.round(picks
    .filter((pick) => pick.source === "provider" && pick.verificationStatus === "verified")
    .reduce((rating, pick) => {
      if (pick.result === "push") return rating;
      const expected = pick.americanOdds > 0 ? 100 / (pick.americanOdds + 100) : Math.abs(pick.americanOdds) / (Math.abs(pick.americanOdds) + 100);
      return rating + 28 * ((pick.result === "win" ? 1 : 0) - expected);
    }, 1500));
}

function ratingReview(pick: TrackedPick) {
  const implied = Math.round((pick.americanOdds > 0 ? 100 / (pick.americanOdds + 100) : Math.abs(pick.americanOdds) / (Math.abs(pick.americanOdds) + 100)) * 100);
  if (pick.result === "win") return { impact: "UP", detail: `Beat a ${implied}% market expectation` };
  if (pick.result === "loss") return { impact: "DOWN", detail: `Missed a ${implied}% market expectation` };
  if (pick.result === "push") return { impact: "EVEN", detail: "Pushes never change your rating" };
  return { impact: "LOCKED", detail: "Waiting for automatic settlement" };
}

export function PickLedger() {
  const [picks, setPicks] = useState<TrackedPick[]>([]);
  const [ratings, setRatings] = useState<CategoryRating[]>([]);
  const [cards, setCards] = useState<TrackedCard[]>([]);
  const [settlementAudit, setSettlementAudit] = useState<SettlementAudit[]>([]);
  const [ratingImpacts, setRatingImpacts] = useState<PickRatingImpact[]>([]);
  const [status, setStatus] = useState("Loading your picks…");
  const [signedIn, setSignedIn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [liveStatuses, setLiveStatuses] = useState<Record<string, LivePickStatus>>({});
  const [lifecycleFilter, setLifecycleFilter] = useState<"all" | LifecycleState>("all");
  const refreshedSettlementIds = useRef(new Set<string>());

  const loadPicks = useCallback(() => {
    fetch("/api/picks", { cache: "no-store" })
      .then(async (response) => ({ response, result: await response.json() }))
      .then(({ response, result }) => {
        if (response.status === 401) {
          setSignedIn(false);
          setStatus("Sign in to start your pick journey.");
          return;
        }
        if (!response.ok) return setStatus(result.error);
        setPicks(result.picks);
        setRatings(result.ratings ?? []);
        setCards(result.cards ?? []);
        setSettlementAudit(result.settlementAudit ?? []);
        setRatingImpacts(result.ratingImpacts ?? []);
        setStatus(result.picks.length ? "" : "Your first pick is waiting.");
      })
      .catch(() => setStatus("Your picks could not be loaded. Please try again."));
  }, []);
  useEffect(() => { loadPicks(); }, [loadPicks]);
  useEffect(() => {
    let active = true;
    async function refreshLive() {
      const response = await fetch("/api/picks/live", { cache: "no-store" }).catch(() => null);
      if (!active || !response?.ok) return;
      const result = await response.json();
      setLiveStatuses(Object.fromEntries((result.picks ?? []).map((item: LivePickStatus) => [item.pickId, item])));
      const newlySettled = (result.picks ?? []).filter((item: LivePickStatus) =>
        item.state === "settled" && !refreshedSettlementIds.current.has(item.pickId),
      );
      if (newlySettled.length) {
        newlySettled.forEach((item: LivePickStatus) => refreshedSettlementIds.current.add(item.pickId));
        loadPicks();
      }
    }
    refreshLive();
    const timer = window.setInterval(refreshLive, 90_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [loadPicks]);

  const summary = useMemo(() => {
    const settled = picks.filter((pick) => pick.source === "provider" && pick.verificationStatus === "verified" && pick.result !== "pending");
    const certified = settled.filter((pick) => pick.certificationStatus === "certified");
    const wins = settled.filter((pick) => pick.result === "win").length;
    const decisions = settled.filter((pick) => pick.result === "win" || pick.result === "loss").length;
    const ratedSamples = ratings.reduce((sum, item) => sum + item.gradedPicks, 0);
    const rating = ratedSamples
      ? Math.round(ratings.reduce((sum, item) => sum + item.rating * item.gradedPicks, 0) / ratedSamples)
      : ratingFromPicks(picks);
    const standing = competitiveStanding(rating, settled.length);
    const rank = standing.tier;
    const next = standing.nextTier;
    const progress = standing.tierProgress;
    const realProfit = certified.reduce((sum, pick) => sum + (pick.realProfitAmount ?? 0), 0);
    const realStake = certified.reduce((sum, pick) => sum + (pick.realStakeAmount ?? 0), 0);
    const hasRealMoney = certified.some((pick) => pick.realStakeAmount !== null && pick.realProfitAmount !== null);
    return { settled: settled.length, certified: certified.length, wins, decisions, rating, rank, next, progress, realProfit, realRoi: realStake ? realProfit / realStake * 100 : 0, hasRealMoney };
  }, [picks, ratings]);
  const lifecycleCounts = useMemo(() => {
    const counts: Record<LifecycleState, number> = { upcoming: 0, live: 0, awaiting: 0, settled: 0 };
    for (const pick of picks.filter((item) => item.source === "provider")) {
      const state = (liveStatuses[pick.id]?.state ?? pickLifecycle(pick)) as LifecycleState;
      counts[state] += 1;
    }
    return counts;
  }, [liveStatuses, picks]);
  const visiblePicks = useMemo(() => picks.filter((pick) => lifecycleFilter === "all" ||
    (pick.source === "provider" && (liveStatuses[pick.id]?.state ?? pickLifecycle(pick)) === lifecycleFilter)
  ), [lifecycleFilter, liveStatuses, picks]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = event.currentTarget;
    const response = await fetch("/api/picks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return setStatus(result.error);
    setPicks((current) => [result.pick, ...current]);
    form.reset();
    setStatus("Saved to your private practice journal.");
  }

  return (
    <div className="pick-journey">
      <nav className="performance-jump" aria-label="Performance sections">
        <a href="#overview">Overview</a>
        <a href="#specialties">Specialties</a>
        <a href="#parlays">Parlays</a>
        <a href="#history">Pick history</a>
      </nav>

      <section className="performance-explainer" aria-label="How performance is measured">
        <div><Trophy /><span><strong>STRATIQA performance</strong><small>Every pick locked before game time builds your rating after automatic settlement.</small></span></div>
        <div><ShieldAlert /><span><strong>Confirmed money stats</strong><small>Sportsbook proof adds real profit and ROI. Without proof, those two fields simply stay N/A.</small></span></div>
      </section>

      <section className="pick-rating-grid" id="overview">
        <Card className="pick-rating-card">
          <div className="rating-glow" style={{ background: summary.rank.color }} />
          <header><span><Trophy /> PICK RATING</span><Badge tone={summary.settled >= 25 ? "success" : "warning"}>{summary.settled >= 25 ? "RANKED" : "PROVISIONAL"}</Badge></header>
          <div className="rating-score"><strong>{summary.rating}</strong><span style={{ color: summary.rank.color }}>{summary.rank.name}</span></div>
          <div className="rank-progress">
            <div><span>{summary.rank.name}</span><small>{summary.next === summary.rank ? "Top rank achieved" : `${summary.next.floor - summary.rating} points to ${summary.next.name}`}</small></div>
            <i><em style={{ width: `${summary.progress}%`, background: summary.rank.color }} /></i>
          </div>
          <p><Sparkles /> Complete {Math.max(0, 25 - summary.settled)} more automatically settled picks to unlock full rankings.</p>
        </Card>

        <Card className="pick-next-card">
          <span className="landing-kicker">YOUR NEXT MOVE</span>
          <h2>Make a pick. Build your game.</h2>
          <p>Lock a pregame line and it counts toward your STRATIQA rating after automatic settlement. Then follow it live here.</p>
          <Link href="/matchups"><Zap /> Find a pregame pick <ArrowRight /></Link>
          <small><LockKeyhole /> Results are settled automatically—you never grade yourself.</small>
        </Card>
      </section>

      <section className="pick-stats-strip">
        <div><small>STRATIQA</small><strong>{summary.settled}</strong><span>Rated picks</span></div>
        <div><small>STRATIQA</small><strong>{summary.decisions ? `${(summary.wins / summary.decisions * 100).toFixed(0)}%` : "—"}</strong><span>Accuracy</span></div>
        <div><small>CONFIRMED</small><strong className={summary.hasRealMoney && summary.realProfit >= 0 ? "positive" : summary.hasRealMoney ? "negative" : ""}>{summary.hasRealMoney ? `${summary.realProfit >= 0 ? "+" : ""}$${summary.realProfit.toFixed(2)}` : "N/A"}</strong><span>Real profit</span></div>
        <div><small>CONFIRMED</small><strong>{summary.hasRealMoney ? `${summary.realRoi.toFixed(1)}%` : "N/A"}</strong><span>Real ROI</span></div>
      </section>

      <Card className="performance-specialties" id="specialties">
        <header><span><BarChart3 /> Category specialties</span><Link href="/leaderboard">View leaderboards <ArrowRight /></Link></header>
        <p>Your overall rating is only the start. Each pick type has its own rating so your strongest edge is easy to see.</p>
        {ratings.length ? <div>{[...ratings].sort((a, b) => b.rating - a.rating).map((item, index) => {
          const categoryRank = competitiveStanding(item.rating, item.gradedPicks).tier;
          return <article key={item.category}>
            <span><i>{index + 1}</i><strong>{categoryNames[item.category] ?? item.category.replaceAll("_", " ")}</strong></span>
            <div><b style={{ color: categoryRank.color }}>{item.rating}</b><small>{categoryRank.name} · {item.gradedPicks} settled</small></div>
            <em>{item.gradedPicks >= 25 ? "RANKED" : `${Math.max(0, 25 - item.gradedPicks)} TO RANK`}</em>
          </article>;
        })}</div> : <div className="specialties-empty"><Target /><span><strong>Your specialties will appear here</strong><small>Lock picks across different markets to discover where your model performs best.</small></span></div>}
      </Card>

      {cards.some((card) => card.cardType === "parlay") ? <Card className="parlay-record" id="parlays">
        <header><span><Trophy /> Parlay cards</span><Badge>{cards.filter((card) => card.cardType === "parlay").length}</Badge></header>
        <div>{cards.filter((card) => card.cardType === "parlay").slice(0, 6).map((card) => {
          const price = card.combinedAmericanOdds;
          return <article key={card.id} className={`pick-result-${card.result}`}>
            <div><small>{card.legCount}-LEG PARLAY</small><strong>{price == null ? "Calculating price" : `${price > 0 ? "+" : ""}${price}`}</strong><span>{card.confidence}% card confidence</span></div>
            <div><small>RESULT</small><strong>{card.result === "pending" ? "In play" : card.result.toUpperCase()}</strong><span>{card.result === "win" ? `+${(card.profitUnits ?? 0).toFixed(2)}u` : card.result === "loss" ? `-${card.stakeUnits.toFixed(2)}u` : "Automatic settlement"}</span></div>
          </article>;
        })}</div>
        <p>Each leg keeps its category record. The complete card separately builds your Parlay rating.</p>
      </Card> : <Card className="parlay-record parlay-record-empty" id="parlays"><header><span><Trophy /> Parlay cards</span><Badge>0</Badge></header><div className="specialties-empty"><Target /><span><strong>No parlays tracked yet</strong><small>Build a multi-leg slip and lock it to begin your separate Parlay rating.</small></span></div></Card>}

      <section className="pick-lifecycle-board" aria-label="Filter picks by status">
        <button className={lifecycleFilter === "all" ? "active" : ""} onClick={() => setLifecycleFilter("all")}><span>All picks</span><strong>{picks.filter((pick) => pick.source === "provider").length}</strong></button>
        {(["upcoming", "live", "awaiting", "settled"] as LifecycleState[]).map((state) => <button className={lifecycleFilter === state ? `active ${state}` : state} onClick={() => setLifecycleFilter(state)} key={state}><span>{lifecycleLabel(state)}</span><strong>{lifecycleCounts[state]}</strong>{state === "live" ? <i /> : null}</button>)}
      </section>

      <div className="pick-content-grid">
        <Card className="pick-history" id="history">
          <header><span><Clock3 /> Recent picks</span><Badge>{picks.length}</Badge></header>
          {visiblePicks.length ? <div>{visiblePicks.map((pick) => {
            const certified = pick.certificationStatus === "certified";
            const verified = pick.source === "provider" && pick.verificationStatus === "verified";
            const rating = ratingReview(pick);
            const exactImpact = ratingImpacts.find((impact) => impact.pickId === pick.id);
            const audit = settlementAudit.filter((entry) => entry.pickId === pick.id);
            const liveStatus = liveStatuses[pick.id];
            const lifecycle = (liveStatus?.state ?? pickLifecycle(pick)) as LifecycleState;
            return <article key={pick.id} className={`pick-result-${pick.result}`}>
              <div className="pick-result-mark">{pick.result === "win" ? "W" : pick.result === "loss" ? "L" : pick.result === "push" ? "P" : "…"}</div>
              <div className="pick-result-copy"><small>My pick{pick.modelName ? ` · Analyzed by ${pick.modelName} v${pick.modelVersion ?? 1}` : ""} · {pick.sport} · {pick.category.replace("_", " ")}</small><strong>{pick.selection}</strong><p>{pick.eventName}</p>{audit.length ? <details className="settlement-details"><summary>Official result details <ChevronDown /></summary>{audit.map((entry) => <span key={entry.id}><b>{entry.previousResult && entry.previousResult !== entry.result ? `${entry.previousResult.toUpperCase()} → ` : ""}{entry.result.toUpperCase()}</b><small>{entry.reason ?? entry.provider}{entry.revision ? ` · Revision ${entry.revision}` : ""}</small><time>{new Date(entry.createdAt).toLocaleString()}</time></span>)}</details> : null}</div>
              <div className="pick-result-review"><span className={`pick-lifecycle-status ${lifecycle}`}>{lifecycle === "live" ? <i /> : null}{lifecycleLabel(lifecycle)}{liveStatus && liveStatus.homeScore !== null && liveStatus.awayScore !== null ? ` · ${liveStatus.awayTeam} ${liveStatus.awayScore}–${liveStatus.homeScore} ${liveStatus.homeTeam}` : ""}</span><strong>{certified ? "Sportsbook confirmed" : pick.certificationStatus === "evidence_pending" ? "Proof pending" : verified ? "STRATIQA settled" : pick.category === "player_prop" ? "Waiting for official stats" : "Awaiting result"}</strong><small>{exactImpact ? ratingImpactExplanation(pick, exactImpact) : pick.settlementReason ?? (verified ? rating.detail : "Automatic result pending")}</small></div>
              <div className="pick-result-rating">{verified ? exactImpact ? <><b>{exactImpact.ratingChange > 0 ? "+" : ""}{Math.round(exactImpact.ratingChange)}</b><small>rating</small></> : <><b>{rating.impact}</b><small>rating</small></> : <LockKeyhole />}</div>
            </article>;
          })}</div> : <div className="ledger-empty"><Target /><strong>Your journey starts with one pick</strong><p>Open Matchups, find a position you believe in, and start building your verified rating.</p><Link href="/matchups">Explore matchups <ArrowRight /></Link></div>}
        </Card>

        <aside>
          <details className="practice-entry">
            <summary><span><Plus /> Add a practice pick</span><ChevronDown /></summary>
            <p>Journal a pick for yourself. Practice picks never affect ratings or leaderboards.</p>
            {signedIn ? <form onSubmit={create}>
              <label>What&apos;s your pick?<input name="selection" required placeholder="Mariners moneyline" maxLength={120} /></label>
              <label>Which game?<input name="eventName" required placeholder="Mariners at Giants" maxLength={120} /></label>
              <div className="ledger-field-row"><label>Sport<input name="sport" required placeholder="MLB" maxLength={20} /></label><label>Pick type<select name="category">{categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
              <details className="advanced-pick-fields"><summary>Advanced details <ChevronDown /></summary>
                <label>Market<input name="market" required defaultValue="Moneyline" maxLength={120} /></label>
                <div className="ledger-field-row"><label>Sportsbook<select name="sportsbook">{sportsbooks.map((book) => <option key={book}>{book}</option>)}</select></label><label>Odds<input name="americanOdds" type="number" required defaultValue={-110} /></label></div>
                <div className="ledger-field-row"><label>Units<input name="stakeUnits" type="number" min=".01" max="100" step=".01" defaultValue="1" /></label><label>Confidence<input name="confidence" type="number" min="1" max="100" defaultValue="65" /></label></div>
                <label>Note<textarea name="notes" maxLength={500} placeholder="What did you see?" /></label>
              </details>
              <Button disabled={saving}><Plus /> {saving ? "Saving…" : "Save practice pick"}</Button>
            </form> : <div className="ledger-signin"><ShieldAlert /><strong>Sign in to save picks</strong><p>Your picks stay private until you choose otherwise.</p><Link href="/account">Open account</Link></div>}
          </details>
          <Card className="rating-guide">
            <header><Trophy /> How ratings work</header>
            <p>Every locked pick moves your rating after automatic settlement. Sportsbook proof only unlocks real-money statistics.</p>
            <div><span><i className="guide-win">W</i> Beat a tough line</span><b>More points</b></div>
            <div><span><i className="guide-loss">L</i> Miss an expected win</span><b>More risk</b></div>
            <div><span><i className="guide-push">P</i> Push or void</span><b>No change</b></div>
            <details><summary>Advanced stats <ChevronDown /></summary><small>Closing-line value, confidence calibration, category performance, and sample strength contribute behind the scenes. Units are bankroll analytics only.</small></details>
          </Card>
        </aside>
      </div>
      {status ? <p className="ledger-status" role="status">{status}</p> : null}
    </div>
  );
}
