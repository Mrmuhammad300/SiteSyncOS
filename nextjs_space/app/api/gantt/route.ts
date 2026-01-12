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

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    const tasks = await prisma.ganttTask.findMany({
      where: { projectId },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        predecessors: {
          include: {
            predecessor: { select: { id: true, name: true } }
          }
        },
        successors: {
          include: {
            successor: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { startDate: 'asc' }
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error fetching gantt tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, name, description, startDate, endDate, percentComplete, status, isMilestone, assignedToId, parentId, wbsCode } = body;

    if (!projectId || !name || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const task = await prisma.ganttTask.create({
      data: {
        projectId,
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        percentComplete: percentComplete || 0,
        status: status || 'NotStarted',
        isMilestone: isMilestone || false,
        assignedToId,
        parentId,
        wbsCode
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } }
      }
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Error creating gantt task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
