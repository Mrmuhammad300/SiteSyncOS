import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { projectMaterialCreateSchema } from '@/lib/validations/material';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
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

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectMaterials = await prisma.projectMaterial.findMany({
      where: { projectId: params.id },
      include: {
        material: {
          include: {
            category: true,
            primaryVendor: {
              select: { id: true, name: true, companyName: true },
            },
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary stats
    const summary = {
      totalItems: projectMaterials.length,
      totalBudgeted: projectMaterials.reduce((sum, pm) => sum + Number(pm.budgetedCost || 0), 0),
      totalActual: projectMaterials.reduce((sum, pm) => sum + Number(pm.actualCost || 0), 0),
      byStatus: projectMaterials.reduce(
        (acc, pm) => {
          acc[pm.status] = (acc[pm.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };

    return NextResponse.json({ projectMaterials, summary });
  } catch (error) {
    console.error('[Project Materials API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch project materials' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
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

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = projectMaterialCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const userId = (session.user as any).id;

    const projectMaterial = await prisma.projectMaterial.create({
      data: {
        projectId: params.id,
        materialId: data.materialId,
        quantity: data.quantity,
        location: data.location,
        specSection: data.specSection,
        budgetedCost: data.budgetedCost,
        notes: data.notes,
        createdById: userId,
      },
      include: {
        material: {
          include: {
            category: true,
            primaryVendor: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ projectMaterial }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'This material is already added to this project at the specified location' },
        { status: 409 },
      );
    }
    console.error('[Project Materials API] Error:', error);
    return NextResponse.json({ error: 'Failed to add material to project' }, { status: 500 });
  }
}
