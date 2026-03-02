/**
 * CORS middleware for Next.js API routes.
 *
 * Strategy:
 *  - Maintains an explicit allowlist of origins per environment.
 *  - Reflects the incoming Origin back only when it is on the allowlist.
 *  - Rejects all other origins (no wildcard `*`).
 *  - Handles preflight OPTIONS requests automatically.
 */

// ---------------------------------------------------------------------------
// Allowlist
// ---------------------------------------------------------------------------

function buildAllowedOrigins(): Set<string> {
  const origins = new Set<string>();

  // Always allow the canonical app URL (set on both local and prod).
  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) origins.add(appUrl.replace(/\/$/, ''));

  // Local development
  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000');
    origins.add('http://localhost:3001');
    origins.add('http://127.0.0.1:3000');
  }

  // Parse any additional comma-separated origins from the environment.
  // Example: CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
  const extra = process.env.CORS_ALLOWED_ORIGINS;
  if (extra) {
    extra.split(',').forEach((o) => {
      const trimmed = o.trim();
      if (trimmed) origins.add(trimmed);
    });
  }

  return origins;
}

// Build once at module load; origins don't change at runtime.
const ALLOWED_ORIGINS = buildAllowedOrigins();

// ---------------------------------------------------------------------------
// Headers helpers
// ---------------------------------------------------------------------------

const CORS_HEADERS_COMMON = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400', // 24 h preflight cache
} as const;

/**
 * Returns CORS response headers for a given request Origin.
 * If the origin is not on the allowlist the `Access-Control-Allow-Origin`
 * header is omitted, which causes the browser to block the request.
 */
export function getCorsHeaders(requestOrigin: string | null): HeadersInit {
  const headers: Record<string, string> = { ...CORS_HEADERS_COMMON };

  if (requestOrigin && ALLOWED_ORIGINS.has(requestOrigin)) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
    headers['Vary'] = 'Origin';
  }
  // No else: omitting the header lets the browser enforce the block.

  return headers;
}

// ---------------------------------------------------------------------------
// Preflight helper
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';

/**
 * Call at the top of every API route handler.
 * Returns a 204 response for OPTIONS (preflight) or `null` for all other
 * methods so the route can continue its normal logic.
 *
 * Usage:
 *   export async function GET(req: NextRequest) {
 *     const preflight = handleCors(req);
 *     if (preflight) return preflight;
 *     // ... normal handler
 *   }
 */
export function handleCors(req: NextRequest): NextResponse | null {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  return null;
}

/**
 * Attach CORS headers to an existing NextResponse.
 * Use this when you need fine-grained control over the response body.
 *
 * Usage:
 *   const res = NextResponse.json(data);
 *   return withCorsHeaders(req, res);
 */
export function withCorsHeaders(req: NextRequest, res: NextResponse): NextResponse {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}
