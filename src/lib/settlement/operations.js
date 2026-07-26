export function settlementRunStatus({ failures = 0, settled = 0, deferred = 0 }) {
  if (failures > 0) return settled > 0 ? "partial" : "failed";
  if (deferred > 0) return settled > 0 ? "partial" : "deferred";
  return "complete";
}

export function settlementIssueFingerprint(scope, reason) {
  return `${String(scope).trim().toLowerCase()}::${String(reason).trim().toLowerCase()}`;
}

export function retryDelayMinutes(attempts) {
  return Math.min(360, 15 * (2 ** Math.max(0, Number(attempts || 1) - 1)));
}
