"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, Check, ChevronDown, Crown, LockKeyhole, MapPin, ShieldCheck, Sparkles, Swords, Target, Trophy, Users } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { competitiveStanding, nearbyRivals, promotionForImpact } from "@/lib/ratings/competitive-ranks.js";

type Profile = { public_alias?: string; public_slug?: string; country_code?: string; region_code?: string; locality?: string; leaderboard_opt_in?: boolean; show_recent_picks?: boolean; show_model_roster?: boolean; show_real_money_stats?: boolean };
type Rating = { category: string; rating: number; gradedPicks: number };
type RatingImpact = { pickId: string; category: string; previousRating: number; rating: number; ratingChange: number; recordedAt: string };
type Leader = {
  rank: number; public_alias: string; category: string; rating: number; previous_rating?: number;
  public_slug?: string; rating_change?: number; graded_picks: number; wins: number; losses: number; roi_percent?: number;
  win_rate?: number; country_code?: string; region_code?: string; locality?: string; is_current_user?: boolean;
};

const categories = [["player_prop", "Player Props"], ["moneyline", "Moneylines"], ["spread", "Spreads"], ["total", "Totals"], ["parlay", "Parlays"]];
const scopes = [["global", "Worldwide"], ["country", "Country"], ["region", "State"], ["local", "Local"]] as const;

function Movement({ value = 0 }: { value?: number }) {
  const rounded = Math.round(value);
  return <span className={`rating-movement ${rounded > 0 ? "up" : rounded < 0 ? "down" : ""}`}>
    {rounded > 0 ? <ArrowUp /> : rounded < 0 ? <ArrowDown /> : null}{rounded === 0 ? "—" : Math.abs(rounded)}
  </span>;
}

