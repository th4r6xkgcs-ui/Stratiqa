import "server-only";
import type { DataProvider, ProviderResult } from "./types";

export abstract class HttpProvider<TExternal, TDomain> implements DataProvider<TDomain> {
  protected abstract normalize(value: TExternal): TDomain;
  constructor(private readonly config: { name: string; url: string; apiKey: string; timeoutMs?: number }) {}

  async getData(): Promise<ProviderResult<TDomain>> {
    const response = await fetch(this.config.url, {
      headers: { Authorization: `Bearer ${this.config.apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 8_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`${this.config.name} responded with ${response.status}`);
    return { data: this.normalize(await response.json() as TExternal), provider: this.config.name, mode: "live", updatedAt: new Date().toISOString() };
  }
}
