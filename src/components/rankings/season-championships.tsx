"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Crown, MapPin, ShieldCheck, Trophy } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";

type Race = { scope: "global" | "regional"; scope_label: string; category: string; rank: number; public_alias: string; public_slug: string; rating: number; graded_picks: number; wins: number; losses: number; roi_percent: number | null; is_current_user: boolean };
type Archive = { season_key: string; scope: string; scope_label: string; category: string; champion_alias: string; rating: number; graded_picks: number; wins: number; losses: number; roi_percent: number | null; finalized_at: string };
const labels: Record<string, string> = { player_prop: "Player Props", moneyline: "Moneylines", spread: "Spreads", total: "Totals", parlay: "Parlays" };

export function SeasonChampionships() {
  const [races, setRaces] = useState<Race[]>([]);
  const [archive, setArchive] = useState<Archive[]>([]);
  const [season, setSeason] = useState<{ key: string; startsAt: string; endsAt: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"global" | "regional">("global");
  useEffect(() => { fetch("/api/championships", { cache: "no-store" }).then((response) => response.ok ? response.json() : { races: [], archive: [] }).then((result) => { setRaces(result.races ?? []); setArchive(result.archive ?? []); setSeason(result.season ?? null); }).catch(() => undefined).finally(() => setLoading(false)); }, []);
  const divisions = useMemo(() => races.filter((race) => race.scope === scope), [races, scope]);
  const grouped = useMemo(() => Array.from(new Set(divisions.map((race) => race.category))).map((category) => ({ category, entries: divisions.filter((race) => race.category === category) })), [divisions]);
  const hasRegional = races.some((race) => race.scope === "regional");
  if (!loading && !races.length && !archive.length) return null;
  return <section className="season-championships">
    <header><div><span className="landing-kicker">SEASON CHAMPIONSHIPS</span><h2>Every quarter has a crown</h2><p>Seasonal standings reward current form. Your permanent rating and all prior titles stay intact.</p></div><Badge tone="accent"><CalendarDays /> {season?.key ?? "CURRENT SEASON"}</Badge></header>
    <div className="championship-switch"><button className={scope === "global" ? "active" : ""} onClick={() => setScope("global")}>Global titles</button>{hasRegional ? <button className={scope === "regional" ? "active" : ""} onClick={() => setScope("regional")}><MapPin /> Your region</button> : null}</div>
    <div className="championship-grid">{loading ? [1, 2, 3].map((item) => <Card className="championship-loading" key={item}><i /><i /><i /></Card>) : grouped.map(({ category, entries }) => <Card className="championship-card" key={category}><header><span><Trophy /> {labels[category] ?? category}</span><Badge tone="accent">TOP 3</Badge></header>{entries.map((entry) => <article className={entry.is_current_user ? "current" : ""} key={`${category}-${entry.rank}`}><b>{entry.rank === 1 ? <Crown /> : `#${entry.rank}`}</b><span><strong>{entry.public_slug ? <Link href={`/analysts/${entry.public_slug}`}>{entry.public_alias}</Link> : entry.public_alias}</strong><small>{entry.wins}-{entry.losses} · {entry.graded_picks} verified results</small></span><em>{Math.round(entry.rating)}<small>{entry.roi_percent === null ? "Rating" : `${Number(entry.roi_percent).toFixed(1)}% ROI`}</small></em></article>)}<footer><ShieldCheck /> 10 automatic results qualify an analyst for this season&apos;s race.</footer></Card>)}</div>
    {archive.length ? <Card className="championship-archive"><header><span><Crown /> Permanent championship archive</span><Badge tone="success">FINALIZED</Badge></header><div>{archive.slice(0, 6).map((title) => <article key={`${title.season_key}-${title.scope}-${title.category}`}><span><strong>{title.season_key} · {labels[title.category] ?? title.category}</strong><small>{title.scope_label} champion</small></span><b>{title.champion_alias}</b><em>{Math.round(title.rating)}</em></article>)}</div></Card> : <aside><Crown /> The first permanent titles are awarded when this quarter closes. Current leaders are live; no title is automatic until the season is finalized.</aside>}
  </section>;
}
