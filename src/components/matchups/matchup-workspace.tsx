"use client";

import Link from "next/link";
import { ArrowRight, Bookmark, Check, Clock3, Plus, Search, SlidersHorizontal, Sparkles, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useStrategyPortfolio } from "@/hooks/use-strategy-portfolio";
import type { MatchupCatalogEntry } from "@/lib/matchups/catalog";
import { ConfidenceRing } from "@/components/ui/confidence-ring";
import { Badge, Card, Metric } from "@/components/ui/primitives";
import { defaultStrategyBuilds, normalizeWeights } from "@/lib/strategies/builds";

const filters = ["All games", "Elite edges", "Plus money", "Saved"] as const;
type Filter = (typeof filters)[number];

function labelFor(matchup: MatchupCatalogEntry, rank: number) {
  if (rank === 0) return "Best play";
  if (matchup.confidence >= 85) return "Elite value";
  if (matchup.modelEdge >= 8) return "Strong edge";
  if (matchup.price > 0) return "Value pick";
  return "Model lean";
}

export function MatchupWorkspace({ matchups }: { matchups: MatchupCatalogEntry[] }) {
  const [filter, setFilter] = useState<Filter>("All games");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = usePersistentState<string[]>("stratiqa-saved-matchups", []);
  const { builds, activeBuildId: activeId, setActiveBuildId: setActiveId, trackedPicks, setTrackedPicks, syncState } = useStrategyPortfolio();
  const activeBuild = builds.find((build) => build.id === activeId) ?? builds[0] ?? defaultStrategyBuilds[0];
  const ranked = useMemo(() => {
    const weights = normalizeWeights(activeBuild.weights);
    return matchups
      .filter((matchup) => matchup.confidence >= activeBuild.minimumConfidence)
      .map((matchup) => ({
        ...matchup,
        buildScore: Math.round(
          matchup.confidence * weights.confidence
          + Math.min(100, matchup.expectedValue * 5) * weights.value
          + matchup.marketSignal * weights.market,
        ),
      }))
      .sort((a, b) => b.buildScore - a.buildScore);
  }, [activeBuild, matchups]);
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return ranked.filter((matchup) => {
      const matchesSearch = !normalized || `${matchup.away} ${matchup.home} ${matchup.pick}`.toLowerCase().includes(normalized);
      const matchesFilter = filter === "All games"
        || (filter === "Elite edges" && matchup.confidence >= 85)
        || (filter === "Plus money" && matchup.price > 0)
        || (filter === "Saved" && saved.includes(matchup.id));
      return matchesSearch && matchesFilter;
    });
  }, [filter, query, ranked, saved]);

  const toggleSaved = (id: string) => {
    setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const trackPick = (game: (typeof ranked)[number]) => {
    if (trackedPicks.some((pick) => pick.matchupId === game.id && pick.buildId === activeBuild.id)) return;
    setTrackedPicks((current) => [...current, {
      id: `${game.id}-${activeBuild.id}-${Date.now()}`,
      matchupId: game.id,
      selection: game.pick,
      price: game.price,
      units: 1,
      buildId: activeBuild.id,
      buildName: activeBuild.name,
      buildScore: game.buildScore,
      trackedAt: new Date().toISOString(),
      outcome: "pending",
    }]);
  };

  return (
    <>
      <section className="matchup-toolbar" aria-label="Matchup filters">
        <label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search teams or picks" aria-label="Search matchups" /></label>
        <div className="filter-tabs" role="tablist" aria-label="Confidence filters">
          {filters.map((item) => <button role="tab" aria-selected={filter === item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)} key={item}>{item}</button>)}
        </div>
        <span><SlidersHorizontal size={14} /> {visible.length} of {matchups.length}</span>
      </section>
      <section className="active-build-banner">
        <span><Sparkles size={15} /><small>RANKED BY YOUR BUILD · {syncState === "synced" ? "CLOUD SYNCED" : "LOCAL"}</small><strong>{activeBuild.name}</strong></span>
        <label>Strategy<select value={activeBuild.id} onChange={(event) => setActiveId(event.target.value)}>{builds.map((build) => <option value={build.id} key={build.id}>{build.name}</option>)}</select></label>
        <Link href="/lab">Tune build <ArrowRight size={14} /></Link>
      </section>

      {visible.length ? <section className="matchup-grid" aria-live="polite">
        {visible.map((game) => {
          const rank = ranked.findIndex((matchup) => matchup.id === game.id);
          const isSaved = saved.includes(game.id);
          const isTracked = trackedPicks.some((pick) => pick.matchupId === game.id && pick.buildId === activeBuild.id);
          return (
            <Card className={rank === 0 ? "matchup-card featured" : "matchup-card"} key={game.id}>
              <header>
                <div><span className="rank">#{rank + 1}</span><Badge tone={rank < 3 ? "success" : "neutral"}>{labelFor(game, rank)}</Badge><Badge tone="accent">{game.buildScore} BUILD FIT</Badge></div>
                <div className="matchup-card-actions"><time><Clock3 size={13} /> {game.startTime}</time><button className={isSaved ? "saved" : ""} onClick={() => toggleSaved(game.id)} aria-label={`${isSaved ? "Remove" : "Save"} ${game.away} versus ${game.home}`}>{isSaved ? <Check size={14} /> : <Bookmark size={14} />}</button></div>
              </header>
              <div className="matchup-teams">
                <div><span className={`team-logo logo-${game.awayAbbr.toLowerCase()}`}>{game.awayAbbr}</span><strong>{game.away}</strong><small>{game.awayRecord}</small></div>
                <div className="versus"><span>VS</span><small>{game.winProbability}% win</small></div>
                <div><span className={`team-logo logo-${game.homeAbbr.toLowerCase()}`}>{game.homeAbbr}</span><strong>{game.home}</strong><small>{game.homeRecord}</small></div>
              </div>
              <div className="pick-row"><Target size={18} /><div><span>STRATIQA PICK</span><strong>{game.pick}</strong></div><b>{game.price > 0 ? "+" : ""}{game.price}</b></div>
              <footer>
                <Metric label="Win probability" value={`${game.winProbability}%`} />
                <Metric label="Model edge" value={`+${game.modelEdge}%`} positive />
                <Metric label="Expected value" value={`+${game.expectedValue}%`} positive />
                <ConfidenceRing value={game.confidence} size="sm" />
              </footer>
              <div className="matchup-card-commands">
                <button className={isTracked ? "tracked" : ""} onClick={() => trackPick(game)} disabled={isTracked}>{isTracked ? <Check size={14} /> : <Plus size={14} />}{isTracked ? "Tracked" : "Track pick"}</button>
                <Link href={`/matchups/${game.id}`}>Open report <ArrowRight size={16} /></Link>
              </div>
            </Card>
          );
        })}
      </section> : <Card className="premium-empty"><Search size={25} /><strong>No matchups match this view</strong><p>Try another team, pick, or confidence filter.</p><button onClick={() => { setFilter("All games"); setQuery(""); }}>Clear filters</button></Card>}
    </>
  );
}
