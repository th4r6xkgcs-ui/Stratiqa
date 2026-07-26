import "server-only";

export type RiskProfile = "conservative" | "balanced" | "aggressive";
export type UserPreferences = { riskProfile: RiskProfile; leagues: string[]; sportsbooks: string[]; maxUnitSize: number };
export interface PreferencesRepository {
  get(userId: string): Promise<UserPreferences>;
  save(userId: string, preferences: UserPreferences): Promise<UserPreferences>;
}

const defaults: UserPreferences = { riskProfile: "balanced", leagues: ["MLB"], sportsbooks: ["DraftKings", "FanDuel"], maxUnitSize: 1 };
const developmentStore = new Map<string, UserPreferences>();

class DevelopmentPreferencesRepository implements PreferencesRepository {
  async get(userId: string) { return developmentStore.get(userId) ?? defaults; }
  async save(userId: string, preferences: UserPreferences) { developmentStore.set(userId, preferences); return preferences; }
}

class SupabasePreferencesRepository implements PreferencesRepository {
  private readonly defaults = defaults;
  constructor(private readonly url: string, private readonly key: string) {}
  private headers(extra?: Record<string, string>) {
    return { apikey: this.key, Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", ...extra };
  }
  async get(userId: string) {
    const response = await fetch(`${this.url}/rest/v1/user_preferences?user_id=eq.${encodeURIComponent(userId)}&select=risk_profile,leagues,sportsbooks,max_unit_size&limit=1`, {
      headers: this.headers(), cache: "no-store", signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Preference storage responded with ${response.status}`);
    const [row] = await response.json() as Array<{ risk_profile: RiskProfile; leagues: string[]; sportsbooks: string[]; max_unit_size: number }>;
    return row ? { riskProfile: row.risk_profile, leagues: row.leagues, sportsbooks: row.sportsbooks, maxUnitSize: row.max_unit_size } : this.defaults;
  }
  async save(userId: string, preferences: UserPreferences) {
    const response = await fetch(`${this.url}/rest/v1/user_preferences?on_conflict=user_id`, {
      method: "POST",
      headers: this.headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({ user_id: userId, risk_profile: preferences.riskProfile, leagues: preferences.leagues, sportsbooks: preferences.sportsbooks, max_unit_size: preferences.maxUnitSize, updated_at: new Date().toISOString() }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Preference storage responded with ${response.status}`);
    return preferences;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const preferencesRepository: PreferencesRepository = supabaseUrl && serviceKey
  ? new SupabasePreferencesRepository(supabaseUrl, serviceKey)
  : new DevelopmentPreferencesRepository();
