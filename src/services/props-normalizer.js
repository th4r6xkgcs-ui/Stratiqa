const marketNames = {
  batter_total_bases: "Total Bases", batter_hits: "Hits", batter_home_runs: "Home Runs",
  batter_rbis: "RBIs", batter_runs_scored: "Runs", batter_stolen_bases: "Stolen Bases",
  pitcher_strikeouts: "Strikeouts", pitcher_outs: "Pitching Outs",
  player_points: "Points", player_rebounds: "Rebounds", player_assists: "Assists",
  player_threes: "Three-Pointers", player_points_rebounds_assists: "Points + Rebounds + Assists",
  player_pass_yds: "Passing Yards", player_pass_tds: "Passing Touchdowns",
  player_rush_yds: "Rushing Yards", player_receptions: "Receptions",
  player_reception_yds: "Receiving Yards", player_points_alternate: "Points",
  player_shots_on_goal: "Shots on Goal", player_goals: "Goals", player_total_saves: "Saves",
  player_blocked_shots: "Blocked Shots", player_power_play_points: "Power Play Points",
};

export function normalizePlayerProps(events) {
  const grouped = new Map();
  for (const event of events) for (const bookmaker of event.bookmakers ?? []) for (const market of bookmaker.markets ?? []) {
    if (!marketNames[market.key]) continue;
    for (const outcome of market.outcomes ?? []) {
      if (!outcome.description || !Number.isFinite(outcome.point) || !["Over", "Under"].includes(outcome.name)) continue;
      const id = `${event.id}:${market.key}:${outcome.description}:${outcome.point}`;
      const current = grouped.get(id) ?? {
        id, player: outcome.description, team: "", matchup: `${event.away_team} at ${event.home_team}`,
        market: marketNames[market.key], line: `${outcome.name} ${outcome.point}`, price: outcome.price,
        projection: outcome.point, hitRate: 50, expectedValue: 0, confidence: 60, trend: [],
        tags: ["Live"], quotes: [], providerEventId: event.id, providerSportKey: event.sport_key,
        providerCommenceTime: event.commence_time, marketKey: market.key, point: outcome.point, live: true,
      };
      current.quotes.push({ book: bookmaker.title, outcomeName: outcome.name, price: outcome.price });
      if (outcome.name === "Over" && outcome.price > current.price) {
        current.line = `Over ${outcome.point}`;
        current.price = outcome.price;
      }
      grouped.set(id, current);
    }
  }
  return [...grouped.values()];
}
