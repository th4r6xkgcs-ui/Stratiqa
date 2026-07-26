"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, MapPin, ShieldCheck, Trophy } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";

type Profile = { public_alias?: string; country_code?: string; region_code?: string; locality?: string; leaderboard_opt_in?: boolean };
type Leader = { rank: number; public_alias: string; category: string; rating: number; graded_picks: number; wins: number; losses: number; country_code?: string; region_code?: string; locality?: string };
const categories = [["player_prop", "Player Props"], ["moneyline", "Moneylines"], ["spread", "Spreads"], ["total", "Totals"], ["parlay", "Parlays"]];

export function CertifiedLeaderboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [category, setCategory] = useState("player_prop");
  const [scope, setScope] = useState<"global" | "country" | "region" | "local">("global");
  const [status, setStatus] = useState("");
  useEffect(() => { fetch("/api/competitive-profile").then((response) => response.json()).then((result) => setProfile(result.profile ?? {})).catch(() => setProfile({})); }, []);
  useEffect(() => {
    const query = new URLSearchParams({ category });
    if (scope !== "global" && profile?.country_code) query.set("country", profile.country_code);
    if (["region", "local"].includes(scope) && profile?.region_code) query.set("region", profile.region_code);
    if (scope === "local" && profile?.locality) query.set("locality", profile.locality);
    fetch(`/api/leaderboard?${query}`).then((response) => response.json()).then((result) => setLeaders(result.leaders ?? [])).catch(() => setLeaders([]));
  }, [category, profile, scope]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/competitive-profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicAlias: data.publicAlias, countryCode: data.countryCode, regionCode: data.regionCode, locality: data.locality, leaderboardOptIn: data.leaderboardOptIn === "on" }) });
    const result = await response.json();
    if (!response.ok) return setStatus(result.error);
    setProfile(result.profile); setStatus("Competitive profile saved.");
  }
  if (profile === null) return <Card className="premium-empty"><Trophy /><strong>Loading competitive rankings…</strong></Card>;
  return <div className="certified-rankings"><Card className="ranking-profile"><header><span><MapPin /> YOUR COMPETITIVE REGION</span><Badge tone={profile.leaderboard_opt_in ? "success" : "warning"}>{profile.leaderboard_opt_in ? "VISIBLE" : "PRIVATE"}</Badge></header><form onSubmit={save}><label>Public ranking name<input name="publicAlias" defaultValue={profile.public_alias ?? ""} maxLength={30} placeholder="Your analyst name" /></label><div><label>Country code<input name="countryCode" defaultValue={profile.country_code ?? ""} maxLength={2} placeholder="US" /></label><label>State / region<input name="regionCode" defaultValue={profile.region_code ?? ""} maxLength={12} placeholder="CA" /></label></div><label>City or metro <small>Optional—never enter an address</small><input name="locality" defaultValue={profile.locality ?? ""} maxLength={60} placeholder="Los Angeles" /></label><label className="ranking-optin"><input name="leaderboardOptIn" type="checkbox" defaultChecked={profile.leaderboard_opt_in} /><span><ShieldCheck /> Show my alias after I reach 25 automatically settled picks in a category.</span></label><Button><Check /> Save ranking profile</Button></form>{status ? <p>{status}</p> : null}</Card><section className="ranking-board"><header><div className="filter-tabs">{categories.map(([value, label]) => <button className={category === value ? "active" : ""} onClick={() => setCategory(value)} key={value}>{label}</button>)}</div><div className="filter-tabs">{(["global", "country", "region", "local"] as const).map((value) => <button className={scope === value ? "active" : ""} disabled={value !== "global" && !profile.country_code} onClick={() => setScope(value)} key={value}>{value}</button>)}</div></header><Card className="certified-table"><header><span>Rank</span><span>Analyst</span><span>Rating</span><span>STRATIQA record</span></header>{leaders.length ? leaders.map((leader) => <article key={`${leader.category}-${leader.rank}-${leader.public_alias}`}><b>#{leader.rank}</b><span><strong>{leader.public_alias}</strong><small>{[leader.locality, leader.region_code, leader.country_code].filter(Boolean).join(", ")}</small></span><strong>{Math.round(leader.rating)}</strong><span>{leader.wins}-{leader.losses}<small>{leader.graded_picks} rated</small></span></article>) : <div className="ranking-empty"><Trophy /><strong>The top 10 is open</strong><p>Be among the first analysts to complete 25 automatically settled {categories.find(([value]) => value === category)?.[1].toLowerCase()} picks in this region.</p></div>}</Card></section></div>;
}
