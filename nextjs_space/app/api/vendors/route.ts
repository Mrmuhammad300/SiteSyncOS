import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { vendorCreateSchema } from '@/lib/validations/material';

export async function GET(request: Request) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch {
      return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 });
    }
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const preferred = searchParams.get('preferred');
    const query = searchParams.get('query');

    const where: any = { isActive: true };
    if (type) where.vendorType = type;
    if (preferred === 'true') where.isPreferred = true;
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { companyName: { contains: query, mode: 'insensitive' } },
        { specialties: { hasSome: [query] } },
      ];
    }

    const vendors = await prisma.vendor.findMany({
      where,
      include: {
        _count: { select: { materials: true, priceHistory: true } },
      },
      orderBy: [{ isPreferred: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({ vendors });
  } catch (error) {
    console.error('[Vendors API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch {
      return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 });
    }
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = vendorCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const vendor = await prisma.vendor.create({
      data: parsed.data,
      include: {
        _count: { select: { materials: true } },
      },
    });

    return NextResponse.json({ vendor }, { status: 201 });
  } catch (error) {
    console.error('[Vendors API] Error:', error);
    return NextResponse.json({ error: 'Failed to create vendor' }, { status: 500 });
  }
}
