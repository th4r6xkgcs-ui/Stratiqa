import type { DataProvider, ProviderHealth, ProviderResult } from "./types";

type CacheEntry<T> = { value: ProviderResult<T>; expiresAt: number; staleUntil: number };
type ProviderOptions = {
  ttlMs: number;
  staleMs: number;
  retries: number;
  maxRequestsPerWindow?: number;
  windowMs?: number;
  failureThreshold?: number;
  cooldownMs?: number;
};

export class ResilientProvider<T> implements DataProvider<T> {
  private cache: CacheEntry<T> | null = null;
  private health: ProviderHealth;
  private requestWindowStartedAt = Date.now();
  private requestsInWindow = 0;
  private circuitOpenUntil = 0;

  constructor(
    private readonly name: string,
    private readonly source: DataProvider<T>,
    private readonly options: ProviderOptions = { ttlMs: 30_000, staleMs: 300_000, retries: 2 },
  ) {
    this.health = {
      name, status: "healthy", mode: "mock", latencyMs: 0, lastSuccessAt: null,
      consecutiveFailures: 0, stale: false, cacheHits: 0, upstreamRequests: 0,
      quotaRemaining: this.options.maxRequestsPerWindow ?? null,
      circuitOpenUntil: null, dataAgeSeconds: null, lastError: null,
    };
  }

  async getData(): Promise<ProviderResult<T>> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      this.health = { ...this.health, cacheHits: this.health.cacheHits + 1, dataAgeSeconds: Math.max(0, Math.round((now - Date.parse(this.cache.value.updatedAt)) / 1000)) };
      return this.cache.value;
    }
    if (now - this.requestWindowStartedAt >= (this.options.windowMs ?? 60_000)) {
      this.requestWindowStartedAt = now;
      this.requestsInWindow = 0;
    }
    const quotaReached = this.options.maxRequestsPerWindow !== undefined && this.requestsInWindow >= this.options.maxRequestsPerWindow;
    const circuitOpen = this.circuitOpenUntil > now;
    if (quotaReached || circuitOpen) {
      const reason = quotaReached ? "Request budget reached; serving cached data." : "Provider circuit is cooling down.";
      if (this.cache && this.cache.staleUntil > now) {
        this.health = {
          ...this.health, status: "degraded", stale: true, cacheHits: this.health.cacheHits + 1,
          circuitOpenUntil: circuitOpen ? new Date(this.circuitOpenUntil).toISOString() : null,
          dataAgeSeconds: Math.max(0, Math.round((now - Date.parse(this.cache.value.updatedAt)) / 1000)),
          lastError: reason,
        };
        return { ...this.cache.value, stale: true };
      }
      throw new Error(reason);
    }
    const startedAt = performance.now();
    let lastError: unknown;
    this.requestsInWindow += 1;
    this.health = {
      ...this.health,
      upstreamRequests: this.health.upstreamRequests + 1,
      quotaRemaining: this.options.maxRequestsPerWindow === undefined ? null : Math.max(0, this.options.maxRequestsPerWindow - this.requestsInWindow),
    };

    for (let attempt = 0; attempt <= this.options.retries; attempt++) {
      try {
        const result = await this.source.getData();
        const latencyMs = Math.round(performance.now() - startedAt);
        const value = { ...result, latencyMs, stale: false };
        this.cache = { value, expiresAt: now + this.options.ttlMs, staleUntil: now + this.options.staleMs };
        this.circuitOpenUntil = 0;
        this.health = {
          ...this.health, name: this.name, status: "healthy", mode: result.mode, latencyMs,
          lastSuccessAt: result.updatedAt, consecutiveFailures: 0, stale: false,
          circuitOpenUntil: null, dataAgeSeconds: 0, lastError: null,
        };
        return value;
      } catch (error) {
        lastError = error;
        if (attempt < this.options.retries) await new Promise((resolve) => setTimeout(resolve, 50 * 2 ** attempt));
      }
    }

    const failures = this.health.consecutiveFailures + 1;
    if (failures >= (this.options.failureThreshold ?? 3)) {
      this.circuitOpenUntil = now + (this.options.cooldownMs ?? 60_000);
    }
    const errorMessage = lastError instanceof Error ? lastError.message : `${this.name} provider unavailable`;
    if (this.cache && this.cache.staleUntil > now) {
      this.health = {
        ...this.health, status: "degraded", consecutiveFailures: failures, stale: true,
        circuitOpenUntil: this.circuitOpenUntil ? new Date(this.circuitOpenUntil).toISOString() : null,
        dataAgeSeconds: Math.max(0, Math.round((now - Date.parse(this.cache.value.updatedAt)) / 1000)),
        lastError: errorMessage,
      };
      return { ...this.cache.value, stale: true };
    }
    this.health = {
      ...this.health, status: "unavailable", consecutiveFailures: failures, stale: true,
      circuitOpenUntil: this.circuitOpenUntil ? new Date(this.circuitOpenUntil).toISOString() : null,
      lastError: errorMessage,
    };
    throw new Error(errorMessage);
  }

  getHealth(): ProviderHealth {
    return { ...this.health };
  }
}
