import "server-only";

export type PickResult = "pending" | "win" | "loss" | "push" | "void";
export type TrackedPick = {
  id: string; userId: string; sport: string; category: string; eventName: string; selection: string;
  market: string; sportsbook: string; americanOdds: number; closingOdds: number | null; stakeUnits: number;
  confidence: number; result: PickResult; profitUnits: number | null; notes: string; source: "user" | "provider";
  placedAt: string; gradedAt: string | null;
};
export type NewPick = Omit<TrackedPick, "id" | "userId" | "closingOdds" | "result" | "profitUnits" | "source" | "placedAt" | "gradedAt">;

interface PicksRepository {
  list(userId: string): Promise<TrackedPick[]>;
  create(userId: string, pick: NewPick): Promise<TrackedPick>;
  grade(userId: string, id: string, result: Exclude<PickResult, "pending">, closingOdds: number | null, profitUnits: number): Promise<TrackedPick | null>;
}

const developmentStore = new Map<string, TrackedPick[]>();

class DevelopmentPicksRepository implements PicksRepository {
  async list(userId: string) { return developmentStore.get(userId) ?? []; }
  async create(userId: string, pick: NewPick) {
    const record: TrackedPick = { id: crypto.randomUUID(), userId, ...pick, closingOdds: null, result: "pending", profitUnits: null, source: "user", placedAt: new Date().toISOString(), gradedAt: null };
    developmentStore.set(userId, [record, ...(developmentStore.get(userId) ?? [])]);
    return record;
  }
  async grade(userId: string, id: string, result: Exclude<PickResult, "pending">, closingOdds: number | null, profitUnits: number) {
    const picks = developmentStore.get(userId) ?? [];
    const target = picks.find((pick) => pick.id === id);
    if (!target) return null;
    Object.assign(target, { result, closingOdds, profitUnits, gradedAt: new Date().toISOString() });
    return target;
  }
}

type PickRow = {
  id: string; user_id: string; sport: string; category: string; event_name: string; selection: string; market: string;
  sportsbook: string; american_odds: number; closing_odds: number | null; stake_units: number; confidence: number;
  result: PickResult; profit_units: number | null; notes: string | null; source: "user" | "provider"; placed_at: string; graded_at: string | null;
};
const fromRow = (row: PickRow): TrackedPick => ({
  id: row.id, userId: row.user_id, sport: row.sport, category: row.category, eventName: row.event_name,
  selection: row.selection, market: row.market, sportsbook: row.sportsbook, americanOdds: row.american_odds,
  closingOdds: row.closing_odds, stakeUnits: row.stake_units, confidence: row.confidence, result: row.result,
  profitUnits: row.profit_units, notes: row.notes ?? "", source: row.source, placedAt: row.placed_at, gradedAt: row.graded_at,
});

class SupabasePicksRepository implements PicksRepository {
  constructor(private readonly url: string, private readonly key: string) {}
  private headers(extra?: Record<string, string>) { return { apikey: this.key, Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", ...extra }; }
  async list(userId: string) {
    const response = await fetch(`${this.url}/rest/v1/graded_betting_activity?user_id=eq.${encodeURIComponent(userId)}&select=*&order=placed_at.desc&limit=250`, { headers: this.headers(), cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new Error(`Pick storage responded with ${response.status}`);
    return (await response.json() as PickRow[]).map(fromRow);
  }
  async create(userId: string, pick: NewPick) {
    const response = await fetch(`${this.url}/rest/v1/graded_betting_activity`, {
      method: "POST", headers: this.headers({ Prefer: "return=representation" }), cache: "no-store", signal: AbortSignal.timeout(8_000),
      body: JSON.stringify({ user_id: userId, sport: pick.sport, category: pick.category, event_name: pick.eventName, selection: pick.selection, market: pick.market, sportsbook: pick.sportsbook, american_odds: pick.americanOdds, stake_units: pick.stakeUnits, confidence: pick.confidence, notes: pick.notes, result: "pending", source: "user", placed_at: new Date().toISOString() }),
    });
    if (!response.ok) throw new Error(`Pick storage responded with ${response.status}`);
    return fromRow((await response.json() as PickRow[])[0]);
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
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const picksRepository: PicksRepository = supabaseUrl && serviceKey ? new SupabasePicksRepository(supabaseUrl, serviceKey) : new DevelopmentPicksRepository();
