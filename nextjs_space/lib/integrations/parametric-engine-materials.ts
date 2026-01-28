/**
 * Parametric Engine <-> Material Library Integration
 *
 * Synchronizes material definitions between the parametric engine
 * (which uses lightweight MaterialDefinition objects for rendering)
 * and the Material Library (which stores full procurement data).
 *
 * This module enables:
 * - Enriching parametric materials with real vendor/pricing data
 * - Suggesting library materials that match parametric categories
 * - Validating that parametric material selections have procurement paths
 */

import {
  MATERIAL_LIBRARY as parametricMaterials,
  type MaterialDefinition,
  type MaterialCategory,
} from '@/lib/parametric-engine';

/**
 * Map parametric engine categories to Material Library category names.
 */
const categoryMapping: Record<MaterialCategory, string[]> = {
  concrete: ['Concrete', 'Structural'],
  glass: ['Glazing'],
  metal: ['Steel', 'Structural'],
  wood: ['Structural'],
  brick: ['Facade'],
  stone: ['Facade'],
  composite: ['Facade', 'Building Envelope'],
  solar: ['Roofing'],
  roofing: ['Roofing'],
  insulation: ['Building Envelope'],
  cladding: ['Facade'],
};

export interface EnrichedMaterial {
  parametric: MaterialDefinition;
  libraryMatch?: {
    id: string;
    name: string;
    unitCost: number | null;
    unitOfMeasure: string;
    availabilityStatus: string;
    leadTimeDays: number | null;
    manufacturer: string | null;
    certifications: string[];
  };
  hasProcurementPath: boolean;
}

/**
 * Fetch library materials matching a parametric category.
 * Returns raw API results for a given parametric material category.
 */
async function fetchLibraryMaterialsByCategory(
  category: MaterialCategory,
): Promise<any[]> {
  const libraryCategories = categoryMapping[category];
  if (!libraryCategories || libraryCategories.length === 0) return [];

  const allResults: any[] = [];

  for (const catName of libraryCategories) {
    try {
      const params = new URLSearchParams();
      params.set('tags', catName.toLowerCase());
      params.set('pageSize', '10');
      params.set('sortBy', 'unitCost');
      params.set('sortOrder', 'asc');

      const res = await fetch(`/api/materials/library?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.materials?.length > 0) {
          allResults.push(...data.materials);
        }
      }
    } catch {
      // Graceful fallback - continue with other categories
    }
  }

  // Deduplicate by id
  const seen = new Set<string>();
  return allResults.filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

/**
 * Enrich a single parametric material with library data.
 * Attempts to find the best matching library material by name similarity
 * and category alignment.
 */
export async function enrichParametricMaterial(
  parametricId: string,
): Promise<EnrichedMaterial | null> {
  const parametric = parametricMaterials.find((m) => m.id === parametricId);
  if (!parametric) return null;

  const libraryResults = await fetchLibraryMaterialsByCategory(parametric.category);

  const result: EnrichedMaterial = {
    parametric,
    hasProcurementPath: false,
  };

  if (libraryResults.length > 0) {
    // Try exact name match first, then fall back to first result
    const nameMatch = libraryResults.find(
      (lib) =>
        lib.name.toLowerCase().includes(parametric.name.toLowerCase()) ||
        parametric.name.toLowerCase().includes(lib.name.toLowerCase()),
    );
    const best = nameMatch || libraryResults[0];

    result.libraryMatch = {
      id: best.id,
      name: best.name,
      unitCost: best.unitCost ? Number(best.unitCost) : null,
      unitOfMeasure: best.unitOfMeasure,
      availabilityStatus: best.availabilityStatus,
      leadTimeDays: best.leadTimeDays ?? null,
      manufacturer: best.manufacturer ?? null,
      certifications: best.certifications ?? [],
    };
    result.hasProcurementPath = best.availabilityStatus !== 'DISCONTINUED';
  }

  return result;
}

/**
 * Enrich all parametric materials used in a building configuration.
 * Takes the materials selection from BuildingConstraints and returns
 * enriched data for each.
 */
export async function enrichBuildingMaterials(
  materialSelections: Record<string, string>, // role -> parametricId
): Promise<Record<string, EnrichedMaterial>> {
  const results: Record<string, EnrichedMaterial> = {};

  const entries = Object.entries(materialSelections).filter(([, id]) => Boolean(id));

  // Fetch all in parallel
  const enriched = await Promise.all(
    entries.map(([role, id]) =>
      enrichParametricMaterial(id).then((result) => ({ role, result })),
    ),
  );

  for (const { role, result } of enriched) {
    if (result) {
      results[role] = result;
    }
  }

  return results;
}

/**
 * Validate that all materials in a building configuration have procurement paths.
 * Returns a list of materials that cannot be procured through the library.
 */
export async function validateMaterialProcurement(
  materialSelections: Record<string, string>,
): Promise<{
  valid: boolean;
  issues: Array<{
    role: string;
    parametricId: string;
    parametricName: string;
    issue: 'not-in-library' | 'discontinued' | 'unknown';
  }>;
}> {
  const enriched = await enrichBuildingMaterials(materialSelections);
  const issues: Array<{
    role: string;
    parametricId: string;
    parametricName: string;
    issue: 'not-in-library' | 'discontinued' | 'unknown';
  }> = [];

  for (const [role, id] of Object.entries(materialSelections)) {
    if (!id) continue;

    const material = enriched[role];
    if (!material) {
      const parametric = parametricMaterials.find((m) => m.id === id);
      issues.push({
        role,
        parametricId: id,
        parametricName: parametric?.name || id,
        issue: 'unknown',
      });
    } else if (!material.libraryMatch) {
      issues.push({
        role,
        parametricId: id,
        parametricName: material.parametric.name,
        issue: 'not-in-library',
      });
    } else if (!material.hasProcurementPath) {
      issues.push({
        role,
        parametricId: id,
        parametricName: material.parametric.name,
        issue: 'discontinued',
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Get suggested library materials for a parametric category.
 * Useful for the UI to show alternatives when selecting materials.
 */
export async function getSuggestedMaterials(
  category: MaterialCategory,
): Promise<
  Array<{
    id: string;
    name: string;
    unitCost: number | null;
    availabilityStatus: string;
    manufacturer: string | null;
  }>
> {
  const results = await fetchLibraryMaterialsByCategory(category);
  return results.map((m) => ({
    id: m.id,
    name: m.name,
    unitCost: m.unitCost ? Number(m.unitCost) : null,
    availabilityStatus: m.availabilityStatus,
    manufacturer: m.manufacturer ?? null,
  }));
}
