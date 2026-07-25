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

export const preferencesRepository: PreferencesRepository = new DevelopmentPreferencesRepository();
