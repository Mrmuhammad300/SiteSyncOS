import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { materialUpdateSchema } from '@/lib/validations/material';
import { materialDetailInclude } from '@/lib/materials/material-search';

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

    const material = await prisma.material.findUnique({
      where: { id: params.id },
      include: materialDetailInclude,
    });

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    return NextResponse.json({ material });
  } catch (error) {
    console.error('[Material Detail API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch material' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
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

    const existing = await prisma.material.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = materialUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Track price change in history
    if (data.unitCost !== undefined && existing.unitCost !== null) {
      const existingCost = Number(existing.unitCost);
      if (data.unitCost !== existingCost) {
        await prisma.materialPriceHistory.create({
          data: {
            materialId: params.id,
            unitCost: data.unitCost,
            effectiveDate: new Date(),
            source: 'Manual update',
            vendorId: data.primaryVendorId || (existing.primaryVendorId ?? undefined),
          },
        });
      }
    }

    const material = await prisma.material.update({
      where: { id: params.id },
      data: {
        ...data,
        priceDate: data.priceDate ? new Date(data.priceDate) : undefined,
        structuralProperties: data.structuralProperties || undefined,
        thermalProperties: data.thermalProperties || undefined,
        acousticProperties: data.acousticProperties || undefined,
        fireRatings: data.fireRatings || undefined,
        sustainabilityMetrics: data.sustainabilityMetrics || undefined,
      },
      include: materialDetailInclude,
    });

    return NextResponse.json({ material });
  } catch (error) {
    console.error('[Material Detail API] Error:', error);
    return NextResponse.json({ error: 'Failed to update material' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
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

    const role = (session.user as any).role;
    if (role !== 'Admin' && role !== 'SuperAdmin' && role !== 'ProjectManager') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const existing = await prisma.material.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    // Soft delete
    await prisma.material.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Material deactivated' });
  } catch (error) {
    console.error('[Material Detail API] Error:', error);
    return NextResponse.json({ error: 'Failed to delete material' }, { status: 500 });
  }
}
