import "server-only";
import { MockIntelligenceAdapter } from "./mock-adapter";
import type { IntelligenceAdapter } from "./types";

export function getIntelligenceAdapter(): IntelligenceAdapter {
  const provider = process.env.STRATIQA_DATA_PROVIDER ?? "mock";

  if (provider !== "mock") {
    console.warn(`Unknown STRATIQA_DATA_PROVIDER "${provider}"; using the safe mock adapter.`);
  }

  return new MockIntelligenceAdapter();
}

export async function getIntelligenceSnapshot() {
  return getIntelligenceAdapter().getSnapshot();
}
