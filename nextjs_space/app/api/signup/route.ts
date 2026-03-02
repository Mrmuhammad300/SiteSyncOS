import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { validate } from '@/lib/validations';
import { SignupSchema } from '@/lib/validations/auth';
import { handleCors, withCorsHeaders } from '@/lib/cors';
import { rateLimit, PRESETS } from '@/lib/rate-limit';

export async function OPTIONS(req: NextRequest) {
  return handleCors(req) ?? new NextResponse(null, { status: 204 });
}

export async function POST(request: NextRequest) {
  const preflight = handleCors(request);
  if (preflight) return preflight;

  const limited = await rateLimit(request, PRESETS.AUTH);
  if (!limited.ok) return withCorsHeaders(request, limited.error);

  const parsed = await validate(request, SignupSchema);
  if (!parsed.ok) return withCorsHeaders(request, parsed.error);

  const { email, password, firstName, lastName, role } = parsed.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return withCorsHeaders(
        request,
        NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, firstName, lastName, role },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    return withCorsHeaders(
      request,
      NextResponse.json({ message: 'User created successfully', user }, { status: 201 })
    );
  } catch (error) {
    console.error('[signup] Error creating user:', error);
    return withCorsHeaders(
      request,
      NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    );
  }
}
