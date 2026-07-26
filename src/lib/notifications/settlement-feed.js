const categoryLabel = (value) => ({
  player_prop: "Player Props", moneyline: "Moneylines", spread: "Spreads",
  total: "Totals", parlay: "Parlays", live: "Live Markets",
})[value] ?? String(value || "Pick").replaceAll("_", " ");

export function ratingImpactExplanation(pick, impact) {
  if (!impact || pick.result === "push" || pick.result === "void") return "Pushes and voids do not change your rating.";
  const change = Number(impact.ratingChange);
  const direction = change > 0 ? `+${Math.round(change)}` : `${Math.round(change)}`;
  const price = Number(pick.americanOdds);
  if (pick.result === "win" && price > 0) return `${direction} rating for winning as an underdog in ${categoryLabel(pick.category)}.`;
  if (pick.result === "win") return `${direction} rating for an automatically verified win in ${categoryLabel(pick.category)}.`;
  if (price < -150) return `${direction} rating because a heavily favored pick lost.`;
  return `${direction} rating after an automatically verified loss in ${categoryLabel(pick.category)}.`;
}

export function buildSettlementFeed(input) {
  const { picks = [], audits = [], impacts = [], now = Date.now() } = input;
  const pickById = new Map(picks.map((pick) => [pick.id, pick]));
  const impactByPick = new Map(impacts.map((impact) => [impact.pickId, impact]));
  const items = [];

  for (const audit of audits) {
    const pick = pickById.get(audit.pickId);
    if (!pick) continue;
    const corrected = audit.previousResult && audit.previousResult !== "pending" && audit.previousResult !== audit.result;
    items.push({
      id: `settlement-${audit.id}`, tone: audit.result === "win" ? "win" : audit.result === "loss" ? "loss" : "info",
      title: corrected ? "Official result corrected" : audit.result === "win" ? "Pick won" : audit.result === "loss" ? "Pick lost" : "Pick settled",
      detail: corrected
        ? `${pick.selection}: ${audit.previousResult.toUpperCase()} → ${audit.result.toUpperCase()}. Your rating was recalculated automatically.`
        : `${pick.selection}. ${ratingImpactExplanation(pick, impactByPick.get(pick.id))}`,
      href: "/picks", occurredAt: audit.createdAt,
    });
  }

  for (const pick of picks.filter((item) => item.source === "provider" && item.result === "pending")) {
    const eventAt = pick.eventCommenceAt ? new Date(pick.eventCommenceAt).getTime() : new Date(pick.placedAt).getTime();
    const delayed = now - eventAt > 6 * 60 * 60 * 1000;
    items.push({
      id: `pending-${pick.id}`, tone: "info",
      title: delayed ? "Official result still pending" : "Pick locked successfully",
      detail: delayed
        ? `${pick.selection} is safe and locked. ${pick.category === "player_prop" ? "Waiting for final player statistics." : "Waiting for the official final score."}`
        : `${pick.selection}. The line is locked and STRATIQA will settle it automatically.`,
      href: "/picks", occurredAt: pick.placedAt,
    });
  }

  for (const pick of picks.filter((item) => item.certificationStatus === "certified")) {
    items.push({
      id: `certified-${pick.id}`, tone: "win", title: "Sportsbook proof confirmed",
      detail: `${pick.selection} now contributes to your confirmed real-money profit and ROI.`,
      href: "/picks", occurredAt: pick.gradedAt ?? pick.placedAt,
    });
  }

  return items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}
