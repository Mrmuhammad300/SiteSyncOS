import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { materialCreateSchema } from '@/lib/validations/material';
import {
  buildMaterialWhereClause,
  buildMaterialOrderBy,
  materialInclude,
  getPagination,
} from '@/lib/materials/material-search';

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const params = {
      query: searchParams.get('query') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      manufacturer: searchParams.get('manufacturer') || undefined,
      csiDivision: searchParams.get('csiDivision') || undefined,
      availabilityStatus: (searchParams.get('availabilityStatus') as any) || undefined,
      minCost: searchParams.get('minCost') ? Number(searchParams.get('minCost')) : undefined,
      maxCost: searchParams.get('maxCost') ? Number(searchParams.get('maxCost')) : undefined,
      tags: searchParams.get('tags') ? searchParams.get('tags')!.split(',') : undefined,
      buildingCodeCompliant: searchParams.get('buildingCodeCompliant') === 'true' ? true : undefined,
      sortBy: (searchParams.get('sortBy') as any) || 'name',
      sortOrder: (searchParams.get('sortOrder') as any) || 'asc',
      page: Number(searchParams.get('page')) || 1,
      pageSize: Number(searchParams.get('pageSize')) || 20,
    };

    const where = buildMaterialWhereClause(params);
    const orderBy = buildMaterialOrderBy(params);
    const pagination = getPagination(params.page, params.pageSize);

    const [materials, total] = await Promise.all([
      prisma.material.findMany({
        where,
        orderBy,
        include: materialInclude,
        ...pagination,
      }),
      prisma.material.count({ where }),
    ]);

    return NextResponse.json({
      materials,
      pagination: {
        page: params.page,
        pageSize: params.pageSize,
        total,
        totalPages: Math.ceil(total / params.pageSize),
      },
    });
  } catch (error) {
    console.error('[Materials Library API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const parsed = materialCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const userId = (session.user as any).id;

    const material = await prisma.material.create({
      data: {
        name: data.name,
        description: data.description,
        manufacturer: data.manufacturer,
        productLine: data.productLine,
        modelNumber: data.modelNumber,
        sku: data.sku,
        categoryId: data.categoryId,
        csiDivision: data.csiDivision,
        csiSection: data.csiSection,
        unitCost: data.unitCost,
        unitOfMeasure: data.unitOfMeasure,
        currency: data.currency,
        priceDate: data.priceDate ? new Date(data.priceDate) : undefined,
        priceSource: data.priceSource,
        leadTimeDays: data.leadTimeDays,
        availabilityStatus: data.availabilityStatus,
        minimumOrderQuantity: data.minimumOrderQuantity,
        structuralProperties: data.structuralProperties || undefined,
        thermalProperties: data.thermalProperties || undefined,
        acousticProperties: data.acousticProperties || undefined,
        fireRatings: data.fireRatings || undefined,
        sustainabilityMetrics: data.sustainabilityMetrics || undefined,
        buildingCodeCompliant: data.buildingCodeCompliant,
        certifications: data.certifications,
        approvalRegions: data.approvalRegions,
        dataSheetUrl: data.dataSheetUrl || undefined,
        installationGuideUrl: data.installationGuideUrl || undefined,
        warrantyInfo: data.warrantyInfo,
        expectedLifespan: data.expectedLifespan,
        maintenanceNotes: data.maintenanceNotes,
        primaryVendorId: data.primaryVendorId || undefined,
        alternativeVendorIds: data.alternativeVendorIds,
        tags: data.tags,
        imageUrl: data.imageUrl || undefined,
        createdById: userId,
      },
      include: materialInclude,
    });

    if (data.unitCost) {
      await prisma.materialPriceHistory.create({
        data: {
          materialId: material.id,
          unitCost: data.unitCost,
          effectiveDate: new Date(),
          source: data.priceSource || 'Initial entry',
          vendorId: data.primaryVendorId || undefined,
        },
      });
    }

    return NextResponse.json({ material }, { status: 201 });
  } catch (error) {
    console.error('[Materials Library API] Error:', error);
    return NextResponse.json({ error: 'Failed to create material' }, { status: 500 });
  }
}
