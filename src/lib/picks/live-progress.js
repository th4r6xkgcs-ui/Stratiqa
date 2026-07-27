export function livePickProgress(pick, score) {
  if (!score || score.homeScore == null || score.awayScore == null) return { tone: "neutral", label: "Waiting for score", detail: "Your pregame pick is locked." };
  const home = Number(score.homeScore);
  const away = Number(score.awayScore);
  const selectedHome = pick.outcomeName === score.homeTeam;
  const selectedAway = pick.outcomeName === score.awayTeam;
  if (pick.marketKey === "h2h" && (selectedHome || selectedAway)) {
    const margin = selectedHome ? home - away : away - home;
    return margin > 0 ? { tone: "winning", label: "Currently ahead", detail: `Leading by ${margin}` } : margin < 0 ? { tone: "losing", label: "Currently behind", detail: `Trailing by ${Math.abs(margin)}` } : { tone: "neutral", label: "Currently tied", detail: `${home}–${away}` };
  }
  if (pick.marketKey === "spreads" && (selectedHome || selectedAway) && Number.isFinite(Number(pick.linePoint))) {
    const adjusted = (selectedHome ? home - away : away - home) + Number(pick.linePoint);
    return adjusted > 0 ? { tone: "winning", label: "Covering", detail: `${adjusted.toFixed(1)} points inside the line` } : adjusted < 0 ? { tone: "losing", label: "Not covering", detail: `${Math.abs(adjusted).toFixed(1)} points outside the line` } : { tone: "neutral", label: "On the number", detail: "Currently a push" };
  }
  if (pick.marketKey === "totals" && Number.isFinite(Number(pick.linePoint))) {
    const difference = home + away - Number(pick.linePoint);
    const winning = pick.outcomeName === "Over" ? difference > 0 : difference < 0;
    return difference === 0 ? { tone: "neutral", label: "On the total", detail: `${home + away} combined points` } : { tone: winning ? "winning" : "losing", label: winning ? "Currently on pace" : "Needs movement", detail: `${home + away} scored · line ${pick.linePoint}` };
  }
  return { tone: "neutral", label: "Tracking live", detail: "Official result will settle automatically." };
}
