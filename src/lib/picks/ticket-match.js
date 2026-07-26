const normalizedTokens = (value) => new Set(String(value ?? "")
  .toLowerCase()
  .replace(/[^a-z0-9.+-]/g, " ")
  .split(/\s+/)
  .filter((token) => token.length > 1));

const similarity = (left, right) => {
  const a = normalizedTokens(left);
  const b = normalizedTokens(right);
  if (!a.size || !b.size) return 0;
  const overlap = [...a].filter((token) => b.has(token)).length;
  return overlap / Math.max(a.size, b.size);
};

export function scoreTicketMatch(pick, extraction) {
  let score = 0;
  if (String(pick.sportsbook).toLowerCase() === String(extraction.sportsbook).toLowerCase()) score += 25;
  if (extraction.ticketId) score += 10;
  score += Math.round(Math.max(...(extraction.selections ?? [""]).map((selection) => similarity(pick.selection, selection)), 0) * 45);
  score += Math.round(similarity(pick.eventName, extraction.event) * 15);
  if (Number(extraction.confidence) >= 80) score += 5;
  return Math.min(100, score);
}
