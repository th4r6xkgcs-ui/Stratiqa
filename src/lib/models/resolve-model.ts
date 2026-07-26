import "server-only";

export type OwnedModel = { id: string; name: string; sport: string; category: string; status: string; version: number };

export async function resolveOwnedModel(userId: string, modelId: unknown): Promise<OwnedModel | null> {
  if (typeof modelId !== "string" || !/^[0-9a-f-]{36}$/i.test(modelId)) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const response = await fetch(`${url}/rest/v1/analyst_models?id=eq.${encodeURIComponent(modelId)}&user_id=eq.${encodeURIComponent(userId)}&status=neq.retired&select=id,name,sport,category,status,version&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return null;
  return (await response.json() as OwnedModel[])[0] ?? null;
}
