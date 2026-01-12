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

    const task = await prisma.ganttTask.findUnique({
      where: { id: params.id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        predecessors: {
          include: {
            predecessor: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, startDate, endDate, percentComplete, status, isMilestone, assignedToId } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (percentComplete !== undefined) updateData.percentComplete = percentComplete;
    if (status !== undefined) updateData.status = status;
    if (isMilestone !== undefined) updateData.isMilestone = isMilestone;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;

    // Auto-update status based on progress
    if (percentComplete === 100 && status !== 'Completed') {
      updateData.status = 'Completed';
      updateData.actualEndDate = new Date();
    } else if (percentComplete > 0 && percentComplete < 100 && status === 'NotStarted') {
      updateData.status = 'InProgress';
      updateData.actualStartDate = new Date();
    }

    const task = await prisma.ganttTask.update({
      where: { id: params.id },
      data: updateData,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } }
      }
    });

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete dependencies first
    await prisma.ganttDependency.deleteMany({
      where: {
        OR: [
          { predecessorId: params.id },
          { successorId: params.id }
        ]
      }
    });

    await prisma.ganttTask.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
