"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, Check, ChevronDown, MapPin, ShieldCheck, Target, Trophy, Users } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";

type Profile = { public_alias?: string; public_slug?: string; country_code?: string; region_code?: string; locality?: string; leaderboard_opt_in?: boolean; show_recent_picks?: boolean; show_model_roster?: boolean; show_real_money_stats?: boolean };
type Rating = { category: string; rating: number; gradedPicks: number };
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
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [category, setCategory] = useState("player_prop");
  const [scope, setScope] = useState<"global" | "country" | "region" | "local">("global");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/competitive-profile").then((response) => response.json()),
      fetch("/api/picks", { cache: "no-store" }).then((response) => response.json()),
    ]).then(([profileResult, picksResult]) => {
      setProfile(profileResult.profile ?? {});
      setRatings(picksResult.ratings ?? []);
    }).catch(() => setProfile({}));
  }, []);

  useEffect(() => {
    if (profile === null) return;
    const query = new URLSearchParams({ category });
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
  }, [category, profile, scope]);

  const currentRating = ratings.find((rating) => rating.category === category);
  const currentLeader = leaders.find((leader) => leader.is_current_user);
  const distanceToTop10 = useMemo(() => {
    if (!currentRating || leaders.length < 10) return null;
    return Math.max(0, Math.round(leaders[9].rating - currentRating.rating + 1));
  }, [currentRating, leaders]);

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
  const remaining = Math.max(0, 25 - (currentRating?.gradedPicks ?? 0));

  return <div className="competitive-hub">
    <section className="standing-strip">
      <Card>
        <span><Target /> YOUR {categoryLabel.toUpperCase()} RATING</span>
        <strong>{currentRating ? Math.round(currentRating.rating) : "1500"}</strong>
        <small>{remaining ? `Provisional · ${remaining} settled picks to rank` : currentLeader ? `#${currentLeader.rank} ${scopes.find(([value]) => value === scope)?.[1]}` : "Ranked · Join the public board"}</small>
      </Card>
      <Card>
        <span><Trophy /> NEXT TARGET</span>
        <strong>{distanceToTop10 === null ? "Top 10" : distanceToTop10 ? `+${distanceToTop10}` : "Achieved"}</strong>
        <small>{distanceToTop10 ? "Rating points to enter the top 10" : "Keep building your category record"}</small>
      </Card>
      <Card>
        <span><Users /> COMPETITIVE SCOPE</span>
        <strong>{scopes.find(([value]) => value === scope)?.[1]}</strong>
        <small>{scope === "global" ? "Competing with every eligible analyst" : "Based on your saved ranking region"}</small>
      </Card>
    </section>

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
          }) : <div className="ranking-empty"><Trophy /><strong>The top 10 is open</strong><p>Be among the first analysts to complete 25 automatically settled {categoryLabel.toLowerCase()} picks in this region.</p><Link href="/matchups">Find your next pick <ArrowRight /></Link></div>}
        </Card>
      </section>
    </div>
  </div>;
}
