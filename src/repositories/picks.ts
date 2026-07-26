import "server-only";

export type PickResult = "pending" | "win" | "loss" | "push" | "void";
export type TrackedPick = {
  id: string; userId: string; sport: string; category: string; eventName: string; selection: string;
  market: string; sportsbook: string; americanOdds: number; closingOdds: number | null; stakeUnits: number;
  confidence: number; result: PickResult; profitUnits: number | null; notes: string; source: "user" | "provider";
  verificationStatus: "unverified" | "pending" | "verified" | "void"; providerEventId: string | null;
  providerSportKey: string | null; marketKey: string | null; outcomeName: string | null; linePoint: number | null;
  participantName: string | null;
  attributionType: "judgment" | "model"; modelId: string | null; modelVersion: number | null; modelName: string | null;
  pickOrigin: "stratiqa" | "model" | "personal";
  coachRecommendationId: string | null;
  certificationStatus: "tracked" | "evidence_pending" | "certified" | "rejected";
  eventCommenceAt: string | null;
  realStakeAmount: number | null; realPayoutAmount: number | null; realProfitAmount: number | null;
  settlementReason: string | null; providerStatValue: number | null; settlementProvider: string | null; settlementRevision: string | null;
  placedAt: string; gradedAt: string | null;
};
export type NewPick = Omit<TrackedPick, "id" | "userId" | "closingOdds" | "result" | "profitUnits" | "source" | "verificationStatus" | "providerEventId" | "providerSportKey" | "marketKey" | "outcomeName" | "linePoint" | "participantName" | "attributionType" | "modelId" | "modelVersion" | "modelName" | "pickOrigin" | "coachRecommendationId" | "certificationStatus" | "eventCommenceAt" | "realStakeAmount" | "realPayoutAmount" | "realProfitAmount" | "settlementReason" | "providerStatValue" | "settlementProvider" | "settlementRevision" | "placedAt" | "gradedAt">;
export type CategoryRating = { category: string; rating: number; gradedPicks: number };
export type TrackedCard = {
  id: string; cardType: "single" | "parlay"; legCount: number; combinedAmericanOdds: number | null;
  confidence: number; stakeUnits: number; result: PickResult; verificationStatus: "pending" | "verified" | "void";
  profitUnits: number | null; placedAt: string; settledAt: string | null;
};
export type SettlementAudit = {
  id: number; pickId: string; previousResult: string | null; result: string; provider: string;
  providerStatValue: number | null; reason: string | null; revision: string | null; createdAt: string;
};
export type ProviderPick = Omit<NewPick, "notes"> & {
  providerEventId: string; providerSportKey: string; marketKey: string; outcomeName: string; linePoint: number | null;
  attributionType: "judgment" | "model"; modelId: string | null; modelVersion: number | null; modelName: string | null;
  pickOrigin: "stratiqa" | "model" | "personal";
  coachRecommendationId: string | null;
  eventCommenceAt: string | null;
  pickCardId?: string | null;
  participantName?: string | null;
};

interface PicksRepository {
  list(userId: string): Promise<TrackedPick[]>;
  listRatings(userId: string): Promise<CategoryRating[]>;
  listCards(userId: string): Promise<TrackedCard[]>;
  listSettlementAudit(userId: string): Promise<SettlementAudit[]>;
  listRecentSettledProps(): Promise<TrackedPick[]>;
  create(userId: string, pick: NewPick): Promise<TrackedPick>;
  createProvider(userId: string, pick: ProviderPick): Promise<TrackedPick>;
  createProviderBatch(userId: string, picks: ProviderPick[]): Promise<TrackedPick[]>;
  grade(userId: string, id: string, result: Exclude<PickResult, "pending">, closingOdds: number | null, profitUnits: number): Promise<TrackedPick | null>;
  listPendingProvider(): Promise<TrackedPick[]>;
  settleProvider(id: string, result: Exclude<PickResult, "pending">, profitUnits: number, metadata?: { provider: string; reason?: string; statValue?: number; revision?: string }): Promise<boolean>;
  reviseProvider(id: string, result: Exclude<PickResult, "pending">, profitUnits: number, metadata: { provider: string; reason?: string; statValue?: number; revision: string }): Promise<boolean>;
}

