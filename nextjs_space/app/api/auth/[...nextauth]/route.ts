import { NextRequest } from 'next/server';
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { rateLimit, PRESETS } from '@/lib/rate-limit';

const handler = NextAuth(authOptions);

// Apply rate limiting only to POST (sign-in / sign-out / credentials).
// GET (session checks, OAuth callbacks) is left unrestricted.
export async function GET(req: NextRequest, ctx: { params: { nextauth: string[] } }) {
  return handler(req, ctx);
}

export async function POST(req: NextRequest, ctx: { params: { nextauth: string[] } }) {
  const limited = await rateLimit(req, PRESETS.AUTH);
  if (!limited.ok) return limited.error;
  return handler(req, ctx);
}
