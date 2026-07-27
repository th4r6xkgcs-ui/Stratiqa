export function groupRivals(rows) {
  const rivals = new Map();
  for (const row of rows) {
    const current = rivals.get(row.public_slug) ?? {
      alias: row.public_alias,
      slug: row.public_slug,
      location: [row.locality, row.region_code, row.country_code].filter(Boolean).join(", ") || "Global",
      categories: [],
    };
    current.categories.push(row);
    rivals.set(row.public_slug, current);
  }
  return [...rivals.values()];
}

export function nextRivalTarget(rows) {
  return rows.filter((row) => Number(row.rating_gap) > 0).sort((a, b) => Number(a.rating_gap) - Number(b.rating_gap))[0] ?? null;
}
