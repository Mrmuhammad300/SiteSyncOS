/**
 * Unified Cost Analysis Service
 *
 * Orchestrates data from 1build (project estimation) and Gordian RSMeans
 * (cost database) to provide comprehensive construction cost analysis,
 * benchmarking, and cost optimization recommendations.
 */

import { oneBuildClient, type OneBuildEstimateRequest, type OneBuildEstimate } from './onebuild-client';
import { gordianClient, type GordianUnitCostLine, type GordianModelEstimate, type GordianCostFactor } from './gordian-client';

// ─── Unified Types ───────────────────────────────────────────────

export interface CostAnalysisRequest {
  projectName: string;
  projectType: 'residential' | 'commercial' | 'industrial' | 'mixed-use' | 'renovation';
  location: {
    address?: string;
    city?: string;
    state?: string;
    zipCode: string;
  };
  squareFootage: number;
  stories?: number;
  description?: string;
  includeRSMeansBenchmark?: boolean;
  includeLifecycleAnalysis?: boolean;
}

export interface CostAnalysisResult {
  id?: string;
  projectName: string;
  projectType: string;
  location: {
    zipCode: string;
    city?: string;
    state?: string;
  };
  squareFootage: number;

  // 1build estimate
  oneBuildEstimate?: {
    estimateId: string;
    totalCost: number;
    costPerSqFt: number;
    status: string;
    lineItems: {
      description: string;
      category: string;
      quantity: number;
      unit: string;
      unitCost: number;
      totalCost: number;
      laborCost?: number;
      materialCost?: number;
      equipmentCost?: number;
    }[];
    breakdown: {
      category: string;
      totalCost: number;
      percentage: number;
    }[];
  };

  // RSMeans benchmark
  rsMeansBenchmark?: {
    nationalAvgCostPerSqFt: number;
    localizedCostPerSqFt: number;
    locationFactor: number;
    costRange: {
      low: number;
      median: number;
      high: number;
    };
    materialFactor: number;
    laborFactor: number;
    equipmentFactor: number;
  };

  // Comparison analysis
  comparison?: {
    estimateVsBenchmarkDelta: number;
    estimateVsBenchmarkPercent: number;
    isAboveBenchmark: boolean;
    confidenceLevel: 'high' | 'medium' | 'low';
    recommendations: string[];
  };

  // Summary totals
  summary: {
    estimatedTotalCost: number;
    costPerSqFt: number;
    laborTotal: number;
    materialTotal: number;
    equipmentTotal: number;
    contingency: number;
    grandTotal: number;
  };

  createdAt: string;
}

export interface CostItemSearchResult {
  source: '1build' | 'rsmeans';
  id: string;
  description: string;
  unit: string;
  unitCost: number;
  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  category: string;
  divisionCode?: string;
}

export interface LocationCostFactors {
  zipCode: string;
  location: string;
  oneBuildFactors?: {
    laborMultiplier: number;
    materialMultiplier: number;
    equipmentMultiplier: number;
    overallMultiplier: number;
  };
  gordianFactors?: {
    materialFactor: number;
    laborFactor: number;
    equipmentFactor: number;
    totalFactor: number;
  };
  averageFactors: {
    labor: number;
    material: number;
    equipment: number;
    overall: number;
  };
}

// ─── Service Methods ─────────────────────────────────────────────

/**
 * Run a comprehensive cost analysis combining both data sources
 */
