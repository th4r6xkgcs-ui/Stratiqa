"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPin, ShieldCheck, Swords, Target, Trash2, Trophy, Users } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import { groupRivals, nextRivalTarget } from "@/lib/ratings/rivals.js";

type RivalRow = {
  public_alias: string; public_slug: string; country_code?: string; region_code?: string; locality?: string;
  category: string; rival_rating: number; rival_graded_picks: number; user_rating: number; rating_gap: number; added_at: string;
};
const labels: Record<string, string> = { player_prop: "Player Props", moneyline: "Moneylines", spread: "Spreads", total: "Totals", parlay: "Parlays" };

export function RivalNetwork() {
  const [rows, setRows] = useState<RivalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const load = useCallback(() => fetch("/api/rivals", { cache: "no-store" }).then((response) => response.ok ? response.json() : { rivals: [] }).then((data) => setRows(data.rivals ?? [])).finally(() => setLoading(false)), []);
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, [load]);
  const rivals = useMemo(() => groupRivals(rows) as Array<{ alias: string; slug: string; location: string; categories: RivalRow[] }>, [rows]);
  const target = useMemo(() => nextRivalTarget(rows) as RivalRow | null, [rows]);
  const advantages = rows.filter((row) => row.rating_gap < 0).length;

  async function remove(slug: string) {
    setWorking(slug);
    await fetch(`/api/rivals?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
    await load();
    setWorking("");
  }

  return <div className="product-page rival-page">
    <header className="product-hero"><div><Badge tone="accent"><Swords /> RIVAL NETWORK</Badge><h1>Know who you&apos;re chasing.</h1><p>Build a private watchlist of public analysts. Compare verified category ratings and focus on the next realistic gap—without messages, wagers, or manufactured challenges.</p></div></header>
    <section className="rival-summary">
      <Card><Users /><span><small>RIVALS TRACKED</small><strong>{rivals.length}</strong><p>Private to your account</p></span></Card>
      <Card><Target /><span><small>NEXT TARGET</small><strong>{target ? target.public_alias : "Open"}</strong><p>{target ? `${Math.ceil(target.rating_gap)} points away in ${labels[target.category] ?? target.category}` : "Add a ranked analyst"}</p></span></Card>
      <Card><Trophy /><span><small>CATEGORY ADVANTAGES</small><strong>{advantages}</strong><p>Ratings where you currently lead</p></span></Card>
    </section>

    {loading ? <section className="rival-loading">{[1, 2, 3].map((item) => <i key={item} />)}</section> :
      rivals.length ? <section className="rival-grid">{rivals.map((rival) => {
        const closest = [...rival.categories].sort((a, b) => Math.abs(a.rating_gap) - Math.abs(b.rating_gap))[0];
        return <Card className="rival-card" key={rival.slug}>
          <header><div className="rival-avatar">{rival.alias.slice(0, 1).toUpperCase()}</div><span><strong>{rival.alias}</strong><small><MapPin /> {rival.location}</small></span><button type="button" disabled={working === rival.slug} onClick={() => remove(rival.slug)} aria-label={`Remove ${rival.alias} from rivals`}><Trash2 /></button></header>
          <div className="rival-gap"><span><small>CLOSEST BATTLE</small><strong>{labels[closest.category] ?? closest.category}</strong></span><b className={closest.rating_gap > 0 ? "behind" : "ahead"}>{closest.rating_gap > 0 ? `${Math.ceil(closest.rating_gap)} behind` : `${Math.abs(Math.floor(closest.rating_gap))} ahead`}</b></div>
          <div className="rival-category-list">{rival.categories.slice(0, 5).map((item) => <span key={item.category}><small>{labels[item.category] ?? item.category}</small><strong>{Math.round(item.user_rating)}</strong><i /><strong>{Math.round(item.rival_rating)}</strong></span>)}</div>
          <footer><span><ShieldCheck /> Verified ratings only</span><Link href={`/analysts/${rival.slug}`}>Open profile <ArrowRight /></Link></footer>
        </Card>;
      })}</section> :
      <Card className="rival-empty"><Swords /><h2>Your rival board is open</h2><p>Open a ranked analyst profile from the leaderboard and add them as a rival. They will never be notified, and no private information is exposed.</p><Link href="/leaderboard">Explore rankings <ArrowRight /></Link></Card>}
  </div>;
}
