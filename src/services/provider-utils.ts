import type { ProviderResult } from "./types";

export function mockResult<T>(data: T, provider: string): ProviderResult<T> {
  return { data, provider, mode: "mock", updatedAt: new Date().toISOString() };
}
