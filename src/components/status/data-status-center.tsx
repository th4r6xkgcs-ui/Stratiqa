"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Check, Clock3, Database, RefreshCw, ShieldCheck, TriangleAlert, WifiOff } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";

type Provider = {
  name: string; status: "healthy" | "degraded" | "unavailable"; mode: "mock" | "live";
  latencyMs: number; lastSuccessAt: string | null; consecutiveFailures: number; stale: boolean;
  cacheHits: number; upstreamRequests: number; quotaRemaining: number | null;
  circuitOpenUntil: string | null; dataAgeSeconds: number | null; lastError: string | null;
};
type Health = {
  status: "healthy" | "degraded";
  environment: { requestedMode: string; mode: "mock" | "live"; fallbackReason: string | null };
  providers: Provider[];
  policy: { oddsCacheSeconds: number; propsCacheSeconds: number; staleFallbackMinutes: number; paidProviderRequired: boolean };
  settlement: { playerStatLeagues: string[]; correctionWindowHours: number };
};
type SettlementOperations = {
  available: boolean; canRetry: boolean; lastSuccessfulAt: string | null;
  lastRun: null | { id: string; status: string; triggerSource: string; startedAt: string; finishedAt: string | null; checked: number; settled: number; deferred: number };
  openIssues: Array<{ scope: string; reason: string; attempts: number; lastSeenAt: string; nextRetryAt: string | null }>;
};

const names: Record<string, string> = { odds: "Game odds", props: "Player props", weather: "Weather", injuries: "Injuries", standings: "Standings", stats: "Team statistics", lineMovement: "Line movement" };

function displayState(provider: Provider) {
  if (provider.status === "unavailable") return { label: "UNAVAILABLE", tone: "warning" as const, icon: WifiOff };
  if (provider.stale || provider.status === "degraded") return { label: "DELAYED", tone: "warning" as const, icon: Clock3 };
  if (provider.mode === "mock") return { label: "SIMULATION", tone: "neutral" as const, icon: Database };
  return { label: "LIVE", tone: "success" as const, icon: Check };
}

