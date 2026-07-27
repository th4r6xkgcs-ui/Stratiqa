import "server-only";
import { defaultStrategyPortfolio, type StrategyPortfolio } from "@/lib/strategies/builds";

export interface StrategyPortfolioRepository {
  get(userId: string): Promise<StrategyPortfolio>;
  save(userId: string, portfolio: StrategyPortfolio): Promise<StrategyPortfolio>;
}

const developmentStore = new Map<string, StrategyPortfolio>();

class DevelopmentStrategyPortfolioRepository implements StrategyPortfolioRepository {
  async get(userId: string) { return developmentStore.get(userId) ?? defaultStrategyPortfolio; }
  async save(userId: string, portfolio: StrategyPortfolio) { developmentStore.set(userId, portfolio); return portfolio; }
}

class SupabaseStrategyPortfolioRepository implements StrategyPortfolioRepository {
  constructor(private readonly url: string, private readonly key: string) {}
  private headers(extra?: Record<string, string>) {
    return { apikey: this.key, Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", ...extra };
  }
  async get(userId: string) {
    const response = await fetch(`${this.url}/rest/v1/strategy_portfolios?user_id=eq.${encodeURIComponent(userId)}&select=builds,active_build_id,tracked_picks&limit=1`, {
      headers: this.headers(), cache: "no-store", signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Strategy storage responded with ${response.status}`);
    const [row] = await response.json() as Array<{ builds: StrategyPortfolio["builds"]; active_build_id: string; tracked_picks: StrategyPortfolio["trackedPicks"] }>;
    return row ? { builds: row.builds, activeBuildId: row.active_build_id, trackedPicks: row.tracked_picks } : defaultStrategyPortfolio;
  }
  async save(userId: string, portfolio: StrategyPortfolio) {
    const response = await fetch(`${this.url}/rest/v1/strategy_portfolios?on_conflict=user_id`, {
      method: "POST",
      headers: this.headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({ user_id: userId, builds: portfolio.builds, active_build_id: portfolio.activeBuildId, tracked_picks: portfolio.trackedPicks, updated_at: new Date().toISOString() }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Strategy storage responded with ${response.status}`);
    return portfolio;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const strategyPortfolioRepository: StrategyPortfolioRepository = supabaseUrl && serviceKey
  ? new SupabaseStrategyPortfolioRepository(supabaseUrl, serviceKey)
  : new DevelopmentStrategyPortfolioRepository();
