import "server-only";
import { normalizeDashboardLayout, type DashboardLayout } from "@/lib/dashboard/layout";

const developmentStore = new Map<string, DashboardLayout>();

class DashboardLayoutRepository {
  private readonly url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  private readonly key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  private headers(extra?: Record<string, string>) {
    return { apikey: this.key!, Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", ...extra };
  }
  async get(userId: string) {
    if (!this.url || !this.key) return developmentStore.get(userId) ?? null;
    const response = await fetch(`${this.url}/rest/v1/dashboard_layouts?user_id=eq.${encodeURIComponent(userId)}&select=layout&limit=1`, { headers: this.headers(), cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`Dashboard layout storage responded with ${response.status}`);
    const [row] = await response.json() as Array<{ layout: unknown }>;
    return row ? normalizeDashboardLayout(row.layout) : null;
  }
  async save(userId: string, layout: DashboardLayout) {
    const normalized = normalizeDashboardLayout(layout);
    if (!this.url || !this.key) {
      developmentStore.set(userId, normalized);
      return normalized;
    }
    const response = await fetch(`${this.url}/rest/v1/dashboard_layouts?on_conflict=user_id`, {
      method: "POST",
      headers: this.headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({ user_id: userId, layout: normalized, updated_at: new Date().toISOString() }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Dashboard layout storage responded with ${response.status}`);
    return normalized;
  }
}

export const dashboardLayoutRepository = new DashboardLayoutRepository();
