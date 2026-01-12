import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const assignedToId = searchParams.get('assignedToId');

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    
    // Subcontractors only see work orders assigned to them
    if (session.user.role === 'Subcontractor') {
      where.assignedToId = session.user.id;
    } else if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    const workOrders = await prisma.workOrder.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        progressPhotos: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ workOrders });
  } catch (error) {
    console.error('Error fetching work orders:', error);
    return NextResponse.json({ error: 'Failed to fetch work orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, title, description, location, trade, priority, dueDate, assignedToId, estimatedHours, estimatedCost } = body;

    if (!projectId || !title || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
        priority: priority || 'Normal',
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedToId,
        estimatedHours,
        estimatedCost,
        createdById: session.user.id,
      },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ workOrder }, { status: 201 });
  } catch (error) {
    console.error('Error creating work order:', error);
    return NextResponse.json({ error: 'Failed to create work order' }, { status: 500 });
  }
}
