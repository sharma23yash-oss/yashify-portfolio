/**
 * A small in-memory rate limiter (sliding window per key).
 *
 * Limits: each server instance keeps its own memory, and it resets on a cold start, so on Vercel
 * this is a speed bump, not a guarantee. The Turnstile check is the main defence against bots.
 * For a hard limit across instances, swap this for a shared store such as Upstash Redis.
 */

type Bucket = number[]; // timestamps (ms) of recent hits

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000; // cap memory if many different IPs arrive

export function rateLimit(key: string, { limit, windowMs }: { limit: number; windowMs: number }) {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    buckets.set(key, recent);
    const retryAfterMs = windowMs - (now - recent[0]);
    return { ok: false as const, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  recent.push(now);
  buckets.delete(key); // re-insert so the Map stays ordered oldest-first
  buckets.set(key, recent);
  if (buckets.size > MAX_KEYS) {
    const oldest = buckets.keys().next().value;
    if (oldest !== undefined) buckets.delete(oldest);
  }
  return { ok: true as const };
}
