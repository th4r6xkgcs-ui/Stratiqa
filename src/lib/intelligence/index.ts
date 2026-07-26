import "server-only";
import { ServicesIntelligenceAdapter } from "./services-adapter";
import type { IntelligenceAdapter } from "./types";

export function getIntelligenceAdapter(): IntelligenceAdapter {
  return new ServicesIntelligenceAdapter();
}

export async function getIntelligenceSnapshot() {
  return getIntelligenceAdapter().getSnapshot();
}
