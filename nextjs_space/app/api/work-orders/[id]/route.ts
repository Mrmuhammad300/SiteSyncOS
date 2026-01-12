import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workOrder = await prisma.workOrder.findUnique({
      where: { id: params.id },
      include: {
        project: { select: { id: true, name: true, projectNumber: true, address: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        verifiedBy: { select: { id: true, firstName: true, lastName: true } },
        progressPhotos: true,
      },
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status, actualHours, actualCost, notes, startedDate, completedDate } = body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (actualHours !== undefined) updateData.actualHours = actualHours;
    if (actualCost !== undefined) updateData.actualCost = actualCost;
    if (notes !== undefined) updateData.notes = notes;
    if (startedDate) updateData.startedDate = new Date(startedDate);
    if (completedDate) updateData.completedDate = new Date(completedDate);

    // Auto-set dates based on status
    if (status === 'InProgress' && !updateData.startedDate) {
      updateData.startedDate = new Date();
    }
    if (status === 'Completed' && !updateData.completedDate) {
      updateData.completedDate = new Date();
    }
    if (status === 'Verified') {
      updateData.verifiedDate = new Date();
      updateData.verifiedById = session.user.id;
    }

    const workOrder = await prisma.workOrder.update({
      where: { id: params.id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        progressPhotos: true,
      },
    });

    return NextResponse.json({ workOrder });
  } catch (error) {
    console.error('Error updating work order:', error);
    return NextResponse.json({ error: 'Failed to update work order' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['Admin', 'ProjectManager'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.workOrder.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting work order:', error);
    return NextResponse.json({ error: 'Failed to delete work order' }, { status: 500 });
  }
}
