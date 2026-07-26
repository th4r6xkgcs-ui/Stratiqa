export function settleGameMarket(pick, score) {
  if (!score?.completed) return "pending";
  const home = Number(score.homeScore);
  const away = Number(score.awayScore);
  if (!Number.isFinite(home) || !Number.isFinite(away)) return "void";

  if (pick.marketKey === "h2h") {
    if (home === away) return "push";
    const winner = home > away ? score.homeTeam : score.awayTeam;
    return winner === pick.outcomeName ? "win" : "loss";
  }

  if (pick.marketKey === "spreads") {
    const selectedScore = pick.outcomeName === score.homeTeam ? home : away;
    const opponentScore = pick.outcomeName === score.homeTeam ? away : home;
    const adjusted = selectedScore + Number(pick.linePoint);
    return adjusted === opponentScore ? "push" : adjusted > opponentScore ? "win" : "loss";
  }

  if (pick.marketKey === "totals") {
    const difference = home + away - Number(pick.linePoint);
    if (difference === 0) return "push";
    const isOver = String(pick.outcomeName).toLowerCase() === "over";
    return (difference > 0) === isOver ? "win" : "loss";
  }

  return "void";
}

/**
 * @returns {{ result: "pending" | "win" | "loss" | "push" | "void", reason: string, actual?: number }}
 */
export function settlePlayerProp(pick, stat) {
  if (!stat || stat.status === "pending") return { result: "pending", reason: "Official player statistics are not final." };
  if (stat.status === "dnp") return { result: "void", reason: "Player did not participate." };
  if (stat.status === "void") return { result: "void", reason: stat.reason || "Provider voided the market." };
  const actual = Number(stat.value);
  const line = Number(pick.linePoint);
  if (!Number.isFinite(actual) || !Number.isFinite(line)) return { result: "void", reason: "Official statistic or locked line was unavailable." };
  if (actual === line) return { result: "push", reason: `Official ${pick.marketKey} finished exactly on ${line}.`, actual };
  const over = String(pick.outcomeName).toLowerCase() === "over";
  return {
    result: (actual > line) === over ? "win" : "loss",
    reason: `Official ${pick.marketKey}: ${actual}; locked line: ${line}.`,
    actual,
  };
}
