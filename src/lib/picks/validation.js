const categories = new Set(["player_prop", "moneyline", "spread", "total", "parlay", "live"]);
const results = new Set(["win", "loss", "push", "void"]);

export function validatePick(value) {
  if (!value || typeof value !== "object") return { ok: false, error: "Pick details are required." };
  const sport = typeof value.sport === "string" ? value.sport.trim().toUpperCase() : "";
  const category = typeof value.category === "string" ? value.category : "";
  const eventName = typeof value.eventName === "string" ? value.eventName.trim() : "";
  const selection = typeof value.selection === "string" ? value.selection.trim() : "";
  const market = typeof value.market === "string" ? value.market.trim() : "";
  const sportsbook = typeof value.sportsbook === "string" ? value.sportsbook.trim() : "";
  const americanOdds = Number(value.americanOdds);
  const stakeUnits = Number(value.stakeUnits);
  const confidence = Number(value.confidence);
  const notes = typeof value.notes === "string" ? value.notes.trim().slice(0, 500) : "";
  if (!sport || sport.length > 20) return { ok: false, error: "Choose a valid sport." };
  if (!categories.has(category)) return { ok: false, error: "Choose a valid betting category." };
  if (!eventName || eventName.length > 120 || !selection || selection.length > 120 || !market || market.length > 120) return { ok: false, error: "Event, selection, and market are required." };
  if (!sportsbook || sportsbook.length > 60) return { ok: false, error: "Choose a sportsbook." };
  if (!Number.isInteger(americanOdds) || Math.abs(americanOdds) < 100 || Math.abs(americanOdds) > 10000) return { ok: false, error: "Enter valid American odds." };
  if (!Number.isFinite(stakeUnits) || stakeUnits <= 0 || stakeUnits > 100) return { ok: false, error: "Stake must be between 0 and 100 units." };
  if (!Number.isFinite(confidence) || confidence < 1 || confidence > 100) return { ok: false, error: "Confidence must be between 1 and 100." };
  return { ok: true, value: { sport, category, eventName, selection, market, sportsbook, americanOdds, stakeUnits, confidence, notes } };
}

export function validateGrade(value) {
  if (!value || typeof value !== "object" || typeof value.id !== "string" || !value.id.trim()) return { ok: false, error: "Pick id is required." };
  if (!results.has(value.result)) return { ok: false, error: "Choose a valid result." };
  const closingOdds = value.closingOdds === "" || value.closingOdds == null ? null : Number(value.closingOdds);
  if (closingOdds !== null && (!Number.isInteger(closingOdds) || Math.abs(closingOdds) < 100 || Math.abs(closingOdds) > 10000)) return { ok: false, error: "Enter valid closing odds." };
  return { ok: true, value: { id: value.id.trim(), result: value.result, closingOdds } };
}

export function profitForResult(odds, stake, result) {
  if (result === "loss") return -stake;
  if (result === "push" || result === "void") return 0;
  return odds > 0 ? stake * odds / 100 : stake * 100 / Math.abs(odds);
}