export async function runCostAnalysis(request: CostAnalysisRequest): Promise<CostAnalysisResult> {
  const results: Partial<CostAnalysisResult> = {
    projectName: request.projectName,
    projectType: request.projectType,
    location: {
      zipCode: request.location.zipCode,
      city: request.location.city,
      state: request.location.state,
    },
    squareFootage: request.squareFootage,
    createdAt: new Date().toISOString(),
  };

  // Run 1build estimate and RSMeans benchmark in parallel
  const promises: Promise<void>[] = [];

  // 1build estimate
  promises.push(
    (async () => {
      try {
        const estimateRequest: OneBuildEstimateRequest = {
          projectName: request.projectName,
          projectType: request.projectType,
          location: request.location,
          squareFootage: request.squareFootage,
          stories: request.stories,
          description: request.description,
        };

        const estimate = await oneBuildClient.createEstimate(estimateRequest);
        const summary = await oneBuildClient.getEstimateSummary(estimate.id);

        results.oneBuildEstimate = {
          estimateId: estimate.id,
          totalCost: estimate.totalCost,
          costPerSqFt: estimate.costPerSqFt,
          status: estimate.status,
          lineItems: estimate.lineItems.map((li) => ({
            description: li.description,
            category: li.category,
            quantity: li.quantity,
            unit: li.unit,
            unitCost: li.unitCost,
            totalCost: li.totalCost,
            laborCost: li.laborCost,
            materialCost: li.materialCost,
            equipmentCost: li.equipmentCost,
          })),
          breakdown: summary.breakdown.map((b) => ({
            category: b.category,
            totalCost: b.totalCost,
            percentage: b.percentage,
          })),
        };
      } catch (error) {
        console.error('1build estimate failed:', error);
      }
    })()
  );

  // RSMeans benchmark
  if (request.includeRSMeansBenchmark !== false) {
    promises.push(
      (async () => {
        try {
          const zipPrefix = request.location.zipCode.substring(0, 3);
          const [costFactors, locations] = await Promise.all([
            gordianClient.getUnitCostFactors({ locationId: zipPrefix }).catch(() => [] as GordianCostFactor[]),
            gordianClient.searchLocations({ searchTerm: request.location.zipCode }).catch(() => []),
          ]);

          const locationFactor = costFactors.length > 0 ? costFactors[0] : null;

          // National average baseline cost per sq ft by project type
          const nationalBaselines: Record<string, { low: number; median: number; high: number }> = {
            residential: { low: 120, median: 175, high: 280 },
            commercial: { low: 150, median: 225, high: 400 },
            industrial: { low: 80, median: 140, high: 250 },
            'mixed-use': { low: 140, median: 210, high: 350 },
            renovation: { low: 100, median: 180, high: 320 },
          };

          const baseline = nationalBaselines[request.projectType] || nationalBaselines.commercial;
          const factor = locationFactor?.totalFactor ?? 1.0;

          results.rsMeansBenchmark = {
            nationalAvgCostPerSqFt: baseline.median,
            localizedCostPerSqFt: Math.round(baseline.median * factor * 100) / 100,
            locationFactor: factor,
            costRange: {
              low: Math.round(baseline.low * factor * 100) / 100,
              median: Math.round(baseline.median * factor * 100) / 100,
              high: Math.round(baseline.high * factor * 100) / 100,
            },
            materialFactor: locationFactor?.materialFactor ?? 1.0,
            laborFactor: locationFactor?.laborFactor ?? 1.0,
            equipmentFactor: locationFactor?.equipmentFactor ?? 1.0,
          };
        } catch (error) {
          console.error('RSMeans benchmark failed:', error);
        }
      })()
    );
  }

  await Promise.all(promises);

  // Build comparison analysis
  if (results.oneBuildEstimate && results.rsMeansBenchmark) {
    const estimateCostPerSqFt = results.oneBuildEstimate.costPerSqFt;
    const benchmarkCostPerSqFt = results.rsMeansBenchmark.localizedCostPerSqFt;
    const delta = estimateCostPerSqFt - benchmarkCostPerSqFt;
    const percentDiff = (delta / benchmarkCostPerSqFt) * 100;

    const recommendations: string[] = [];

    if (percentDiff > 15) {
      recommendations.push('Estimate is significantly above RSMeans benchmark. Review line items for potential cost reduction.');
      recommendations.push('Consider value engineering on highest-cost categories.');
      recommendations.push('Request competitive bids from additional subcontractors.');
    } else if (percentDiff > 5) {
      recommendations.push('Estimate is moderately above benchmark. Some line items may have room for optimization.');
      recommendations.push('Review material specifications for cost-effective alternatives.');
    } else if (percentDiff < -10) {
      recommendations.push('Estimate is below benchmark. Verify all scope items are included.');
      recommendations.push('Ensure adequate contingency is accounted for.');
      recommendations.push('Review labor rates against local prevailing wages.');
    } else {
      recommendations.push('Estimate aligns well with RSMeans benchmark data.');
      recommendations.push('Consider lifecycle cost analysis for long-term value optimization.');
    }

    results.comparison = {
      estimateVsBenchmarkDelta: Math.round(delta * 100) / 100,
      estimateVsBenchmarkPercent: Math.round(percentDiff * 100) / 100,
      isAboveBenchmark: delta > 0,
      confidenceLevel: results.rsMeansBenchmark.locationFactor !== 1.0 ? 'high' : 'medium',
      recommendations,
    };
  }

  // Build summary
  const estimateTotal = results.oneBuildEstimate?.totalCost ?? 0;
  const contingencyRate = 0.05;
  const contingency = Math.round(estimateTotal * contingencyRate);

  results.summary = {
    estimatedTotalCost: estimateTotal,
    costPerSqFt: estimateTotal > 0 ? Math.round((estimateTotal / request.squareFootage) * 100) / 100 : 0,
    laborTotal: results.oneBuildEstimate?.lineItems.reduce((sum, li) => sum + (li.laborCost ?? 0), 0) ?? 0,
    materialTotal: results.oneBuildEstimate?.lineItems.reduce((sum, li) => sum + (li.materialCost ?? 0), 0) ?? 0,
    equipmentTotal: results.oneBuildEstimate?.lineItems.reduce((sum, li) => sum + (li.equipmentCost ?? 0), 0) ?? 0,
    contingency,
    grandTotal: estimateTotal + contingency,
  };

  return results as CostAnalysisResult;
}

