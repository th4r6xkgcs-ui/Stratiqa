const teamAbbreviations = {
  "Seattle Mariners": "sea",
  "San Francisco Giants": "sf",
  "Los Angeles Dodgers": "lad",
  "Colorado Rockies": "col",
  "New York Yankees": "nyy",
  "Boston Red Sox": "bos",
  "Houston Astros": "hou",
  "Chicago White Sox": "chw",
  "Minnesota Twins": "min",
  "Cleveland Guardians": "cle",
  "Atlanta Braves": "atl",
  "Miami Marlins": "mia",
};

function formatOutcome(outcome) {
  const point = outcome.point === undefined ? "" : ` ${outcome.point > 0 ? "+" : ""}${outcome.point}`;
  return `${teamAbbreviations[outcome.name]?.toUpperCase() ?? outcome.name}${point}`;
}

export function normalizeOdds(games) {
  return games.flatMap((game) => {
    const away = teamAbbreviations[game.away_team];
    const home = teamAbbreviations[game.home_team];
    if (!away || !home) return [];
    const quotes = game.bookmakers.flatMap((bookmaker) =>
      bookmaker.markets
        .filter((market) => market.key === "h2h" || market.key === "spreads")
        .flatMap((market) => market.outcomes.map((outcome) => ({
          book: bookmaker.title,
          price: outcome.price,
          line: formatOutcome(outcome),
          marketKey: market.key,
          outcomeName: outcome.name,
          point: outcome.point ?? null,
        }))),
    );
    const best = quotes.reduce(
      (current, quote) => !current || quote.price > current.price ? quote : current,
      null,
    );
    return quotes.length ? [{ matchupId: `${away}-vs-${home}`, bestBook: best?.book ?? quotes[0].book, quotes, providerEventId: game.id, providerSportKey: game.sport_key, commenceTime: game.commence_time }] : [];
  });
}
