"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BrainCircuit, Crown, ShieldCheck, Trophy, UserCheck, UserPlus } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";

type Leader = {
  rank: number; model_id: string; model_name: string; owner_alias: string; owner_slug: string;
  sport: string; category: string; rating: number; graded_picks: number; wins: number; losses: number;
  roi_percent: number | null; version: number; sample_status: string; is_current_user: boolean;
  follower_count: number; is_following: boolean; rating_change: number; weekly_results: number;
};
const sports = ["MLB", "NBA", "NFL", "NHL", "WNBA"];
const categories = [["player_prop", "Player Props"], ["moneyline", "Moneylines"], ["spread", "Spreads"], ["total", "Totals"]];

export function PublicModelLeaderboard() {
  const [sport, setSport] = useState("MLB");
  const [category, setCategory] = useState("player_prop");
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const [followStatus, setFollowStatus] = useState("");
  const queryKey = `${sport}:${category}`;
  const loading = loadedKey !== queryKey;

  useEffect(() => {
    fetch(`/api/models/public?sport=${encodeURIComponent(sport)}&category=${encodeURIComponent(category)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : { leaders: [] })
      .then((result) => setLeaders(result.leaders ?? []))
      .catch(() => setLeaders([]))
      .finally(() => setLoadedKey(queryKey));
  }, [category, queryKey, sport]);

  async function toggleFollow(leader: Leader) {
    setFollowStatus(leader.is_following ? "Unfollowing model..." : "Following model...");
    const response = await fetch(leader.is_following ? `/api/models/follows?modelId=${encodeURIComponent(leader.model_id)}` : "/api/models/follows", {
      method: leader.is_following ? "DELETE" : "POST",
      headers: leader.is_following ? undefined : { "Content-Type": "application/json" },
      body: leader.is_following ? undefined : JSON.stringify({ modelId: leader.model_id }),
    });
    const result = await response.json();
    if (!response.ok) return setFollowStatus(result.error ?? "That follow could not be updated.");
    setLeaders((current) => current.map((item) => item.model_id === leader.model_id ? {
      ...item, is_following: result.following, follower_count: Math.max(0, item.follower_count + (result.following ? 1 : -1)),
    } : item));
    setFollowStatus(result.following ? `Following ${leader.model_name}. Its public performance pulse will appear above.` : `Stopped following ${leader.model_name}.`);
  }

  const categoryLabel = categories.find(([key]) => key === category)?.[1] ?? "Models";
  return <section className="public-model-leaderboard">
    <header><div><span className="landing-kicker">PUBLIC MODEL REPUTATION</span><h2>Systems earn a public record</h2><p>Only live models from analysts who opt in are listed. Strategies, weights, notes, and private recommendation history stay private.</p></div><Badge tone="accent">VERIFIED ONLY</Badge></header>
    <div className="model-public-filters"><div className="filter-tabs">{sports.map((item) => <button className={sport === item ? "active" : ""} onClick={() => setSport(item)} key={item}>{item}</button>)}</div><div className="filter-tabs">{categories.map(([key, label]) => <button className={category === key ? "active" : ""} onClick={() => setCategory(key)} key={key}>{label}</button>)}</div></div>
    <Card className="public-model-table"><header><span>Rank</span><span>Model</span><span>Rating</span><span>Verified record</span><span>Status</span></header>{loading ? <div className="public-model-loading">{[1, 2, 3, 4].map((item) => <i key={item} />)}</div> : leaders.length ? leaders.map((leader) => <article className={leader.is_current_user ? "current" : ""} key={leader.model_id}><b>#{leader.rank}</b><span><strong>{leader.rank === 1 ? <Crown /> : <BrainCircuit />}{leader.model_name}{leader.is_current_user ? " (Yours)" : ""}</strong><small>v{leader.version} · by {leader.owner_slug ? <Link href={`/analysts/${leader.owner_slug}`}>{leader.owner_alias}</Link> : leader.owner_alias} · {leader.follower_count} following</small></span><strong>{Math.round(leader.rating)}<small>{leader.rating_change ? `${leader.rating_change > 0 ? "+" : ""}${Math.round(leader.rating_change)} rating change` : "Verified rating"}</small></strong><span><b>{leader.wins}-{leader.losses}</b><small>{leader.graded_picks} automatic · {leader.weekly_results} this week</small></span><span className="model-table-actions"><Badge tone={leader.sample_status === "Established" ? "success" : "warning"}>{leader.sample_status}</Badge>{!leader.is_current_user ? <button type="button" className={leader.is_following ? "following" : ""} onClick={() => void toggleFollow(leader)}>{leader.is_following ? <UserCheck /> : <UserPlus />}{leader.is_following ? "Following" : "Follow"}</button> : null}</span></article>) : <div className="public-model-empty"><Trophy /><strong>{`${sport} ${categoryLabel} is open`}</strong><p>Promote a model, earn 10 automatically verified outcomes, and opt into a public analyst profile to appear here.</p><Link href="/lab">Build a model <ArrowRight /></Link></div>}</Card>
    <footer><ShieldCheck /> A public model record shows evidence and sample size—not a guaranteed outcome. Ratings never reflect wager size.</footer>
    {followStatus ? <p className="model-follow-status">{followStatus}</p> : null}
  </section>;
}
