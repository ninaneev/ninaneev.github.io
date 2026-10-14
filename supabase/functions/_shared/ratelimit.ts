// Tiny fixed window limiter, per warm instance (no shared store). Good enough to stop a
// script from hammering one function or mail bombing one address; not a hard guarantee.

export class RateLimiter {
  private hits = new Map<string, { start: number; count: number }>();

  constructor(private limit: number, private windowMs: number, private maxKeys = 5000) {}

  /** Records a hit for key and returns true while the key is within its limit. */
  allow(key: string, now = Date.now()): boolean {
    const entry = this.hits.get(key);
    if (!entry || now - entry.start >= this.windowMs) {
      if (this.hits.size >= this.maxKeys) this.prune(now);
      this.hits.set(key, { start: now, count: 1 });
      return true;
    }
    entry.count += 1;
    return entry.count <= this.limit;
  }

  private prune(now: number) {
    for (const [k, v] of this.hits) if (now - v.start >= this.windowMs) this.hits.delete(k);
    if (this.hits.size >= this.maxKeys) this.hits.clear();
  }
}

/** Best effort client IP from the edge runtime headers. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? "unknown";
}
