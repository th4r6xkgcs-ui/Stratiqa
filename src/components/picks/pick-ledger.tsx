"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Clock3, LockKeyhole, Plus, ShieldAlert, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";
import type { CategoryRating, TrackedPick } from "@/repositories/picks";

const categories = [
  ["player_prop", "Player prop"], ["moneyline", "Moneyline"], ["spread", "Spread"],
  ["total", "Total"], ["parlay", "Parlay"], ["live", "Live market"],
];
const sportsbooks = ["DraftKings", "FanDuel", "BetMGM", "Caesars", "Fanatics", "BetRivers", "BetOnline", "Bovada", "MyBookie", "BetUS", "Other"];
const ranks = [
  { name: "Rookie", floor: 0, color: "#7d8b96" },
  { name: "Scout", floor: 1200, color: "#54b7e8" },
  { name: "Strategist", floor: 1450, color: "#a66cff" },
  { name: "Sharp", floor: 1650, color: "#2ecc55" },
  { name: "Expert", floor: 1850, color: "#ffb84d" },
  { name: "Elite", floor: 2000, color: "#ff6e76" },
  { name: "Grandmaster", floor: 2250, color: "#ffd75f" },
];

function ratingFromPicks(picks: TrackedPick[]) {
  return Math.round(picks
    .filter((pick) => pick.verificationStatus === "verified")
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
  const [status, setStatus] = useState("Loading your picks…");
  const [signedIn, setSignedIn] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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
        setStatus(result.picks.length ? "" : "Your first pick is waiting.");
      })
      .catch(() => setStatus("Your picks could not be loaded. Please try again."));
  }, []);

  const summary = useMemo(() => {
    const verified = picks.filter((pick) => pick.verificationStatus === "verified" && pick.result !== "pending");
    const wins = verified.filter((pick) => pick.result === "win").length;
    const decisions = verified.filter((pick) => pick.result === "win" || pick.result === "loss").length;
    const ratedSamples = ratings.reduce((sum, item) => sum + item.gradedPicks, 0);
    const rating = ratedSamples
      ? Math.round(ratings.reduce((sum, item) => sum + item.rating * item.gradedPicks, 0) / ratedSamples)
      : ratingFromPicks(picks);
    const rankIndex = ranks.findLastIndex((rank) => rating >= rank.floor);
    const rank = ranks[Math.max(0, rankIndex)];
    const next = ranks[Math.min(ranks.length - 1, rankIndex + 1)];
    const progress = next === rank ? 100 : Math.max(0, Math.min(100, (rating - rank.floor) / (next.floor - rank.floor) * 100));
    const profit = verified.reduce((sum, pick) => sum + (pick.profitUnits ?? 0), 0);
    const stake = verified.reduce((sum, pick) => sum + pick.stakeUnits, 0);
    return { verified: verified.length, wins, decisions, rating, rank, next, progress, profit, roi: stake ? profit / stake * 100 : 0 };
  }, [picks, ratings]);

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
      <section className="pick-rating-grid">
        <Card className="pick-rating-card">
          <div className="rating-glow" style={{ background: summary.rank.color }} />
          <header><span><Trophy /> PICK RATING</span><Badge tone={summary.verified >= 25 ? "success" : "warning"}>{summary.verified >= 25 ? "VERIFIED" : "PROVISIONAL"}</Badge></header>
          <div className="rating-score"><strong>{summary.rating}</strong><span style={{ color: summary.rank.color }}>{summary.rank.name}</span></div>
          <div className="rank-progress">
            <div><span>{summary.rank.name}</span><small>{summary.next === summary.rank ? "Top rank achieved" : `${summary.next.floor - summary.rating} points to ${summary.next.name}`}</small></div>
            <i><em style={{ width: `${summary.progress}%`, background: summary.rank.color }} /></i>
          </div>
          <p><Sparkles /> Complete {Math.max(0, 25 - summary.verified)} more verified picks to unlock full rankings.</p>
        </Card>

        <Card className="pick-next-card">
          <span className="landing-kicker">YOUR NEXT MOVE</span>
          <h2>Make a pick. Build your game.</h2>
          <p>Choose from live STRATIQA matchups. We lock the line, verify the result, and explain every rating change.</p>
          <Link href="/matchups"><Zap /> Find a verified pick <ArrowRight /></Link>
          <small><LockKeyhole /> Results are settled automatically—you never grade yourself.</small>
        </Card>
      </section>

      <section className="pick-stats-strip">
        <div><strong>{summary.verified}</strong><span>Verified picks</span></div>
        <div><strong>{summary.decisions ? `${(summary.wins / summary.decisions * 100).toFixed(0)}%` : "—"}</strong><span>Accuracy</span></div>
        <div><strong className={summary.profit >= 0 ? "positive" : "negative"}>{summary.profit >= 0 ? "+" : ""}{summary.profit.toFixed(1)}u</strong><span>Net units</span></div>
        <div><strong>{summary.verified ? `${summary.roi.toFixed(1)}%` : "—"}</strong><span>Verified ROI</span></div>
      </section>

      <div className="pick-content-grid">
        <Card className="pick-history">
          <header><span><Clock3 /> Recent picks</span><Badge>{picks.length}</Badge></header>
          {picks.length ? <div>{picks.map((pick) => {
            const verified = pick.verificationStatus === "verified";
            const review = pick.result === "win" ? "Great pick" : pick.result === "loss" ? "Review the read" : pick.result === "push" ? "Even result" : "Waiting";
            const rating = ratingReview(pick);
            return <article key={pick.id} className={`pick-result-${pick.result}`}>
              <div className="pick-result-mark">{pick.result === "win" ? "W" : pick.result === "loss" ? "L" : pick.result === "push" ? "P" : "…"}</div>
              <div className="pick-result-copy"><small>{pick.pickOrigin === "model" ? `My model${pick.modelName ? ` · ${pick.modelName}` : ""}` : pick.pickOrigin === "stratiqa" ? "AI Coach pick" : "My pick"} · {pick.sport} · {pick.category.replace("_", " ")}</small><strong>{pick.selection}</strong><p>{pick.eventName}</p></div>
              <div className="pick-result-review"><strong>{review}</strong><small>{verified ? rating.detail : pick.verificationStatus === "pending" ? "Auto-settlement pending" : "Practice journal"}</small></div>
              <div className="pick-result-rating">{verified ? <><b>{rating.impact}</b><small>rating</small></> : <LockKeyhole />}</div>
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
            <p>Verified wins move you up. Losses move you down. Your stake size never changes rating points.</p>
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
