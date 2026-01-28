import type { Prisma } from '@prisma/client';
import type { MaterialSearch } from '@/lib/validations/material';

/**
 * Build Prisma where clause from search parameters
 */
export function buildMaterialWhereClause(params: MaterialSearch): Prisma.MaterialWhereInput {
  const where: Prisma.MaterialWhereInput = { isActive: true };

  if (params.query) {
    where.OR = [
      { name: { contains: params.query, mode: 'insensitive' } },
      { description: { contains: params.query, mode: 'insensitive' } },
      { manufacturer: { contains: params.query, mode: 'insensitive' } },
      { sku: { contains: params.query, mode: 'insensitive' } },
      { modelNumber: { contains: params.query, mode: 'insensitive' } },
      { tags: { hasSome: [params.query.toLowerCase()] } },
    ];
  }

  if (params.categoryId) {
    where.categoryId = params.categoryId;
  }

  if (params.manufacturer) {
    where.manufacturer = { contains: params.manufacturer, mode: 'insensitive' };
  }

  if (params.csiDivision) {
    where.csiDivision = params.csiDivision;
  }

  if (params.availabilityStatus) {
    where.availabilityStatus = params.availabilityStatus;
  }

  if (params.minCost !== undefined || params.maxCost !== undefined) {
    where.unitCost = {};
    if (params.minCost !== undefined) {
      where.unitCost.gte = params.minCost;
    }
    if (params.maxCost !== undefined) {
      where.unitCost.lte = params.maxCost;
    }
  }

  if (params.tags && params.tags.length > 0) {
    where.tags = { hasSome: params.tags };
  }

  if (params.buildingCodeCompliant !== undefined) {
    where.buildingCodeCompliant = params.buildingCodeCompliant;
  }

  return where;
}

/**
 * Build Prisma orderBy from search parameters
 */
export function buildMaterialOrderBy(params: MaterialSearch): Prisma.MaterialOrderByWithRelationInput {
  const orderBy: Prisma.MaterialOrderByWithRelationInput = {};
  const field = params.sortBy || 'name';
  const direction = params.sortOrder || 'asc';

  switch (field) {
    case 'name':
      orderBy.name = direction;
      break;
    case 'unitCost':
      orderBy.unitCost = direction;
      break;
    case 'manufacturer':
      orderBy.manufacturer = direction;
      break;
    case 'leadTimeDays':
      orderBy.leadTimeDays = direction;
      break;
    case 'createdAt':
      orderBy.createdAt = direction;
      break;
    default:
      orderBy.name = 'asc';
  }

  return orderBy;
}

/**
 * Standard include for material queries
 */
export const materialInclude = {
  category: true,
  primaryVendor: {
    select: {
      id: true,
      name: true,
      companyName: true,
      vendorType: true,
      reliabilityScore: true,
      isPreferred: true,
    },
  },
  _count: {
    select: {
      projectMaterials: true,
      specifications: true,
      priceHistory: true,
    },
  },
} satisfies Prisma.MaterialInclude;

/**
 * Detailed include for single material view
 */
export const materialDetailInclude = {
  category: {
    include: {
      parent: true,
    },
  },
  primaryVendor: true,
  priceHistory: {
    orderBy: { effectiveDate: 'desc' as const },
    take: 10,
    include: { vendor: { select: { id: true, name: true } } },
  },
  specifications: {
    orderBy: { createdAt: 'desc' as const },
    take: 5,
  },
  _count: {
    select: {
      projectMaterials: true,
      specifications: true,
      priceHistory: true,
      substitutionsFrom: true,
      substitutionsTo: true,
    },
  },
} satisfies Prisma.MaterialInclude;

/**
 * Get distinct manufacturers from materials
 */
export function getManufacturerFilter(): Prisma.MaterialFindManyArgs {
  return {
    where: { isActive: true, manufacturer: { not: null } },
    distinct: ['manufacturer'],
    select: { manufacturer: true },
    orderBy: { manufacturer: 'asc' },
  };
}

/**
 * Calculate pagination
 */
export function getPagination(page: number, pageSize: number) {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
