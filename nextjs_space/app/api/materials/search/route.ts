import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import {
  buildMaterialWhereClause,
  buildMaterialOrderBy,
  materialInclude,
  getPagination,
} from '@/lib/materials/material-search';

/**
 * GET /api/materials/search
 * Advanced faceted search with aggregations
 */
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

    // Run main query and facet aggregations in parallel
    const [materials, total, categories, manufacturers, availabilityFacets] = await Promise.all([
      prisma.material.findMany({
        where,
        orderBy,
        include: materialInclude,
        ...pagination,
      }),
      prisma.material.count({ where }),
      // Category facets
      prisma.materialCategory.findMany({
        where: { materials: { some: { isActive: true } } },
        select: {
          id: true,
          name: true,
          _count: { select: { materials: true } },
        },
        orderBy: { name: 'asc' },
      }),
      // Manufacturer facets
      prisma.material.groupBy({
        by: ['manufacturer'],
        where: { isActive: true, manufacturer: { not: null } },
        _count: { manufacturer: true },
        orderBy: { manufacturer: 'asc' },
      }),
      // Availability facets
      prisma.material.groupBy({
        by: ['availabilityStatus'],
        where: { isActive: true },
        _count: { availabilityStatus: true },
      }),
    ]);

    return NextResponse.json({
      materials,
      pagination: {
        page: params.page,
        pageSize: params.pageSize,
        total,
        totalPages: Math.ceil(total / params.pageSize),
      },
      facets: {
        categories: categories.map((c) => ({ id: c.id, name: c.name, count: c._count.materials })),
        manufacturers: manufacturers
          .filter((m) => m.manufacturer)
          .map((m) => ({ name: m.manufacturer!, count: m._count.manufacturer })),
        availability: availabilityFacets.map((a) => ({
          status: a.availabilityStatus,
          count: a._count.availabilityStatus,
        })),
      },
    });
  } catch (error) {
    console.error('[Materials Search API] Error:', error);
    return NextResponse.json({ error: 'Failed to search materials' }, { status: 500 });
  }
}
