import "server-only";
import { retryDelayMinutes, settlementIssueFingerprint } from "@/lib/settlement/operations.js";

export type SettlementFailure = { scope: string; reason: string };
export type SettlementMetrics = {
  checkedGames: number; checkedProps: number; settledGames: number; settledProps: number;
  deferredGames: number; deferredProps: number; failures: SettlementFailure[];
};

const config = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
};
const headers = (key: string, extra: Record<string, string> = {}) => ({
  apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...extra,
});

async function request(path: string, init: RequestInit = {}) {
  const settings = config();
  if (!settings) return null;
  const response = await fetch(`${settings.url}${path}`, {
    ...init, headers: { ...headers(settings.key), ...(init.headers ?? {}) },
    cache: "no-store", signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Settlement operations storage responded with ${response.status}`);
  if (response.status === 204) return null;
  return response.json();
}

export const settlementOperations = {
  configured: () => Boolean(config()),
  async acquire(runId: string) {
    const result = await request("/rest/v1/rpc/acquire_settlement_job", {
      method: "POST", body: JSON.stringify({ requested_run_id: runId }),
    });
    return result === null ? true : result === true;
  },
  async start(runId: string, source: "cron" | "manual") {
    await request("/rest/v1/settlement_runs", {
      method: "POST", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ id: runId, status: "running", trigger_source: source }),
    });
  },
  async finish(runId: string, status: string, metrics: SettlementMetrics) {
    await request(`/rest/v1/settlement_runs?id=eq.${encodeURIComponent(runId)}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status, finished_at: new Date().toISOString(),
        checked_games: metrics.checkedGames, checked_props: metrics.checkedProps,
        settled_games: metrics.settledGames, settled_props: metrics.settledProps,
        deferred_games: metrics.deferredGames, deferred_props: metrics.deferredProps,
        failures: metrics.failures,
      }),
    });
    const openIssues = await request("/rest/v1/settlement_issues?status=eq.open&select=id,fingerprint,attempts") as Array<{ id: number; fingerprint: string; attempts: number }> | null;
    const activeFingerprints = new Set(metrics.failures.map((failure) => settlementIssueFingerprint(failure.scope, failure.reason)));
    for (const failure of metrics.failures) {
      const fingerprint = settlementIssueFingerprint(failure.scope, failure.reason);
      const existing = openIssues?.find((issue) => issue.fingerprint === fingerprint);
      if (existing) {
        const attempts = existing.attempts + 1;
        await request(`/rest/v1/settlement_issues?id=eq.${existing.id}`, {
          method: "PATCH", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ run_id: runId, attempts, last_seen_at: new Date().toISOString(), next_retry_at: new Date(Date.now() + retryDelayMinutes(attempts) * 60_000).toISOString() }),
        });
      } else {
        await request("/rest/v1/settlement_issues", {
          method: "POST", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ run_id: runId, fingerprint, scope: failure.scope, reason: failure.reason, next_retry_at: new Date(Date.now() + retryDelayMinutes(1) * 60_000).toISOString() }),
        });
      }
    }
    for (const issue of openIssues ?? []) {
      if (!activeFingerprints.has(issue.fingerprint)) {
        await request(`/rest/v1/settlement_issues?id=eq.${issue.id}`, {
          method: "PATCH", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ status: "resolved", resolved_at: new Date().toISOString() }),
        });
      }
    }
  },
  async release(runId: string) {
    await request("/rest/v1/rpc/release_settlement_job", {
      method: "POST", body: JSON.stringify({ requested_run_id: runId }),
    });
  },
};