const developmentStore = new Map<string, TrackedPick[]>();

class DevelopmentPicksRepository implements PicksRepository {
  async list(userId: string) { return developmentStore.get(userId) ?? []; }
  async listRatings() { return []; }
  async listCards() { return []; }
  async listSettlementAudit() { return []; }
  async listRecentSettledProps() { return []; }
  async create(userId: string, pick: NewPick) {
    const record: TrackedPick = { id: crypto.randomUUID(), userId, ...pick, closingOdds: null, result: "pending", profitUnits: null, source: "user", verificationStatus: "unverified", providerEventId: null, providerSportKey: null, marketKey: null, outcomeName: null, linePoint: null, participantName: null, attributionType: "judgment", modelId: null, modelVersion: null, modelName: null, pickOrigin: "personal", coachRecommendationId: null, certificationStatus: "tracked", eventCommenceAt: null, realStakeAmount: null, realPayoutAmount: null, realProfitAmount: null, settlementReason: null, providerStatValue: null, settlementProvider: null, settlementRevision: null, placedAt: new Date().toISOString(), gradedAt: null };
    developmentStore.set(userId, [record, ...(developmentStore.get(userId) ?? [])]);
    return record;
  }
  async createProvider(userId: string, pick: ProviderPick) {
    const record: TrackedPick = { id: crypto.randomUUID(), userId, ...pick, participantName: pick.participantName ?? null, notes: "", closingOdds: null, result: "pending", profitUnits: null, source: "provider", verificationStatus: "pending", certificationStatus: "tracked", realStakeAmount: null, realPayoutAmount: null, realProfitAmount: null, settlementReason: null, providerStatValue: null, settlementProvider: null, settlementRevision: null, placedAt: new Date().toISOString(), gradedAt: null };
    developmentStore.set(userId, [record, ...(developmentStore.get(userId) ?? [])]);
    return record;
  }
  async createProviderBatch(userId: string, picks: ProviderPick[]) {
    const records = await Promise.all(picks.map((pick) => this.createProvider(userId, pick)));
    return records;
  }
  async grade(userId: string, id: string, result: Exclude<PickResult, "pending">, closingOdds: number | null, profitUnits: number) {
    const picks = developmentStore.get(userId) ?? [];
    const target = picks.find((pick) => pick.id === id);
    if (!target) return null;
    Object.assign(target, { result, closingOdds, profitUnits, gradedAt: new Date().toISOString() });
    return target;
  }
  async listPendingProvider() { return [...developmentStore.values()].flat().filter((pick) => pick.source === "provider" && pick.verificationStatus === "pending"); }
  async settleProvider(id: string, result: Exclude<PickResult, "pending">, profitUnits: number) {
    const target = [...developmentStore.values()].flat().find((pick) => pick.id === id);
    if (!target || target.source !== "provider" || target.verificationStatus !== "pending") return false;
    Object.assign(target, { result, profitUnits, verificationStatus: result === "void" ? "void" : "verified", gradedAt: new Date().toISOString() });
    return true;
  }
  async reviseProvider() { return false; }
}

