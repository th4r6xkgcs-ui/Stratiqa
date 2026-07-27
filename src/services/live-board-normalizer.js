function shortTeam(name) {
  const words = String(name).trim().split(/\s+/);
  return (words.length > 1 ? words.map((word) => word[0]).join("") : words[0].slice(0, 3)).toUpperCase().slice(0, 4);
}

function lineLabel(outcome, marketKey) {
  if (marketKey === "h2h") return `${shortTeam(outcome.name)} ML`;
  if (marketKey === "totals") return `${outcome.name} ${outcome.point}`;
  const point = Number(outcome.point);
  return `${shortTeam(outcome.name)} ${point > 0 ? "+" : ""}${point}`;
}

export function normalizeLiveBoardEvent(event) {
  const best = new Map();
  for (const bookmaker of event.bookmakers ?? []) for (const market of bookmaker.markets ?? []) {
    if (!["h2h", "spreads", "totals"].includes(market.key)) continue;
    for (const outcome of market.outcomes ?? []) {
      if (!Number.isFinite(outcome.price)) continue;
      const point = outcome.point ?? null;
      const identity = `${market.key}:${outcome.name}:${point ?? ""}`;
      const quote = {
        book: bookmaker.title, price: outcome.price, line: lineLabel(outcome, market.key),
        marketKey: market.key, outcomeName: outcome.name, point,
      };
      const current = best.get(identity);
      if (!current || quote.price > current.price) best.set(identity, quote);
    }
  }
  return {
    id: event.id,
    slug: `${event.sport_key}--${event.id}`,
    sportKey: event.sport_key,
    awayTeam: event.away_team,
    homeTeam: event.home_team,
    commenceTime: event.commence_time,
    quotes: [...best.values()],
  };
}

export function normalizeLiveBoard(events) {
  return events.map(normalizeLiveBoardEvent).filter((event) => event.quotes.length);
}
