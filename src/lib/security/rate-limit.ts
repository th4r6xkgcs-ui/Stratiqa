type Bucket = { count: number; resetsAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const current = buckets.get(key);
  const bucket = !current || current.resetsAt <= now ? { count: 0, resetsAt: now + windowMs } : current;
  bucket.count += 1;
  buckets.set(key, bucket);
  return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), resetsAt: bucket.resetsAt };
}

export function requestIdentity(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}
