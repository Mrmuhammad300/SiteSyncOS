import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    // Subcontractors only see their assigned work
    const userRole = (session.user as { role?: string }).role;
    const userId = (session.user as { id?: string }).id;
    if (userRole === 'Subcontractor' && userId) {
      where.assignedToId = userId;
    }

    const workOrders = await prisma.workOrder.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        progressPhotos: { select: { id: true, cloudStoragePath: true, caption: true, createdAt: true } },
        _count: { select: { progressPhotos: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ workOrders });
  } catch (error) {
    console.error('Error fetching work orders:', error);
    return NextResponse.json({ error: 'Failed to fetch work orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const body = await req.json();
    const { projectId, title, description, location, trade, assignedToId, priority, dueDate, estimatedHours, estimatedCost } = body;

    if (!projectId || !title || !description) {
      return NextResponse.json({ error: 'Project ID, title, and description required' }, { status: 400 });
    }

    // Generate work order number
    const count = await prisma.workOrder.count();
    const workOrderNumber = `WO-${String(count + 1).padStart(5, '0')}`;

    const workOrder = await prisma.workOrder.create({
      data: {
        workOrderNumber,
        projectId,
        title,
        description,
        location,
        trade,
        assignedToId,
        priority: priority || 'Normal',
        status: 'Pending',
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedHours,
        estimatedCost,
        createdById: userId
      },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ workOrder }, { status: 201 });
  } catch (error) {
    console.error('Error creating work order:', error);
    return NextResponse.json({ error: 'Failed to create work order' }, { status: 500 });
  }
}