type PickRow = {
  id: string; user_id: string; sport: string; category: string; event_name: string; selection: string; market: string;
  sportsbook: string; american_odds: number; closing_odds: number | null; stake_units: number; confidence: number;
  result: PickResult; profit_units: number | null; notes: string | null; source: "user" | "provider";
  verification_status?: "unverified" | "pending" | "verified" | "void"; placed_at: string; graded_at: string | null;
  provider_event_id?: string | null; provider_sport_key?: string | null; market_key?: string | null;
  outcome_name?: string | null; line_point?: number | null;
  participant_name?: string | null;
  attribution_type?: "judgment" | "model"; model_id?: string | null; model_version?: number | null; model_name?: string | null;
  pick_origin?: "stratiqa" | "model" | "personal";
  coach_recommendation_id?: string | null;
  certification_status?: "tracked" | "evidence_pending" | "certified" | "rejected";
  event_commence_at?: string | null;
  real_stake_amount?: number | null; real_payout_amount?: number | null; real_profit_amount?: number | null;
  settlement_reason?: string | null; provider_stat_value?: number | null; settlement_provider?: string | null; settlement_revision?: string | null;
};
const fromRow = (row: PickRow): TrackedPick => ({
  id: row.id, userId: row.user_id, sport: row.sport, category: row.category, eventName: row.event_name,
  selection: row.selection, market: row.market, sportsbook: row.sportsbook, americanOdds: row.american_odds,
  closingOdds: row.closing_odds, stakeUnits: row.stake_units, confidence: row.confidence, result: row.result,
  profitUnits: row.profit_units, notes: row.notes ?? "", source: row.source,
  verificationStatus: row.verification_status ?? (row.source === "provider" ? "verified" : "unverified"),
  providerEventId: row.provider_event_id ?? null, providerSportKey: row.provider_sport_key ?? null,
  marketKey: row.market_key ?? null, outcomeName: row.outcome_name ?? null, linePoint: row.line_point ?? null,
  participantName: row.participant_name ?? null,
  attributionType: row.attribution_type ?? "judgment", modelId: row.model_id ?? null, modelVersion: row.model_version ?? null, modelName: row.model_name ?? null,
  pickOrigin: row.pick_origin ?? (row.attribution_type === "model" ? "model" : "personal"),
  coachRecommendationId: row.coach_recommendation_id ?? null,
  certificationStatus: row.certification_status ?? "tracked", eventCommenceAt: row.event_commence_at ?? null,
  realStakeAmount: row.real_stake_amount == null ? null : Number(row.real_stake_amount),
  realPayoutAmount: row.real_payout_amount == null ? null : Number(row.real_payout_amount),
  realProfitAmount: row.real_profit_amount == null ? null : Number(row.real_profit_amount),
  settlementReason: row.settlement_reason ?? null,
  providerStatValue: row.provider_stat_value == null ? null : Number(row.provider_stat_value),
  settlementProvider: row.settlement_provider ?? null,
  settlementRevision: row.settlement_revision ?? null,
  placedAt: row.placed_at, gradedAt: row.graded_at,
});

