"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge, Card } from "@/components/ui/primitives";
import type { ProviderHealth } from "@/services/types";

type HealthResponse = { status: "healthy" | "degraded"; environment: { mode: "mock" | "live"; fallbackReason: string | null }; providers: ProviderHealth[] };

export function ProviderHealthPanel() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Health request failed")))
      .then(setHealth)
      .catch((error) => { if (error.name !== "AbortError") console.error(error); });
    return () => controller.abort();
  }, []);
  const healthyCount = health?.providers.filter((provider) => provider.status === "healthy").length ?? 0;
  return (
    <Card className="provider-health glass-card">
      <header><span><Activity size={17} /> Provider health</span><Badge tone={health?.status === "degraded" ? "warning" : "success"}>{health?.status ?? "checking"}</Badge></header>
      <div className="provider-health-summary">
        {health?.status === "degraded" ? <AlertTriangle /> : <CheckCircle2 />}
        <span><strong>{health ? `${healthyCount}/${health.providers.length} services healthy` : "Checking live services"}</strong><small>{health?.environment.mode ?? "mock"} mode · automatic stale fallback enabled</small></span>
      </div>
      {health?.environment.fallbackReason ? <p>{health.environment.fallbackReason}</p> : null}
    </Card>
  );
}