/**
 * Search for cost items across both 1build and RSMeans databases
 */
export async function searchCostItems(params: {
  query: string;
  zipCode?: string;
  source?: '1build' | 'rsmeans' | 'both';
  limit?: number;
}): Promise<CostItemSearchResult[]> {
  const { query, zipCode, source = 'both', limit = 25 } = params;
  const results: CostItemSearchResult[] = [];

  const promises: Promise<void>[] = [];

  if (source === '1build' || source === 'both') {
    promises.push(
      (async () => {
        try {
          const response = await oneBuildClient.searchCostItems({
            query,
            zipCode,
            limit,
          });
          results.push(
            ...response.data.map((item) => ({
              source: '1build' as const,
              id: item.id,
              description: item.description,
              unit: item.unit,
              unitCost: item.unitCost,
              laborCost: item.laborCost,
              materialCost: item.materialCost,
              equipmentCost: item.equipmentCost,
              category: item.category,
              divisionCode: item.csiDivision,
            }))
          );
        } catch (error) {
          console.error('1build search failed:', error);
        }
      })()
    );
  }

  if (source === 'rsmeans' || source === 'both') {
    promises.push(
      (async () => {
        try {
          const catalogs = await gordianClient.listUnitCatalogs();
          if (catalogs.length > 0) {
            const response = await gordianClient.searchUnitCostLines(catalogs[0].id, {
              searchTerm: query,
              limit,
            });
            results.push(
              ...response.data.map((item) => ({
                source: 'rsmeans' as const,
                id: item.id,
                description: item.description,
                unit: item.unit,
                unitCost: item.totalCost,
                laborCost: item.laborCost,
                materialCost: item.materialCost,
                equipmentCost: item.equipmentCost,
                category: item.divisionCode,
                divisionCode: item.divisionCode,
              }))
            );
          }
        } catch (error) {
          console.error('RSMeans search failed:', error);
        }
      })()
    );
  }

  await Promise.all(promises);
  return results;
}

/**
 * Get location-based cost factors from both services
 */
