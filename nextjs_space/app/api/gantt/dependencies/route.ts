import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { predecessorId, successorId, type, lagDays } = body;

    if (!predecessorId || !successorId) {
      return NextResponse.json({ error: 'Both predecessor and successor task IDs required' }, { status: 400 });
    }

    // Check for circular dependencies
    const existingDep = await prisma.ganttDependency.findFirst({
      where: {
        predecessorId: successorId,
        successorId: predecessorId
      }
    });

    if (existingDep) {
      return NextResponse.json({ error: 'Circular dependency detected' }, { status: 400 });
    }

    const dependency = await prisma.ganttDependency.create({
      data: {
        predecessorId,
        successorId,
        type: type || 'FinishToStart',
        lagDays: lagDays || 0
      },
      include: {
        predecessor: { select: { id: true, name: true } },
        successor: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ dependency }, { status: 201 });
  } catch (error) {
    console.error('Error creating dependency:', error);
    return NextResponse.json({ error: 'Failed to create dependency' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Dependency ID required' }, { status: 400 });
    }

    await prisma.ganttDependency.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dependency:', error);
    return NextResponse.json({ error: 'Failed to delete dependency' }, { status: 500 });
  }
}
