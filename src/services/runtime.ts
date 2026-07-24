import type { DataProvider, ProviderHealth, ProviderResult } from "./types";

type CacheEntry<T> = { value: ProviderResult<T>; expiresAt: number; staleUntil: number };

export class ResilientProvider<T> implements DataProvider<T> {
  private cache: CacheEntry<T> | null = null;
  private health: ProviderHealth;

  constructor(
    private readonly name: string,
    private readonly source: DataProvider<T>,
    private readonly options = { ttlMs: 30_000, staleMs: 300_000, retries: 2 },
  ) {
    this.health = { name, status: "healthy", mode: "mock", latencyMs: 0, lastSuccessAt: null, consecutiveFailures: 0, stale: false };
  }

  async getData(): Promise<ProviderResult<T>> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) return this.cache.value;
    const startedAt = performance.now();
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.options.retries; attempt++) {
      try {
        const result = await this.source.getData();
        const latencyMs = Math.round(performance.now() - startedAt);
        const value = { ...result, latencyMs, stale: false };
        this.cache = { value, expiresAt: now + this.options.ttlMs, staleUntil: now + this.options.staleMs };
        this.health = { name: this.name, status: "healthy", mode: result.mode, latencyMs, lastSuccessAt: result.updatedAt, consecutiveFailures: 0, stale: false };
        return value;
      } catch (error) {
        lastError = error;
        if (attempt < this.options.retries) await new Promise((resolve) => setTimeout(resolve, 50 * 2 ** attempt));
      }
    }

    const failures = this.health.consecutiveFailures + 1;
    if (this.cache && this.cache.staleUntil > now) {
      this.health = { ...this.health, status: "degraded", consecutiveFailures: failures, stale: true };
      return { ...this.cache.value, stale: true };
    }
    this.health = { ...this.health, status: "unavailable", consecutiveFailures: failures, stale: true };
    throw lastError instanceof Error ? lastError : new Error(`${this.name} provider unavailable`);
  }

  getHealth(): ProviderHealth {
    return { ...this.health };
  }
}
