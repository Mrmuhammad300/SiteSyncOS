import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { materialCategorySchema } from '@/lib/validations/material';

export async function GET() {
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

    const categories = await prisma.materialCategory.findMany({
      include: {
        children: {
          include: {
            _count: { select: { materials: true } },
          },
          orderBy: { displayOrder: 'asc' },
        },
        _count: { select: { materials: true } },
      },
      where: { parentId: null },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('[Material Categories API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
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
    const parsed = materialCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const category = await prisma.materialCategory.create({
      data: parsed.data,
      include: {
        parent: true,
        _count: { select: { materials: true } },
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Category name already exists' }, { status: 409 });
    }
    console.error('[Material Categories API] Error:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
