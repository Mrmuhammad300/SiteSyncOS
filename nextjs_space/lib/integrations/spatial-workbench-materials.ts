/**
 * Spatial Workbench <-> Material Library Integration
 *
 * Bridges the parametric engine material definitions with the database-backed
 * Material Library, enabling parametric models to reference real materials
 * with live pricing, availability, and vendor data.
 */

import { MATERIAL_LIBRARY as parametricMaterials } from '@/lib/parametric-engine';

/**
 * Map parametric engine material IDs to Material Library search criteria
 */
const parametricToLibraryMapping: Record<string, { category: string; tags: string[] }> = {
  'concrete-standard': { category: 'Concrete', tags: ['concrete', 'structural'] },
  'concrete-hpc': { category: 'Concrete', tags: ['concrete', 'high-performance'] },
  'steel-structural': { category: 'Steel', tags: ['steel', 'structural'] },
  'steel-stainless': { category: 'Steel', tags: ['steel', 'stainless'] },
  'glass-clear': { category: 'Glazing', tags: ['glass', 'glazing'] },
  'glass-low-e': { category: 'Glazing', tags: ['glass', 'low-e', 'energy-efficient'] },
  'glass-smart': { category: 'Glazing', tags: ['glass', 'smart'] },
  'brick-clay': { category: 'Facade', tags: ['brick', 'masonry'] },
  'stone-granite': { category: 'Facade', tags: ['stone', 'granite'] },
  'wood-clt': { category: 'Structural', tags: ['wood', 'clt'] },
  'membrane-tpo': { category: 'Roofing', tags: ['roofing', 'tpo'] },
  'insulation-mineral': { category: 'Building Envelope', tags: ['insulation'] },
  'panel-fiber-cement': { category: 'Facade', tags: ['fiber-cement', 'siding'] },
};

export interface MaterialLibraryMatch {
  parametricId: string;
  parametricName: string;
  libraryMaterialId?: string;
  libraryMaterialName?: string;
  unitCost?: number;
  availabilityStatus?: string;
  leadTimeDays?: number;
  matched: boolean;
}

/**
 * Look up real materials from the library that match parametric engine selections.
 * Returns enriched material data with live pricing when available.
 */
export async function resolveParametricMaterials(
  selectedMaterialIds: string[],
): Promise<MaterialLibraryMatch[]> {
  const results: MaterialLibraryMatch[] = [];

  for (const parametricId of selectedMaterialIds) {
    const parametric = parametricMaterials.find((m) => m.id === parametricId);
    if (!parametric) continue;

    const mapping = parametricToLibraryMapping[parametricId];

    const match: MaterialLibraryMatch = {
      parametricId,
      parametricName: parametric.name,
      matched: false,
    };

    if (mapping) {
      try {
        const params = new URLSearchParams();
        if (mapping.tags.length > 0) {
          params.set('tags', mapping.tags.join(','));
        }
        params.set('pageSize', '1');
        params.set('sortBy', 'unitCost');
        params.set('sortOrder', 'asc');

        const res = await fetch(`/api/materials/library?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (data.materials?.length > 0) {
            const lib = data.materials[0];
            match.libraryMaterialId = lib.id;
            match.libraryMaterialName = lib.name;
            match.unitCost = lib.unitCost ? Number(lib.unitCost) : undefined;
            match.availabilityStatus = lib.availabilityStatus;
            match.leadTimeDays = lib.leadTimeDays;
            match.matched = true;
          }
        }
      } catch {
        // Graceful fallback - use parametric data only
      }
    }

    results.push(match);
  }

  return results;
}

/**
 * Generate a bill of materials from a parametric model output,
 * cross-referencing the Material Library for real pricing.
 */
export interface BillOfMaterialsItem {
  name: string;
  parametricId: string;
  libraryId?: string;
  category: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  source: 'library' | 'parametric-estimate';
}

export async function generateBillOfMaterials(
  model: {
    elements: Array<{
      type: string;
      materialId?: string;
      dimensions?: { width: number; height: number; depth: number };
    }>;
    totalArea: number;
  },
  selectedMaterials: Record<string, string>, // category -> materialId
): Promise<BillOfMaterialsItem[]> {
  const bom: BillOfMaterialsItem[] = [];

  // Resolve library matches for selected materials
  const materialIds = Object.values(selectedMaterials).filter(Boolean);
  const matches = await resolveParametricMaterials(materialIds);
  const matchMap = new Map(matches.map((m) => [m.parametricId, m]));

  // Structure
  const structureId = selectedMaterials.structure;
  const structureMatch = structureId ? matchMap.get(structureId) : null;
  if (structureId) {
    const parametric = parametricMaterials.find((m) => m.id === structureId);
    bom.push({
      name: structureMatch?.libraryMaterialName || parametric?.name || 'Structural Material',
      parametricId: structureId,
      libraryId: structureMatch?.libraryMaterialId,
      category: 'Structural',
      quantity: Math.ceil(model.totalArea * 0.15), // ~15% of total area
      unit: parametric?.id.includes('steel') ? 'TON' : 'CY',
      unitCost: structureMatch?.unitCost || 150,
      totalCost: 0,
      source: structureMatch?.matched ? 'library' : 'parametric-estimate',
    });
    bom[bom.length - 1].totalCost = bom[bom.length - 1].quantity * bom[bom.length - 1].unitCost;
  }

  // Facade
  const facadeId = selectedMaterials.facade;
  const facadeMatch = facadeId ? matchMap.get(facadeId) : null;
  if (facadeId) {
    const parametric = parametricMaterials.find((m) => m.id === facadeId);
    bom.push({
      name: facadeMatch?.libraryMaterialName || parametric?.name || 'Facade Material',
      parametricId: facadeId,
      libraryId: facadeMatch?.libraryMaterialId,
      category: 'Facade',
      quantity: Math.ceil(model.totalArea * 0.4),
      unit: 'SF',
      unitCost: facadeMatch?.unitCost || (parametric?.id.includes('glass') ? 28 : 2),
      totalCost: 0,
      source: facadeMatch?.matched ? 'library' : 'parametric-estimate',
    });
    bom[bom.length - 1].totalCost = bom[bom.length - 1].quantity * bom[bom.length - 1].unitCost;
  }

  // Roof
  const roofId = selectedMaterials.roof;
  const roofMatch = roofId ? matchMap.get(roofId) : null;
  if (roofId) {
    const parametric = parametricMaterials.find((m) => m.id === roofId);
    const footprint = model.totalArea / (model.elements.filter((e) => e.type === 'floor-slab').length || 1);
    bom.push({
      name: roofMatch?.libraryMaterialName || parametric?.name || 'Roofing Material',
      parametricId: roofId,
      libraryId: roofMatch?.libraryMaterialId,
      category: 'Roofing',
      quantity: Math.ceil(footprint * 1.1), // 10% waste
      unit: 'SF',
      unitCost: roofMatch?.unitCost || 1,
      totalCost: 0,
      source: roofMatch?.matched ? 'library' : 'parametric-estimate',
    });
    bom[bom.length - 1].totalCost = bom[bom.length - 1].quantity * bom[bom.length - 1].unitCost;
  }

  return bom;
}
