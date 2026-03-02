/**
 * In-process token-bucket rate limiter for Next.js App Router API routes.
 *
 * Uses a bounded Map (with periodic sweep) so there is no dependency on
 * lru-cache or Redis. Suitable for single-instance Abacus AI deployments.
 * For multi-instance, swap the store for a Redis-backed implementation
 * without changing any call-sites.
 *
 * Usage:
 *   import { rateLimit, PRESETS } from '@/lib/rate-limit';
 *
 *   export async function POST(req: NextRequest) {
 *     const limit = await rateLimit(req, PRESETS.AUTH);
 *     if (!limit.ok) return limit.error;
 *     // ... normal handler
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitOptions {
  /** Maximum number of requests allowed in the window. */
  limit: number;
  /** Window duration in milliseconds. */
  windowMs: number;
  /** Human-readable label used in error messages (e.g. "authentication"). */
  label?: string;
}

type RateLimitOk = { ok: true };
type RateLimitFail = { ok: false; error: NextResponse };
export type RateLimitResult = RateLimitOk | RateLimitFail;

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export const PRESETS = {
  /** Strict: login, signup, password reset — 10 req / 10 min. */
  AUTH: { limit: 10, windowMs: 10 * 60 * 1000, label: 'authentication' } satisfies RateLimitOptions,
  /** Write endpoints (POST/PUT/PATCH/DELETE) — 60 req / min. */
  WRITE: { limit: 60, windowMs: 60 * 1000, label: 'write' } satisfies RateLimitOptions,
  /** AI / expensive pipeline endpoints — 20 req / min. */
  AI: { limit: 20, windowMs: 60 * 1000, label: 'AI pipeline' } satisfies RateLimitOptions,
  /** Upload endpoints — 30 req / 5 min. */
  UPLOAD: { limit: 30, windowMs: 5 * 60 * 1000, label: 'upload' } satisfies RateLimitOptions,
} as const;

// ---------------------------------------------------------------------------
// Token-bucket store
// ---------------------------------------------------------------------------

interface TokenEntry {
  tokens: number;
  resetAt: number;
}

// Bounded map — sweep expired entries every MAX_ENTRIES insertions.
const MAX_ENTRIES = 10_000;
const store = new Map<string, TokenEntry>();

function sweepExpired(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

// ---------------------------------------------------------------------------
// Core function
// ---------------------------------------------------------------------------

/**
 * Check (and consume one token from) the rate limit for this request.
 *
 * @param req     Incoming NextRequest
 * @param options RateLimitOptions or one of the PRESETS
 * @returns       { ok: true } or { ok: false, error: NextResponse(429) }
 */
export async function rateLimit(
  req: NextRequest,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { limit, windowMs, label = 'request' } = options;
  const ip = getClientIp(req);
  const key = `rl:${label}:${ip}`;
  const now = Date.now();

  let entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    // Periodic sweep to prevent unbounded growth.
    if (store.size >= MAX_ENTRIES) sweepExpired();

    entry = { tokens: limit - 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { ok: true };
  }

  if (entry.tokens <= 0) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return {
      ok: false,
      error: NextResponse.json(
        {
          error: `Too many ${label} requests. Please try again later.`,
          retryAfter: retryAfterSec,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSec),
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
          },
        }
      ),
    };
  }

  entry.tokens -= 1;
  store.set(key, entry);
  return { ok: true };
}
