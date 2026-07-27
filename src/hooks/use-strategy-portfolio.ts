"use client";

import { useEffect, useRef, useState } from "react";
import { usePersistentState } from "./use-persistent-state";
import {
  activeStrategyStorageKey,
  defaultStrategyBuilds,
  strategyStorageKey,
  trackedPicksStorageKey,
  type StrategyBuild,
  type StrategyPortfolio,
  type TrackedPick,
} from "@/lib/strategies/builds";

export function useStrategyPortfolio() {
  const [builds, setBuilds] = usePersistentState<StrategyBuild[]>(strategyStorageKey, defaultStrategyBuilds);
  const [activeBuildId, setActiveBuildId] = usePersistentState(activeStrategyStorageKey, defaultStrategyBuilds[0].id);
  const [trackedPicks, setTrackedPicks] = usePersistentState<TrackedPick[]>(trackedPicksStorageKey, []);
  const [syncState, setSyncState] = useState<"checking" | "local" | "synced" | "saving">("checking");
  const hydrated = useRef(false);
  const syncEnabled = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/strategy-portfolio")
      .then(async (response) => {
        if (response.status === 401) return null;
        if (!response.ok) throw new Error("Portfolio sync failed.");
        return (await response.json()).portfolio as StrategyPortfolio;
      })
      .then((remote) => {
        if (cancelled) return;
        if (remote) {
          syncEnabled.current = true;
          const mergedBuilds = [...builds, ...remote.builds.filter((candidate) => !builds.some((build) => build.id === candidate.id))];
          const mergedPicks = [...trackedPicks, ...remote.trackedPicks.filter((candidate) => !trackedPicks.some((pick) => pick.id === candidate.id))];
          setBuilds(mergedBuilds);
          setTrackedPicks(mergedPicks);
          if (mergedBuilds.some((build) => build.id === remote.activeBuildId)) setActiveBuildId(remote.activeBuildId);
          setSyncState("synced");
        } else {
          setSyncState("local");
        }
        hydrated.current = true;
      })
      .catch(() => {
        if (!cancelled) {
          hydrated.current = true;
          setSyncState("local");
        }
      });
    return () => { cancelled = true; };
    // Hydrate once; subsequent updates are handled by the save effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current || !syncEnabled.current) return;
    setSyncState("saving");
    const timer = window.setTimeout(() => {
      fetch("/api/strategy-portfolio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ builds, activeBuildId, trackedPicks }),
      }).then((response) => setSyncState(response.ok ? "synced" : "local")).catch(() => setSyncState("local"));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [activeBuildId, builds, trackedPicks]);

  return { builds, setBuilds, activeBuildId, setActiveBuildId, trackedPicks, setTrackedPicks, syncState };
}
