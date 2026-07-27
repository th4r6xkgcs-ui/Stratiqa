export function updateGameTimelines(current, picks, at) {
  const next = { ...current };
  const grouped = new Map();
  for (const pick of picks) {
    const id = pick.eventId ?? `${pick.sportKey}:${pick.eventName}:${pick.eventCommenceAt}`;
    if (!grouped.has(id)) grouped.set(id, pick);
  }
  const changed = [];
  for (const [id, pick] of grouped) {
    const signature = `${pick.state}:${pick.awayScore ?? "-"}:${pick.homeScore ?? "-"}`;
    const prior = next[id] ?? [];
    if (prior[0]?.signature === signature) continue;
    const score = pick.awayScore == null && pick.homeScore == null ? null : `${pick.awayTeam ?? "Away"} ${pick.awayScore ?? "–"} · ${pick.homeTeam ?? "Home"} ${pick.homeScore ?? "–"}`;
    const label = pick.state === "live" ? score ?? "Game is live" : pick.state === "upcoming" ? "Pick locked before start" : pick.state === "awaiting" ? "Game final · awaiting official settlement" : `Official result: ${pick.result}`;
    next[id] = [{ signature, label, state: pick.state, at }, ...prior].slice(0, 12);
    if (prior.length) changed.push({ id, label, eventName: pick.eventName });
  }
  return { timelines: next, changed };
}
