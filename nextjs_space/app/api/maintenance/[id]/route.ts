import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workOrder = await prisma.maintenanceWorkOrder.findUnique({
      where: { id: params.id },
      include: {
        property: { select: { id: true, name: true, street: true, city: true } },
        unit: { select: { id: true, unitNumber: true, floor: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        tenant: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 });
    }

    return NextResponse.json({ workOrder });
  } catch (error) {
    console.error('Error fetching work order:', error);
    return NextResponse.json({ error: 'Failed to fetch work order' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { status, priority, assignedToId, scheduledDate, completedDate, actualCost, resolution, notes } = body;

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'InProgress' && !body.startedAt) {
        updateData.startedAt = new Date();
      } else if (status === 'Completed') {
        updateData.completedAt = completedDate ? new Date(completedDate) : new Date();
      }
    }
    if (priority !== undefined) updateData.priority = priority;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (scheduledDate !== undefined) updateData.scheduledDate = new Date(scheduledDate);
    if (actualCost !== undefined) updateData.actualCost = actualCost;
    if (resolution !== undefined) updateData.resolution = resolution;
    if (notes !== undefined) updateData.notes = notes;

    const workOrder = await prisma.maintenanceWorkOrder.update({
      where: { id: params.id },
      data: updateData,
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, unitNumber: true } },
        assignedTo: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ workOrder });
  } catch (error) {
    console.error('Error updating work order:', error);
    return NextResponse.json({ error: 'Failed to update work order' }, { status: 500 });
  }
}
