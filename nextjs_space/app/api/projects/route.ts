import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { validate } from '@/lib/validations';
import { CreateProjectSchema } from '@/lib/validations/projects';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const status = searchParams.get('status');
    const phase = searchParams.get('phase');
    const search = searchParams.get('search');

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (phase) {
      where.phase = phase;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { client: { contains: search, mode: 'insensitive' } },
        { projectNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        projectManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        superintendent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            rfis: true,
            dailyReports: true,
            documents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await validate(request, CreateProjectSchema);
  if (!parsed.ok) return parsed.error;

  const {
    name, client, projectNumber, address, city, state, zipCode,
    startDate, estimatedCompletion, budget, status, phase, description,
    projectManagerId, superintendentId, architectId, engineerId,
  } = parsed.data;

  try {
    const existingProject = await prisma.project.findUnique({
      where: { projectNumber },
      select: { id: true },
    });

    if (existingProject) {
      return NextResponse.json({ error: 'Project number already exists' }, { status: 409 });
    }

    const project = await prisma.project.create({
      data: {
        name, client, projectNumber, address,
        city: city ?? null,
        state: state ?? null,
        zipCode: zipCode ?? null,
        startDate: new Date(startDate),
        estimatedCompletion: new Date(estimatedCompletion),
        budget,
        status,
        phase,
        description: description ?? null,
        projectManagerId: projectManagerId ?? null,
        superintendentId: superintendentId ?? null,
        architectId: architectId ?? null,
        engineerId: engineerId ?? null,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('[projects] Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
