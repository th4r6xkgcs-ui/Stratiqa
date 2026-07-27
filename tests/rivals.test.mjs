import test from "node:test";
import assert from "node:assert/strict";
import { groupRivals, nextRivalTarget } from "../src/lib/ratings/rivals.js";

const rows = [
  { public_alias: "Nova", public_slug: "nova", category: "spread", rating_gap: 42, region_code: "CA" },
  { public_alias: "Nova", public_slug: "nova", category: "total", rating_gap: -15, region_code: "CA" },
  { public_alias: "Ace", public_slug: "ace", category: "spread", rating_gap: 11, country_code: "US" },
];

test("groups every public rival without losing category battles", () => {
  const rivals = groupRivals(rows);
  assert.equal(rivals.length, 2);
  assert.equal(rivals.find((rival) => rival.slug === "nova").categories.length, 2);
});

test("selects the closest analyst currently ahead", () => {
  assert.equal(nextRivalTarget(rows).public_alias, "Ace");
});
