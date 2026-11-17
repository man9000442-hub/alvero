import "server-only";
import { createSupabaseAdminClient, isAdminSupabaseConfigured } from "./supabase/admin";

interface MemoryBucket {
  attempts: number;
  windowStart: number;
  blockedUntil: number | null;
}

const memoryLimiter = new Map<string, MemoryBucket>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Serverless-safe rate limiter backed by Supabase `rate_limits` table when configured,
 * with automatic in-memory fallback for local/test environments.
 */
export async function checkAndConsumeRateLimit(params: {
  key: string;
  maxAttempts: number;
  windowSeconds: number;
  blockSeconds: number;
}): Promise<RateLimitResult> {
  const { key, maxAttempts, windowSeconds, blockSeconds } = params;
  const now = Date.now();

  if (isAdminSupabaseConfigured()) {
    try {
      const supabase = createSupabaseAdminClient();
      const { data: existing } = await supabase
        .from("rate_limits")
        .select("*")
        .eq("key", key)
        .maybeSingle();

      if (existing?.blocked_until) {
        const blockedUntilMs = new Date(existing.blocked_until).getTime();
        if (blockedUntilMs > now) {
          return {
            allowed: false,
            retryAfterSeconds: Math.ceil((blockedUntilMs - now) / 1000),
          };
        }
      }

      const windowStartMs = existing?.window_start
        ? new Date(existing.window_start).getTime()
        : 0;
      const inCurrentWindow = now - windowStartMs < windowSeconds * 1000;
      const nextAttempts = inCurrentWindow ? (existing?.attempts ?? 0) + 1 : 1;

      if (nextAttempts > maxAttempts) {
        const blockedUntil = new Date(now + blockSeconds * 1000).toISOString();
        await supabase.from("rate_limits").upsert({
          key,
          attempts: nextAttempts,
          window_start: inCurrentWindow
            ? existing.window_start
            : new Date(now).toISOString(),
          blocked_until: blockedUntil,
        });
        return { allowed: false, retryAfterSeconds: blockSeconds };
      }

      await supabase.from("rate_limits").upsert({
        key,
        attempts: nextAttempts,
        window_start: inCurrentWindow
          ? existing.window_start
          : new Date(now).toISOString(),
        blocked_until: null,
      });

      return { allowed: true, retryAfterSeconds: 0 };
    } catch {
      // Fall through to in-memory limiter if DB table isn't migrated yet.
    }
  }

  const bucket = memoryLimiter.get(key);
  if (bucket?.blockedUntil && bucket.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.blockedUntil - now) / 1000),
    };
  }

  const inWindow = bucket && now - bucket.windowStart < windowSeconds * 1000;
  const attempts = inWindow ? bucket.attempts + 1 : 1;
  const windowStart = inWindow ? bucket.windowStart : now;

  if (attempts > maxAttempts) {
    memoryLimiter.set(key, {
      attempts,
      windowStart,
      blockedUntil: now + blockSeconds * 1000,
    });
    return { allowed: false, retryAfterSeconds: blockSeconds };
  }

  memoryLimiter.set(key, { attempts, windowStart, blockedUntil: null });
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function resetRateLimit(key: string): Promise<void> {
  memoryLimiter.delete(key);
  if (!isAdminSupabaseConfigured()) return;
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.from("rate_limits").delete().eq("key", key);
  } catch {
    // Ignore
  }
}