class SupabasePicksRepository implements PicksRepository {
  constructor(private readonly url: string, private readonly key: string) {}
  private headers(extra?: Record<string, string>) { return { apikey: this.key, Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", ...extra }; }
  async list(userId: string) {
    const response = await fetch(`${this.url}/rest/v1/graded_betting_activity?user_id=eq.${encodeURIComponent(userId)}&select=*&order=placed_at.desc&limit=250`, { headers: this.headers(), cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`Pick storage responded with ${response.status}`);
    return (await response.json() as PickRow[]).map(fromRow);
  }
  async listRatings(userId: string) {
    const response = await fetch(`${this.url}/rest/v1/category_ratings?user_id=eq.${encodeURIComponent(userId)}&select=category,rating,graded_picks`, { headers: this.headers(), cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`Rating storage responded with ${response.status}`);
    return (await response.json() as Array<{ category: string; rating: number; graded_picks: number }>).map((row) => ({
      category: row.category, rating: Number(row.rating), gradedPicks: row.graded_picks,
    }));
  }
  async listCards(userId: string) {
    const response = await fetch(`${this.url}/rest/v1/pick_cards?user_id=eq.${encodeURIComponent(userId)}&select=*&order=placed_at.desc&limit=100`, { headers: this.headers(), cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`Pick card storage responded with ${response.status}`);
    }
    return (await response.json() as Array<{ id: string; card_type: "single" | "parlay"; leg_count: number; combined_american_odds: number | null; confidence: number; stake_units: number; result: PickResult; verification_status: "pending" | "verified" | "void"; profit_units: number | null; placed_at: string; settled_at: string | null }>).map((row) => ({
      id: row.id, cardType: row.card_type, legCount: row.leg_count, combinedAmericanOdds: row.combined_american_odds,
      confidence: row.confidence, stakeUnits: Number(row.stake_units), result: row.result,
      verificationStatus: row.verification_status, profitUnits: row.profit_units == null ? null : Number(row.profit_units),
      placedAt: row.placed_at, settledAt: row.settled_at,
    }));
  }
  async listSettlementAudit(userId: string) {
    const response = await fetch(`${this.url}/rest/v1/pick_settlement_audit?user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc&limit=100`, { headers: this.headers(), cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return [];
    return (await response.json() as Array<{ id: number; pick_id: string; previous_result: string | null; result: string; provider: string; provider_stat_value: number | null; reason: string | null; revision: string | null; created_at: string }>).map((row) => ({
      id: row.id, pickId: row.pick_id, previousResult: row.previous_result, result: row.result, provider: row.provider,
      providerStatValue: row.provider_stat_value == null ? null : Number(row.provider_stat_value),
      reason: row.reason, revision: row.revision, createdAt: row.created_at,
    }));
  }
  async create(userId: string, pick: NewPick) {
    const response = await fetch(`${this.url}/rest/v1/graded_betting_activity`, {
      method: "POST", headers: this.headers({ Prefer: "return=representation" }), cache: "no-store", signal: AbortSignal.timeout(8_000),
      body: JSON.stringify({ user_id: userId, sport: pick.sport, category: pick.category, event_name: pick.eventName, selection: pick.selection, market: pick.market, sportsbook: pick.sportsbook, american_odds: pick.americanOdds, stake_units: pick.stakeUnits, confidence: pick.confidence, notes: pick.notes, result: "pending", source: "user", placed_at: new Date().toISOString() }),
    });
    if (!response.ok) throw new Error(`Pick storage responded with ${response.status}`);
    return fromRow((await response.json() as PickRow[])[0]);
  }
  async createProvider(userId: string, pick: ProviderPick) {
    const response = await fetch(`${this.url}/rest/v1/graded_betting_activity`, {
      method: "POST", headers: this.headers({ Prefer: "return=representation" }), cache: "no-store", signal: AbortSignal.timeout(8_000),
      body: JSON.stringify({ user_id: userId, sport: pick.sport, category: pick.category, event_name: pick.eventName, selection: pick.selection, market: pick.market, sportsbook: pick.sportsbook, american_odds: pick.americanOdds, stake_units: pick.stakeUnits, confidence: pick.confidence, result: "pending", source: "provider", verification_status: "pending", certification_status: "tracked", event_commence_at: pick.eventCommenceAt, provider_event_id: pick.providerEventId, provider_sport_key: pick.providerSportKey, market_key: pick.marketKey, outcome_name: pick.outcomeName, line_point: pick.linePoint, attribution_type: pick.attributionType, model_id: pick.modelId, model_version: pick.modelVersion, model_name: pick.modelName, pick_origin: "personal", coach_recommendation_id: null, locked_at: new Date().toISOString(), placed_at: new Date().toISOString() }),
    });
    if (!response.ok) throw new Error(`Pick storage responded with ${response.status}`);
    return fromRow((await response.json() as PickRow[])[0]);
  }
  async createProviderBatch(userId: string, picks: ProviderPick[]) {
    const now = new Date().toISOString();
    const cardId = crypto.randomUUID();
    const rows = picks.map((pick) => ({ user_id: userId, sport: pick.sport, category: pick.category, event_name: pick.eventName, selection: pick.selection, market: pick.market, sportsbook: pick.sportsbook, american_odds: pick.americanOdds, stake_units: pick.stakeUnits, confidence: pick.confidence, result: "pending", source: "provider", verification_status: "pending", certification_status: "tracked", event_commence_at: pick.eventCommenceAt, provider_event_id: pick.providerEventId, provider_sport_key: pick.providerSportKey, market_key: pick.marketKey, outcome_name: pick.outcomeName, line_point: pick.linePoint, participant_name: pick.participantName ?? null, attribution_type: pick.attributionType, model_id: pick.modelId, model_version: pick.modelVersion, model_name: pick.modelName, pick_origin: "personal", coach_recommendation_id: null, pick_card_id: pick.pickCardId ?? cardId, locked_at: now, placed_at: now }));
    const response = await fetch(`${this.url}/rest/v1/graded_betting_activity`, { method: "POST", headers: this.headers({ Prefer: "return=representation" }), cache: "no-store", signal: AbortSignal.timeout(8_000), body: JSON.stringify(rows) });
    if (!response.ok) throw new Error(`Pick storage responded with ${response.status}`);
    return (await response.json() as PickRow[]).map(fromRow);
  }
  async grade(userId: string, id: string, result: Exclude<PickResult, "pending">, closingOdds: number | null, profitUnits: number) {
    const response = await fetch(`${this.url}/rest/v1/graded_betting_activity?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`, {
      method: "PATCH", headers: this.headers({ Prefer: "return=representation" }), cache: "no-store", signal: AbortSignal.timeout(8_000),
      body: JSON.stringify({ result, closing_odds: closingOdds, profit_units: profitUnits, graded_at: new Date().toISOString() }),
    });
    if (!response.ok) throw new Error(`Pick storage responded with ${response.status}`);
    const [row] = await response.json() as PickRow[];
    return row ? fromRow(row) : null;
  }
  async listPendingProvider() {
    const query = "source=eq.provider&verification_status=eq.pending&result=eq.pending&select=*&limit=500";
    const response = await fetch(`${this.url}/rest/v1/graded_betting_activity?${query}`, { headers: this.headers(), cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`Pick storage responded with ${response.status}`);
    return (await response.json() as PickRow[]).map(fromRow);
  }
  async listRecentSettledProps() {
    const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    const query = `source=eq.provider&category=eq.player_prop&verification_status=in.(verified,void)&graded_at=gte.${encodeURIComponent(since)}&select=*&limit=500`;
    const response = await fetch(`${this.url}/rest/v1/graded_betting_activity?${query}`, { headers: this.headers(), cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`Pick correction storage responded with ${response.status}`);
    return (await response.json() as PickRow[]).map(fromRow);
  }
  async settleProvider(id: string, result: Exclude<PickResult, "pending">, profitUnits: number, metadata?: { provider: string; reason?: string; statValue?: number; revision?: string }) {
    const response = await fetch(`${this.url}/rest/v1/graded_betting_activity?id=eq.${encodeURIComponent(id)}&source=eq.provider&verification_status=eq.pending`, {
      method: "PATCH", headers: this.headers({ Prefer: "return=representation" }), cache: "no-store", signal: AbortSignal.timeout(8_000),
      body: JSON.stringify({
        result, profit_units: profitUnits, verification_status: result === "void" ? "void" : "verified",
        graded_at: new Date().toISOString(), settlement_provider: metadata?.provider ?? "game-results",
        settlement_reason: metadata?.reason ?? null, provider_stat_value: metadata?.statValue ?? null,
        settlement_revision: metadata?.revision ?? null,
      }),
    });
    if (!response.ok) throw new Error(`Pick storage responded with ${response.status}`);
    return (await response.json() as PickRow[]).length === 1;
  }
  async reviseProvider(id: string, result: Exclude<PickResult, "pending">, profitUnits: number, metadata: { provider: string; reason?: string; statValue?: number; revision: string }) {
    const response = await fetch(`${this.url}/rest/v1/graded_betting_activity?id=eq.${encodeURIComponent(id)}&source=eq.provider`, {
      method: "PATCH", headers: this.headers({ Prefer: "return=representation" }), cache: "no-store", signal: AbortSignal.timeout(8_000),
      body: JSON.stringify({
        result, profit_units: profitUnits, verification_status: result === "void" ? "void" : "verified",
        graded_at: new Date().toISOString(), settlement_provider: metadata.provider,
        settlement_reason: metadata.reason ?? null, provider_stat_value: metadata.statValue ?? null,
        settlement_revision: metadata.revision,
      }),
    });
    if (!response.ok) throw new Error(`Pick correction storage responded with ${response.status}`);
    return (await response.json() as PickRow[]).length === 1;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const picksRepository: PicksRepository = supabaseUrl && serviceKey ? new SupabasePicksRepository(supabaseUrl, serviceKey) : new DevelopmentPicksRepository();