export function CertifiedLeaderboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [ratingImpacts, setRatingImpacts] = useState<RatingImpact[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [category, setCategory] = useState("player_prop");
  const [scope, setScope] = useState<"global" | "country" | "region" | "local">("global");
  const [competition, setCompetition] = useState<"lifetime" | "season">("lifetime");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/competitive-profile").then((response) => response.json()),
      fetch("/api/picks", { cache: "no-store" }).then((response) => response.json()),
    ]).then(([profileResult, picksResult]) => {
      setProfile(profileResult.profile ?? {});
      const nextRatings = picksResult.ratings ?? [];
      setRatings(nextRatings);
      if (nextRatings.length) setCategory([...nextRatings].sort((left, right) => right.rating - left.rating || right.gradedPicks - left.gradedPicks)[0].category);
      setRatingImpacts(picksResult.ratingImpacts ?? []);
    }).catch(() => setProfile({}));
  }, []);

  useEffect(() => {
    if (profile === null) return;
    const query = new URLSearchParams({ category });
    if (competition === "season") query.set("season", "current");
    if (scope !== "global" && profile.country_code) query.set("country", profile.country_code);
    if (["region", "local"].includes(scope) && profile.region_code) query.set("region", profile.region_code);
    if (scope === "local" && profile.locality) query.set("locality", profile.locality);
    fetch(`/api/leaderboard?${query}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setLeaders(result.leaders ?? []);
      })
      .catch(() => setLeaders([]))
      .finally(() => setLoading(false));
  }, [category, competition, profile, scope]);

  const currentRating = ratings.find((rating) => rating.category === category);
  const currentLeader = leaders.find((leader) => leader.is_current_user);
  const activeRating = competition === "season" && currentLeader ? { rating: currentLeader.rating, gradedPicks: currentLeader.graded_picks } : currentRating;
  const standing = competitiveStanding(activeRating?.rating ?? 1500, activeRating?.gradedPicks ?? 0);
  const rivals = nearbyRivals(leaders, standing.rating, 3) as Leader[];
  const latestImpact = ratingImpacts.filter((impact) => impact.category === category).sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
  const categoryHistory = ratingImpacts.filter((impact) => impact.category === category).sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()).slice(-8);
  const personalBest = Math.max(standing.rating, ...categoryHistory.map((impact) => impact.rating));
  const promotion = latestImpact ? promotionForImpact(latestImpact.previousRating, latestImpact.rating, currentRating?.gradedPicks ?? 0) : null;
  const distanceToTop10 = (() => {
    if (!currentRating || leaders.length < 10) return null;
    return Math.max(0, Math.round(leaders[9].rating - currentRating.rating + 1));
  })();

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/competitive-profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicAlias: data.publicAlias, countryCode: data.countryCode, regionCode: data.regionCode, locality: data.locality, leaderboardOptIn: data.leaderboardOptIn === "on", showRecentPicks: data.showRecentPicks === "on", showModelRoster: data.showModelRoster === "on", showRealMoneyStats: data.showRealMoneyStats === "on" }),
    });
    const result = await response.json();
    if (!response.ok) return setStatus(result.error);
    setProfile(result.profile);
    setStatus("Ranking profile saved.");
  }

  if (profile === null) return <Card className="premium-empty"><Trophy /><strong>Loading competitive rankings…</strong></Card>;
  const categoryLabel = categories.find(([value]) => value === category)?.[1] ?? "Category";
  const qualification = competition === "season" ? 10 : 25;
  const remaining = Math.max(0, qualification - (activeRating?.gradedPicks ?? 0));
  const competitionLabel = competition === "season" ? "Current season" : "Lifetime";

  return <div className="competitive-hub">
    {promotion ? <Card className="rank-promotion">
      <Sparkles /><div><Badge tone="success">RANK UP</Badge><h2>{promotion.from.name} → {promotion.to.name}</h2><p>Your latest automatically settled {categoryLabel.toLowerCase()} pick moved you into a new competitive tier.</p></div><Crown />
    </Card> : null}
    <section className="standing-strip">
      <Card>
        <span><Target /> YOUR {categoryLabel.toUpperCase()} RATING</span>
        <strong>{standing.rating}</strong>
        <small>{remaining ? `${competitionLabel} · ${remaining} settled picks to qualify` : currentLeader ? `#${currentLeader.rank} ${scopes.find(([value]) => value === scope)?.[1]} · ${competitionLabel}` : `Ranked · ${standing.tier.name}`}</small>
      </Card>
      <Card>
        <span><Trophy /> NEXT RANK</span>
        <strong>{standing.nextTier === standing.tier ? "Peak" : standing.nextTier.name}</strong>
        <small>{standing.pointsToNext ? `${standing.pointsToNext} rating points away` : "Highest competitive tier achieved"}</small>
      </Card>
      <Card>
        <span><Users /> COMPETITIVE SCOPE</span>
        <strong>{scopes.find(([value]) => value === scope)?.[1]}</strong>
        <small>{scope === "global" ? "Competing with every eligible analyst" : "Based on your saved ranking region"}</small>
      </Card>
    </section>

    <section className="rank-journey-grid">
      <Card className="placement-journey">
        <header><span>{!remaining ? <ShieldCheck /> : <LockKeyhole />} {!remaining ? `${competitionLabel.toUpperCase()} RANK ESTABLISHED` : "PLACEMENT JOURNEY"}</span><Badge tone={!remaining ? "success" : "warning"}>{activeRating?.gradedPicks ?? 0}/{qualification}</Badge></header>
        <div><i><em style={{ width: `${Math.min(100, (activeRating?.gradedPicks ?? 0) / qualification * 100)}%` }} /></i><strong>{!remaining ? `${standing.tier.name} rating established` : `${remaining} picks until ${competitionLabel.toLowerCase()} ranking`}</strong></div>
        <p>Each automatically settled {categoryLabel.toLowerCase()} pick improves the accuracy of your competitive rating. Wins and losses both count.</p>
      </Card>
      <Card className="tier-journey">
        <header><span><Crown /> TIER PROGRESS</span><strong style={{ color: standing.tier.color }}>{standing.tier.name}</strong></header>
        <div><i><em style={{ width: `${standing.tierProgress}%`, background: standing.tier.color }} /></i><small>{standing.pointsToNext ? `${standing.pointsToNext} points to ${standing.nextTier.name}` : "Grandmaster achieved"}</small></div>
        <p>Your rating reflects market difficulty, verified results, price quality, and performance—not how much money you wager. Personal best: <strong>{Math.round(personalBest)}</strong>.</p>
      </Card>
      <Card className="rival-preview">
        <header><span><Swords /> NEAR YOUR RATING</span><Badge>{scope.toUpperCase()}</Badge></header>
        {!remaining && rivals.length ? <><div className="rival-preview-list">{rivals.map((rival) => <span key={`${rival.public_alias}-${rival.rank}`}><b>#{rival.rank}</b><strong>{rival.public_slug ? <Link href={`/analysts/${rival.public_slug}`}>{rival.public_alias}</Link> : rival.public_alias}</strong><em>{Math.round(rival.rating)} · {Math.abs(Math.round(rival.rating - standing.rating))} away</em></span>)}</div><footer><span>Closest analysts in {categoryLabel.toLowerCase()}</span><Link href="/rivals">Open rival board <ArrowRight /></Link></footer></> : <div><Users /><strong>Rivals appear after placement</strong><small>Complete your category placement picks and join the public board.</small></div>}
      </Card>
    </section>

    {categoryHistory.length ? <Card className="category-rating-history">
      <header><span><ArrowUp /> RECENT {categoryLabel.toUpperCase()} RATING HISTORY</span><strong>Best {Math.round(personalBest)}</strong></header>
      <div>{categoryHistory.map((impact) => {
        const height = 24 + Math.max(0, Math.min(76, (impact.rating - 1200) / 10));
        return <span key={impact.pickId}><i style={{ height: `${height}%`, background: impact.ratingChange >= 0 ? "var(--green)" : "var(--orange)" }} /><small>{impact.ratingChange > 0 ? "+" : ""}{Math.round(impact.ratingChange)}</small></span>;
      })}</div>
      <p>Each bar is one automatically settled pick. Green increased your category rating; orange decreased it.</p>
    </Card> : null}

    <div className="certified-rankings">
      <Card className="ranking-profile">
        <header><span><MapPin /> YOUR COMPETITIVE REGION</span><Badge tone={profile.leaderboard_opt_in ? "success" : "warning"}>{profile.leaderboard_opt_in ? "VISIBLE" : "PRIVATE"}</Badge></header>
        <div className="ranking-profile-intro"><strong>Choose where you compete</strong><p>Your exact address is never requested. City is optional.</p></div>
        <form onSubmit={save}>
          <label>Public ranking name<input name="publicAlias" defaultValue={profile.public_alias ?? ""} maxLength={30} placeholder="Your analyst name" /></label>
          <div><label>Country code<input name="countryCode" defaultValue={profile.country_code ?? ""} maxLength={2} placeholder="US" /></label><label>State / region<input name="regionCode" defaultValue={profile.region_code ?? ""} maxLength={12} placeholder="CA" /></label></div>
          <label>City or metro <small>Optional—never enter an address</small><input name="locality" defaultValue={profile.locality ?? ""} maxLength={60} placeholder="Los Angeles" /></label>
          <label className="ranking-optin"><input name="leaderboardOptIn" type="checkbox" defaultChecked={profile.leaderboard_opt_in} /><span><ShieldCheck /> Show my alias once I have 25 automatically settled picks in a category.</span></label>
          <details className="ranking-privacy"><summary>Public profile privacy <ChevronDown /></summary><label><input name="showRecentPicks" type="checkbox" defaultChecked={profile.show_recent_picks !== false} /> Show recent verified picks</label><label><input name="showModelRoster" type="checkbox" defaultChecked={profile.show_model_roster !== false} /> Show active model roster</label><label><input name="showRealMoneyStats" type="checkbox" defaultChecked={profile.show_real_money_stats === true} /> Show sportsbook-confirmed money stats</label></details>
          <Button><Check /> Save ranking profile</Button>
        </form>
        {status ? <p>{status}</p> : null}
      </Card>

      <section className="ranking-board">
        <header>
          <div><small>COMPETITION</small><div className="filter-tabs"><button className={competition === "lifetime" ? "active" : ""} onClick={() => { setLoading(true); setCompetition("lifetime"); }}>Lifetime</button><button className={competition === "season" ? "active" : ""} onClick={() => { setLoading(true); setCompetition("season"); }}>Current season</button></div></div>
          <div><small>PICK CATEGORY</small><div className="filter-tabs">{categories.map(([value, label]) => <button className={category === value ? "active" : ""} onClick={() => { setLoading(true); setCategory(value); }} key={value}>{label}</button>)}</div></div>
          <div><small>LOCATION</small><div className="filter-tabs">{scopes.map(([value, label]) => <button className={scope === value ? "active" : ""} disabled={value !== "global" && !profile.country_code} onClick={() => { setLoading(true); setScope(value); }} key={value}>{label}</button>)}</div></div>
        </header>
        <Card className="certified-table">
          <header><span>Rank</span><span>Analyst</span><span>Rating</span><span>Move</span><span>Record</span></header>
          {loading ? <div className="ranking-loading">{[1, 2, 3, 4, 5].map((item) => <i key={item} />)}</div> : leaders.length ? leaders.map((leader) => {
            const decisions = leader.wins + leader.losses;
            return <details key={`${leader.category}-${leader.rank}-${leader.public_alias}`} className={leader.is_current_user ? "current-user" : ""}>
              <summary>
                <b>#{leader.rank}</b>
                <span><strong>{leader.public_slug ? <Link href={`/analysts/${leader.public_slug}`}>{leader.public_alias}{leader.is_current_user ? " (You)" : ""}</Link> : leader.public_alias}</strong><small>{[leader.locality, leader.region_code, leader.country_code].filter(Boolean).join(", ") || "Global"}</small></span>
                <strong>{Math.round(leader.rating)}</strong>
                <Movement value={leader.rating_change} />
                <span>{leader.wins}-{leader.losses}<small>{leader.graded_picks} rated</small></span>
                <ChevronDown />
              </summary>
              <div className="analyst-comparison">
                <div><small>WIN RATE</small><strong>{Number(leader.win_rate ?? (decisions ? leader.wins / decisions * 100 : 0)).toFixed(1)}%</strong></div>
                <div><small>CATEGORY</small><strong>{categoryLabel}</strong></div>
                <div><small>RATING MOVEMENT</small><strong>{leader.rating_change ? `${leader.rating_change > 0 ? "+" : ""}${Math.round(leader.rating_change)}` : "No change"}</strong></div>
                <div><small>SAMPLE STATUS</small><strong>{leader.graded_picks >= 50 ? "Established" : "Ranked"}</strong></div>
              </div>
            </details>;
          }) : <div className="ranking-empty"><Trophy /><strong>The top 10 is open</strong><p>Be among the first analysts to complete {qualification} automatically settled {categoryLabel.toLowerCase()} picks {competition === "season" ? "this season" : "in this region"}.</p><Link href="/matchups">Find your next pick <ArrowRight /></Link></div>}
        </Card>
        {currentRating && !remaining ? <Card className="top-ten-chase"><Target /><span><strong>{distanceToTop10 === null ? "Build the board" : distanceToTop10 ? `${distanceToTop10} points to the top 10` : "You reached the top 10"}</strong><small>{currentLeader ? `Currently #${currentLeader.rank} in ${scopes.find(([value]) => value === scope)?.[1].toLowerCase()} ${categoryLabel.toLowerCase()}` : "Enable your public profile to display your position while keeping personal details private."}</small></span><Link href="/matchups">Find next edge <ArrowRight /></Link></Card> : null}
      </section>
    </div>
  </div>;
}
