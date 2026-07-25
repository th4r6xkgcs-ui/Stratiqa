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
