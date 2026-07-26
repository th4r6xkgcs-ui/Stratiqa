import test from "node:test";
import assert from "node:assert/strict";
import { retryDelayMinutes, settlementIssueFingerprint, settlementRunStatus } from "../src/lib/settlement/operations.js";

test("settlement run status distinguishes all operational outcomes", () => {
  assert.equal(settlementRunStatus({ failures: 0, settled: 3, deferred: 0 }), "complete");
  assert.equal(settlementRunStatus({ failures: 0, settled: 0, deferred: 3 }), "deferred");
  assert.equal(settlementRunStatus({ failures: 0, settled: 2, deferred: 1 }), "partial");
  assert.equal(settlementRunStatus({ failures: 1, settled: 2, deferred: 1 }), "partial");
  assert.equal(settlementRunStatus({ failures: 1, settled: 0, deferred: 3 }), "failed");
});

test("settlement issue fingerprints normalize repeated provider failures", () => {
  assert.equal(settlementIssueFingerprint(" Player-Stats:MLB ", " Provider Unavailable "), "player-stats:mlb::provider unavailable");
});

test("retry delay uses a bounded exponential schedule", () => {
  assert.deepEqual([1, 2, 3, 4, 8].map(retryDelayMinutes), [15, 30, 60, 120, 360]);
  assert.equal(retryDelayMinutes(20), 360);
});