export async function getLocationCostFactors(zipCode: string): Promise<LocationCostFactors> {
  const result: LocationCostFactors = {
    zipCode,
    location: '',
    averageFactors: { labor: 1, material: 1, equipment: 1, overall: 1 },
  };

  const promises: Promise<void>[] = [];

  // 1build regional factors
  promises.push(
    (async () => {
      try {
        const factors = await oneBuildClient.getRegionalCostFactors(zipCode);
        result.location = factors.region;
        result.oneBuildFactors = {
          laborMultiplier: factors.laborMultiplier,
          materialMultiplier: factors.materialMultiplier,
          equipmentMultiplier: factors.equipmentMultiplier,
          overallMultiplier: factors.overallMultiplier,
        };
      } catch (error) {
        console.error('1build cost factors failed:', error);
      }
    })()
  );

  // Gordian RSMeans factors
  promises.push(
    (async () => {
      try {
        const zipPrefix = zipCode.substring(0, 3);
        const factors = await gordianClient.getUnitCostFactors({ locationId: zipPrefix });
        if (factors.length > 0) {
          const f = factors[0];
          result.location = result.location || f.locationName;
          result.gordianFactors = {
            materialFactor: f.materialFactor,
            laborFactor: f.laborFactor,
            equipmentFactor: f.equipmentFactor,
            totalFactor: f.totalFactor,
          };
        }
      } catch (error) {
        console.error('Gordian cost factors failed:', error);
      }
    })()
  );

  await Promise.all(promises);

  // Calculate averages from available sources
  const laborValues: number[] = [];
  const materialValues: number[] = [];
  const equipmentValues: number[] = [];

  if (result.oneBuildFactors) {
    laborValues.push(result.oneBuildFactors.laborMultiplier);
    materialValues.push(result.oneBuildFactors.materialMultiplier);
    equipmentValues.push(result.oneBuildFactors.equipmentMultiplier);
  }
  if (result.gordianFactors) {
    laborValues.push(result.gordianFactors.laborFactor);
    materialValues.push(result.gordianFactors.materialFactor);
    equipmentValues.push(result.gordianFactors.equipmentFactor);
  }

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 1);
  result.averageFactors = {
    labor: Math.round(avg(laborValues) * 1000) / 1000,
    material: Math.round(avg(materialValues) * 1000) / 1000,
    equipment: Math.round(avg(equipmentValues) * 1000) / 1000,
    overall: Math.round(avg([...laborValues, ...materialValues, ...equipmentValues]) * 1000) / 1000,
  };

  return result;
}

/**
 * Generate a square foot cost model estimate via Gordian RSMeans
 */
export async function generateSquareFootEstimate(params: {
  modelId: string;
  wallCode: string;
  area: number;
  perimeter?: number;
  stories?: number;
  storyHeight?: number;
  locationId?: string;
  includeBasement?: boolean;
  contractorFees?: number;
  architecturalFees?: number;
}): Promise<GordianModelEstimate> {
  return gordianClient.getSquareFootEstimate(params.modelId, params.wallCode, {
    area: params.area,
    perimeter: params.perimeter,
    stories: params.stories,
    storyHeight: params.storyHeight,
    locationId: params.locationId,
    includeBasement: params.includeBasement,
    contractorFees: params.contractorFees,
    architecturalFees: params.architecturalFees,
  });
}

/**
 * Get CSI division cost breakdown from RSMeans
 */
export async function getDivisionBreakdown(catalogId?: string): Promise<{
  divisions: { code: string; name: string; description?: string }[];
  catalogId: string;
}> {
  const catalogs = catalogId
    ? [{ id: catalogId }]
    : await gordianClient.listUnitCatalogs();

  if (catalogs.length === 0) {
    return { divisions: [], catalogId: '' };
  }

  const catId = catalogs[0].id;
  const divisions = await gordianClient.getUnitDivisions(catId);

  return {
    catalogId: catId,
    divisions: divisions.map((d) => ({
      code: d.code,
      name: d.name,
      description: d.description,
    })),
  };
}

export const costAnalysisService = {
  runCostAnalysis,
  searchCostItems,
  getLocationCostFactors,
  generateSquareFootEstimate,
  getDivisionBreakdown,
};