export function DataStatusCenter() {
  const [health, setHealth] = useState<Health | null>(null);
  const [operations, setOperations] = useState<SettlementOperations | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState("");
  const load = useCallback(() => {
    Promise.all([fetch("/api/health", { cache: "no-store" }), fetch("/api/settlement-status", { cache: "no-store" })])
      .then(async ([healthResponse, operationsResponse]) => {
        const result = await healthResponse.json();
        if (!healthResponse.ok) throw new Error(result.error ?? "Status unavailable.");
        setHealth(result);
        if (operationsResponse.ok) setOperations(await operationsResponse.json());
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Status unavailable."))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  function refresh() { setLoading(true); setError(""); load(); }
  async function retrySettlement() {
    setRetrying(true); setRetryMessage("");
    try {
      const response = await fetch("/api/jobs/settle-picks", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Retry could not start.");
      setRetryMessage(`Run complete: ${result.settledGames + result.settledProps} picks settled, ${result.deferredGames + result.deferredProps} still waiting.`);
      load();
    } catch (reason) {
      setRetryMessage(reason instanceof Error ? reason.message : "Retry could not start.");
    } finally { setRetrying(false); }
  }

  return <div className="product-page status-page">
    <header className="product-hero">
      <div><Badge tone="accent"><Activity /> DATA STATUS</Badge><h1>Know exactly what powers each insight</h1><p>STRATIQA clearly labels live, delayed, simulated, and unavailable data—without requiring a paid provider.</p></div>
      <Button variant="secondary" onClick={refresh} disabled={loading}><RefreshCw /> {loading ? "Checking…" : "Refresh status"}</Button>
    </header>

    {health ? <>
      <section className="status-summary">
        <Card><ShieldCheck /><span><small>PLATFORM STATE</small><strong>{health.status === "healthy" ? "Operational" : "Partially degraded"}</strong><p>Unavailable sources never silently appear as live.</p></span></Card>
        <Card><Database /><span><small>ACTIVE MODE</small><strong>{health.environment.mode === "live" ? "Live + fallback" : "Simulation"}</strong><p>{health.environment.fallbackReason ?? "Provider mode matches current configuration."}</p></span></Card>
        <Card><Clock3 /><span><small>CORRECTION WINDOW</small><strong>{health.settlement.correctionWindowHours} hours</strong><p>Official stat revisions can automatically correct results.</p></span></Card>
      </section>

      <Card className="provider-status-board">
        <header><span><Activity /> Provider health</span><Badge tone={health.status === "healthy" ? "success" : "warning"}>{health.status.toUpperCase()}</Badge></header>
        <div className="provider-status-head"><span>Source</span><span>State</span><span>Freshness</span><span>Requests</span></div>
        {health.providers.map((provider) => {
          const state = displayState(provider); const Icon = state.icon;
          return <article key={provider.name}>
            <span><Icon /><strong>{names[provider.name] ?? provider.name}</strong><small>{provider.mode === "live" ? "External provider" : "STRATIQA simulation adapter"}</small></span>
            <Badge tone={state.tone}>{state.label}</Badge>
            <span><strong>{provider.dataAgeSeconds === null ? "Waiting" : provider.dataAgeSeconds < 60 ? `${provider.dataAgeSeconds}s old` : `${Math.round(provider.dataAgeSeconds / 60)}m old`}</strong><small>{provider.latencyMs ? `${provider.latencyMs}ms last response` : "Not measured yet"}</small></span>
            <span><strong>{provider.upstreamRequests} upstream</strong><small>{provider.cacheHits} cache hits{provider.quotaRemaining === null ? "" : ` · ${provider.quotaRemaining} budget left`}</small></span>
            {provider.lastError ? <p><TriangleAlert /> {provider.lastError}</p> : null}
          </article>;
        })}
      </Card>

      <Card className="settlement-operations">
        <header><span><ShieldCheck /> Automatic settlement</span><Badge tone={!operations?.available ? "neutral" : operations.openIssues.length ? "warning" : "success"}>{!operations?.available ? "SETUP REQUIRED" : operations.openIssues.length ? "ATTENTION" : "OPERATIONAL"}</Badge></header>
        {operations?.available ? <>
          <div className="settlement-run-summary">
            <span><small>LAST RUN</small><strong>{operations.lastRun?.status?.toUpperCase() ?? "WAITING"}</strong><p>{operations.lastRun ? `${operations.lastRun.checked} checked · ${operations.lastRun.settled} settled · ${operations.lastRun.deferred} waiting` : "The first scheduled run has not happened yet."}</p></span>
            <span><small>LAST SUCCESS</small><strong>{operations.lastSuccessfulAt ? new Date(operations.lastSuccessfulAt).toLocaleString() : "Not yet"}</strong><p>Scheduled daily on the free Vercel cron allowance.</p></span>
            <span><small>OPEN ISSUES</small><strong>{operations.openIssues.length}</strong><p>{operations.openIssues.length ? "Temporary failures retry on the next run." : "No unresolved provider failures."}</p></span>
          </div>
          {operations.openIssues.length ? <div className="settlement-issue-list">{operations.openIssues.map((issue) => <article key={`${issue.scope}-${issue.reason}`}><TriangleAlert /><span><strong>{issue.scope.replace(":", " · ")}</strong><small>{issue.reason}</small></span><em>{issue.nextRetryAt ? `Retry after ${new Date(issue.nextRetryAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Next scheduled run"}</em></article>)}</div> : null}
          {operations.canRetry ? <footer><Button variant="secondary" onClick={retrySettlement} disabled={retrying}><RefreshCw /> {retrying ? "Running…" : "Run settlement now"}</Button><small>Admin-only. Uses the same safe provider limits as the scheduled job.</small></footer> : null}
          {retryMessage ? <p className="settlement-retry-message">{retryMessage}</p> : null}
        </> : <div className="settlement-setup"><Database /><span><strong>Operations history is ready for its database migration</strong><p>Core settlement still works. Apply migration 202607260021 to unlock durable run history, retry visibility, and concurrency protection.</p></span></div>}
      </Card>

      <section className="status-explainers">
        <Card><Badge tone="success">LIVE</Badge><strong>Current external data</strong><p>Fresh information returned by a configured provider.</p></Card>
        <Card><Badge tone="warning">DELAYED</Badge><strong>Safe cached fallback</strong><p>The live source had a problem, so STRATIQA preserved the most recent valid response and labels it clearly.</p></Card>
        <Card><Badge>SIMULATION</Badge><strong>Product demonstration data</strong><p>Useful for exploring features, but never presented as a verifiable live sportsbook market.</p></Card>
        <Card><Badge tone="warning">UNAVAILABLE</Badge><strong>No trusted answer</strong><p>STRATIQA withholds the result instead of inventing or silently substituting live data.</p></Card>
      </section>

      <Card className="quota-policy"><header><ShieldCheck /> Free-first reliability policy</header><div><span><strong>{health.policy.oddsCacheSeconds}s</strong><small>Game-odds cache</small></span><span><strong>{health.policy.propsCacheSeconds}s</strong><small>Props cache</small></span><span><strong>{health.policy.staleFallbackMinutes}m</strong><small>Maximum stale fallback</small></span><span><strong>$0 required</strong><small>Paid provider dependency</small></span></div></Card>
    </> : null}
    {error ? <Card className="premium-empty"><WifiOff /><strong>{error}</strong><p>Core pages remain available while status is unavailable.</p></Card> : null}
  </div>;
}
