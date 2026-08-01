import test from "node:test";
import assert from "node:assert/strict";
import { normalizeDashboardLayout } from "../src/lib/dashboard/layout.ts";

test("fills missing dashboard widgets without discarding user order", () => {
  const layout = normalizeDashboardLayout({ order: ["activity", "rating"], hidden: [], sizes: {} });
  assert.deepEqual(layout.order.slice(0, 2), ["activity", "rating"]);
  assert.equal(layout.order.length, 8);
});

test("rejects unknown widgets and invalid sizes", () => {
  const layout = normalizeDashboardLayout({ order: ["unknown", "rating"], hidden: ["fake", "updates"], sizes: { rating: "huge" } });
  assert.equal(layout.order.includes("unknown"), false);
  assert.deepEqual(layout.hidden, ["updates"]);
  assert.equal(layout.sizes.rating, "compact");
});
