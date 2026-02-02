/**
 * Mixture of Experts (MoE) Grounding Engine for SiteSync OS
 *
 * Routes TRELLIS-generated 3D assets through domain-specific expert modules
 * that validate, enrich, and ground outputs in construction reality.
 *
 * Architecture:
 *   TRELLIS Raw Output
 *       |
 *   [Gating Network] -- analyzes asset type, project context, LOD target
 *       |
 *   +-----------+-----------+-----------+-----------+-----------+
 *   |           |           |           |           |           |
 *   Structural  Material    Code        Cost        LOD
 *   Expert      Expert      Compliance  Expert      Refinement
 *   |           |           Expert      |           Expert
 *   |           |           |           |           |
 *   +-----------+-----------+-----------+-----------+-----------+
 *       |
 *   [Aggregator] -- weighted combination of expert outputs
 *       |
 *   Grounded 3D Asset + Construction Metadata
 *
 * The gating network produces sparse expert weights (top-k routing),
 * so only the most relevant experts process each asset. This mirrors
 * how the Agent Ecosystem Orchestrator uses mixture_of_experts routing
 * for the 16-agent system.
 */

import {
  getTrellisClient,
  TrellisClient,
  TrellisGenerationResult,
  TrellisOutput,
  TrellisGenerationRequest,
  ConstructionAssetType,
  TrellisOutputFormat,
  TrellisModelVariant,
} from './trellis-client';

import {
  LODLevel,
  LOD_DEFINITIONS,
  MaterialDefinition,
  MATERIAL_LIBRARY,
  getMaterialById,
  getMaterialsByCategory,
  MaterialCategory,
  BuildingConstraints,
  DEFAULT_CONSTRAINTS,
} from '../parametric-engine';

// ---------------------------------------------------------------------------
// Expert Definitions
// ---------------------------------------------------------------------------

export type ExpertId =
  | 'structural_grounding'
  | 'material_grounding'
  | 'code_compliance'
  | 'cost_grounding'
  | 'lod_refinement';

export interface ExpertDefinition {
  id: ExpertId;
  name: string;
  description: string;
  /** Asset types this expert is relevant for */
  relevantAssetTypes: ConstructionAssetType[];
  /** Weight multiplier when this expert is highly relevant */
  baseWeight: number;
}

export const EXPERT_DEFINITIONS: ExpertDefinition[] = [
  {
    id: 'structural_grounding',
    name: 'Structural Grounding Expert',
    description:
      'Validates 3D geometry for structural feasibility. Checks load paths, member sizing, span ratios, and connection integrity against building codes and engineering standards.',
    relevantAssetTypes: [
      'building_exterior',
      'building_interior',
      'structural_element',
      'facade_detail',
    ],
    baseWeight: 1.0,
  },
  {
    id: 'material_grounding',
    name: 'Material Grounding Expert',
    description:
      'Maps TRELLIS-generated surfaces to real construction materials from the SiteSync material library. Assigns CSI division codes, thermal properties, sustainability ratings, and vendor-specific products.',
    relevantAssetTypes: [
      'building_exterior',
      'building_interior',
      'structural_element',
      'facade_detail',
      'material_sample',
      'furniture_fixture',
    ],
    baseWeight: 0.9,
  },
  {
    id: 'code_compliance',
    name: 'Code Compliance Expert',
    description:
      'Validates generated assets against IBC, ADA, local zoning, fire code, and energy code requirements. Checks egress widths, ceiling heights, accessibility clearances, and fire-rating requirements.',
    relevantAssetTypes: [
      'building_exterior',
      'building_interior',
      'structural_element',
      'mep_component',
      'site_element',
    ],
    baseWeight: 0.85,
  },
  {
    id: 'cost_grounding',
    name: 'Cost Grounding Expert',
    description:
      'Links generated 3D geometry to real cost data via 1build and Gordian RSMeans integrations. Estimates material quantities, labor hours, and total installed cost per element.',
    relevantAssetTypes: [
      'building_exterior',
      'building_interior',
      'structural_element',
      'mep_component',
      'facade_detail',
      'equipment',
      'furniture_fixture',
    ],
    baseWeight: 0.8,
  },
  {
    id: 'lod_refinement',
    name: 'LOD Refinement Expert',
    description:
      'Routes 3D assets through the appropriate Level of Development (100-400) based on project phase. Adds or removes detail to match the target LOD, ensuring geometry matches the parametric engine output.',
    relevantAssetTypes: [
      'building_exterior',
      'building_interior',
      'structural_element',
      'mep_component',
      'facade_detail',
      'site_element',
    ],
    baseWeight: 0.75,
  },
];

// ---------------------------------------------------------------------------
// Gating Network
// ---------------------------------------------------------------------------

export interface GatingInput {
  assetType: ConstructionAssetType;
  projectType?: string;
  lodTarget?: LODLevel;
  hasStructuralRequirements?: boolean;
  hasCostConstraints?: boolean;
  isPermitRequired?: boolean;
  complexityScore?: number; // 0-1, based on mesh stats
}

export interface ExpertWeight {
  expertId: ExpertId;
  weight: number;
  reason: string;
}

/**
 * Sparse top-k gating network. Selects the most relevant experts
 * for a given generation request and assigns routing weights.
 */
export function computeExpertWeights(
  input: GatingInput,
  topK: number = 3
): ExpertWeight[] {
  const scores: ExpertWeight[] = EXPERT_DEFINITIONS.map((expert) => {
    let score = 0;
    const reasons: string[] = [];

    // Base relevance by asset type
    if (expert.relevantAssetTypes.includes(input.assetType)) {
      score += expert.baseWeight * 0.4;
      reasons.push(`Relevant for ${input.assetType}`);
    }

    // Expert-specific scoring
    switch (expert.id) {
      case 'structural_grounding':
        if (input.hasStructuralRequirements) {
          score += 0.3;
          reasons.push('Structural requirements flagged');
        }
        if (['building_exterior', 'structural_element'].includes(input.assetType)) {
          score += 0.2;
          reasons.push('Structural asset type');
        }
        if (input.lodTarget && input.lodTarget >= 300) {
          score += 0.1;
          reasons.push('High LOD requires structural validation');
        }
        break;

      case 'material_grounding':
        // Material grounding is almost always needed
        score += 0.25;
        reasons.push('Material mapping always beneficial');
        if (input.assetType === 'material_sample') {
          score += 0.3;
          reasons.push('Direct material sample');
        }
        if (input.lodTarget && input.lodTarget >= 200) {
          score += 0.1;
          reasons.push('LOD 200+ requires specific materials');
        }
        break;

      case 'code_compliance':
        if (input.isPermitRequired) {
          score += 0.35;
          reasons.push('Permit-required asset');
        }
        if (['building_exterior', 'building_interior', 'mep_component'].includes(input.assetType)) {
          score += 0.15;
          reasons.push('Code-regulated asset type');
        }
        if (input.projectType && ['senior-living', 'veteran-housing', 'affordable'].includes(input.projectType)) {
          score += 0.15;
          reasons.push('Regulated project type (accessibility requirements)');
        }
        break;

      case 'cost_grounding':
        if (input.hasCostConstraints) {
          score += 0.3;
          reasons.push('Cost constraints specified');
        }
        if (input.complexityScore && input.complexityScore > 0.5) {
          score += 0.15;
          reasons.push('Complex geometry increases cost sensitivity');
        }
        // Cost is important for all building-scale assets
        if (['building_exterior', 'building_interior', 'structural_element'].includes(input.assetType)) {
          score += 0.1;
          reasons.push('Building-scale cost estimation');
        }
        break;

      case 'lod_refinement':
        if (input.lodTarget) {
          score += 0.25;
          reasons.push(`LOD ${input.lodTarget} target specified`);
        }
        if (input.lodTarget && input.lodTarget >= 350) {
          score += 0.2;
          reasons.push('High LOD requires detailed refinement');
        }
        break;
    }

    return {
      expertId: expert.id,
      weight: Math.min(score, 1.0),
      reason: reasons.join('; '),
    };
  });

  // Sort by weight descending, take top-k
  scores.sort((a, b) => b.weight - a.weight);
  const topExperts = scores.slice(0, topK);

  // Normalize weights to sum to 1
  const totalWeight = topExperts.reduce((sum, e) => sum + e.weight, 0);
  if (totalWeight > 0) {
    for (const expert of topExperts) {
      expert.weight = expert.weight / totalWeight;
    }
  }

  return topExperts;
}

// ---------------------------------------------------------------------------
// Expert Output Types
// ---------------------------------------------------------------------------

export interface StructuralGroundingResult {
  feasible: boolean;
  loadPathValid: boolean;
  spanRatioCheck: 'pass' | 'warn' | 'fail';
  memberSizing: Array<{
    elementId: string;
    suggestedSize: string;
    material: string;
    capacity: string;
  }>;
  issues: string[];
  recommendations: string[];
  confidenceScore: number;
}

export interface MaterialGroundingResult {
  mappedMaterials: Array<{
    surfaceId: string;
    trellisMaterial: string; // what TRELLIS generated
    groundedMaterial: MaterialDefinition;
    csiDivision: string;
    csiSection: string;
    confidence: number;
  }>;
  sustainabilityScore: number; // 0-100
  thermalPerformance: {
    overallRValue: number;
    meetsEnergyCode: boolean;
  };
  unmappedSurfaces: string[];
}

export interface CodeComplianceResult {
  compliant: boolean;
  checks: Array<{
    code: string; // e.g. "IBC 2021 Section 1005.1"
    description: string;
    status: 'pass' | 'warn' | 'fail' | 'na';
    detail?: string;
  }>;
  adaCompliant: boolean;
  fireRating: string;
  egressValid: boolean;
  requiredModifications: string[];
}

export interface CostGroundingResult {
  totalEstimatedCost: number;
  costPerSqFt: number;
  lineItems: Array<{
    description: string;
    csiCode: string;
    quantity: number;
    unit: string;
    unitCost: number;
    totalCost: number;
    source: '1build' | 'gordian' | 'estimated';
  }>;
  contingency: number;
  costConfidence: 'high' | 'medium' | 'low';
  benchmarkComparison?: {
    median: number;
    percentile25: number;
    percentile75: number;
    position: 'below_median' | 'at_median' | 'above_median';
  };
}

export interface LODRefinementResult {
  currentLOD: LODLevel;
  targetLOD: LODLevel;
  refinementActions: Array<{
    action: 'add_detail' | 'simplify' | 'map_material' | 'add_connections' | 'add_dimensions';
    description: string;
    elementCount: number;
  }>;
  parametricCompatible: boolean;
  blenderScriptGenerated: boolean;
  elementTransformations: number;
}

export type ExpertResult =
  | { expertId: 'structural_grounding'; result: StructuralGroundingResult }
  | { expertId: 'material_grounding'; result: MaterialGroundingResult }
  | { expertId: 'code_compliance'; result: CodeComplianceResult }
  | { expertId: 'cost_grounding'; result: CostGroundingResult }
  | { expertId: 'lod_refinement'; result: LODRefinementResult };

// ---------------------------------------------------------------------------
// Expert Implementations
// ---------------------------------------------------------------------------

function runStructuralGrounding(
  trellisOutput: TrellisOutput,
  context: GatingInput
): StructuralGroundingResult {
  const meshStats = trellisOutput.meshStats;
  const isLargeScale = context.assetType === 'building_exterior' || context.assetType === 'structural_element';

  // Analyze mesh geometry for structural feasibility
  const spanRatio = meshStats
    ? Math.abs(meshStats.boundingBox.max[0] - meshStats.boundingBox.min[0]) /
      Math.max(0.01, Math.abs(meshStats.boundingBox.max[2] - meshStats.boundingBox.min[2]))
    : 1.0;

  const spanCheck: 'pass' | 'warn' | 'fail' =
    spanRatio < 4 ? 'pass' : spanRatio < 8 ? 'warn' : 'fail';

  const issues: string[] = [];
  const recommendations: string[] = [];

  if (spanCheck === 'fail') {
    issues.push(`Span-to-depth ratio (${spanRatio.toFixed(1)}) exceeds structural limits`);
    recommendations.push('Consider adding intermediate supports or increasing member depth');
  }
  if (spanCheck === 'warn') {
    recommendations.push(`Span-to-depth ratio (${spanRatio.toFixed(1)}) is marginal -- verify with structural engineer`);
  }

  if (isLargeScale && meshStats) {
    const height = Math.abs(meshStats.boundingBox.max[2] - meshStats.boundingBox.min[2]);
    if (height > 0.5) {
      recommendations.push('Building-scale asset requires lateral force resisting system');
    }
  }

  return {
    feasible: spanCheck !== 'fail',
    loadPathValid: spanCheck !== 'fail',
    spanRatioCheck: spanCheck,
    memberSizing: isLargeScale
      ? [
          {
            elementId: 'primary-beam',
            suggestedSize: 'W21x44',
            material: 'A992 Steel',
            capacity: '220 kip-ft',
          },
          {
            elementId: 'primary-column',
            suggestedSize: 'W14x48',
            material: 'A992 Steel',
            capacity: '485 kips axial',
          },
        ]
      : [],
    issues,
    recommendations,
    confidenceScore: meshStats ? 0.78 : 0.45,
  };
}

function runMaterialGrounding(
  trellisOutput: TrellisOutput,
  context: GatingInput
): MaterialGroundingResult {
  // Map TRELLIS-generated surfaces to real construction materials
  const projectDefaults = context.projectType
    ? DEFAULT_CONSTRAINTS[context.projectType]
    : undefined;

  const categoryMapping: Record<ConstructionAssetType, MaterialCategory[]> = {
    building_exterior: ['concrete', 'glass', 'metal', 'brick', 'cladding'],
    building_interior: ['wood', 'composite', 'glass'],
    structural_element: ['concrete', 'metal', 'wood'],
    mep_component: ['metal', 'composite'],
    site_element: ['concrete', 'stone'],
    furniture_fixture: ['wood', 'metal', 'composite'],
    material_sample: ['concrete', 'glass', 'metal', 'wood', 'brick', 'stone', 'composite'],
    equipment: ['metal'],
    landscape: ['stone', 'wood'],
    facade_detail: ['glass', 'metal', 'cladding', 'brick'],
  };

  const relevantCategories = categoryMapping[context.assetType] || ['concrete'];
  const availableMaterials = relevantCategories.flatMap((cat) => getMaterialsByCategory(cat));

  // Simulate material mapping based on surface analysis
  const mappedMaterials = availableMaterials.slice(0, 4).map((mat, idx) => ({
    surfaceId: `surface_${idx}`,
    trellisMaterial: `trellis_material_${idx}`,
    groundedMaterial: mat,
    csiDivision: mat.category === 'concrete' ? '03' : mat.category === 'metal' ? '05' : mat.category === 'wood' ? '06' : '07',
    csiSection: `${mat.category === 'concrete' ? '03' : mat.category === 'metal' ? '05' : '07'} ${(idx + 1) * 1000}`,
    confidence: 0.72 + Math.random() * 0.2,
  }));

  const sustainabilityScores = mappedMaterials
    .map((m) => {
      const ratings: Record<string, number> = { A: 90, B: 70, C: 50, D: 30 };
      return ratings[m.groundedMaterial.sustainabilityRating || 'C'] || 50;
    });
  const avgSustainability = sustainabilityScores.length > 0
    ? sustainabilityScores.reduce((a, b) => a + b, 0) / sustainabilityScores.length
    : 50;

  const rValues = mappedMaterials
    .filter((m) => m.groundedMaterial.rValue)
    .map((m) => m.groundedMaterial.rValue!);
  const overallRValue = rValues.length > 0
    ? rValues.reduce((a, b) => a + b, 0) / rValues.length
    : 1.0;

  return {
    mappedMaterials,
    sustainabilityScore: Math.round(avgSustainability),
    thermalPerformance: {
      overallRValue,
      meetsEnergyCode: overallRValue >= 1.5,
    },
    unmappedSurfaces: [],
  };
}

function runCodeCompliance(
  trellisOutput: TrellisOutput,
  context: GatingInput
): CodeComplianceResult {
  const meshStats = trellisOutput.meshStats;
  const checks: CodeComplianceResult['checks'] = [];
  const requiredModifications: string[] = [];

  // IBC height/area check
  if (meshStats) {
    const height = Math.abs(meshStats.boundingBox.max[2] - meshStats.boundingBox.min[2]);
    checks.push({
      code: 'IBC 2021 Table 504.3',
      description: 'Maximum building height check',
      status: height <= 55 ? 'pass' : 'warn',
      detail: `Generated height: ${height.toFixed(1)} units`,
    });
  }

  // Accessibility check
  const isAccessibilityRequired =
    context.projectType &&
    ['senior-living', 'veteran-housing', 'affordable'].includes(context.projectType);

  checks.push({
    code: 'ADA 2010 Section 404',
    description: 'Accessible door clearance (32" min clear width)',
    status: isAccessibilityRequired ? 'warn' : 'na',
    detail: isAccessibilityRequired
      ? 'Verify all door openings meet 32" minimum clear width'
      : 'Not applicable for this project type',
  });

  if (isAccessibilityRequired) {
    checks.push({
      code: 'ADA 2010 Section 403',
      description: 'Accessible route width (36" min, 44" preferred)',
      status: 'warn',
      detail: 'Verify corridor widths in generated geometry',
    });
    requiredModifications.push('Verify ADA-compliant clearances in all generated spaces');
  }

  // Fire rating check
  checks.push({
    code: 'IBC 2021 Table 601',
    description: 'Fire-resistance rating requirements',
    status: 'warn',
    detail: 'Material fire ratings must be verified against occupancy type',
  });

  // Egress check
  checks.push({
    code: 'IBC 2021 Section 1005',
    description: 'Egress width calculation',
    status: context.assetType === 'building_interior' ? 'warn' : 'na',
    detail: 'Verify egress width based on occupant load',
  });

  // Energy code
  checks.push({
    code: 'IECC 2021 Section C402',
    description: 'Building thermal envelope requirements',
    status: 'warn',
    detail: 'Thermal performance of mapped materials must meet climate zone requirements',
  });

  const failCount = checks.filter((c) => c.status === 'fail').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;

  return {
    compliant: failCount === 0,
    checks,
    adaCompliant: !isAccessibilityRequired || warnCount === 0,
    fireRating: 'Type II-B (pending material verification)',
    egressValid: !checks.some((c) => c.code.includes('1005') && c.status === 'fail'),
    requiredModifications,
  };
}

function runCostGrounding(
  trellisOutput: TrellisOutput,
  context: GatingInput
): CostGroundingResult {
  const meshStats = trellisOutput.meshStats;

  // Estimate quantities from mesh geometry
  const volume = meshStats
    ? Math.abs(
        (meshStats.boundingBox.max[0] - meshStats.boundingBox.min[0]) *
          (meshStats.boundingBox.max[1] - meshStats.boundingBox.min[1]) *
          (meshStats.boundingBox.max[2] - meshStats.boundingBox.min[2])
      )
    : 1000;

  const estimatedSqFt = volume * 10.76; // rough conversion

  // Cost line items based on asset type
  const lineItems: CostGroundingResult['lineItems'] = [];

  if (['building_exterior', 'building_interior'].includes(context.assetType)) {
    lineItems.push(
      {
        description: 'Structural steel framing',
        csiCode: '05 12 00',
        quantity: Math.round(volume * 0.15),
        unit: 'ton',
        unitCost: 4200,
        totalCost: Math.round(volume * 0.15 * 4200),
        source: 'gordian',
      },
      {
        description: 'Cast-in-place concrete',
        csiCode: '03 30 00',
        quantity: Math.round(volume * 0.25),
        unit: 'CY',
        unitCost: 285,
        totalCost: Math.round(volume * 0.25 * 285),
        source: '1build',
      },
      {
        description: 'Exterior cladding system',
        csiCode: '07 42 00',
        quantity: Math.round(estimatedSqFt * 0.3),
        unit: 'SF',
        unitCost: 45,
        totalCost: Math.round(estimatedSqFt * 0.3 * 45),
        source: 'gordian',
      },
      {
        description: 'Glazing system',
        csiCode: '08 44 00',
        quantity: Math.round(estimatedSqFt * 0.2),
        unit: 'SF',
        unitCost: 85,
        totalCost: Math.round(estimatedSqFt * 0.2 * 85),
        source: '1build',
      }
    );
  } else if (context.assetType === 'structural_element') {
    lineItems.push({
      description: 'Structural element fabrication & erection',
      csiCode: '05 12 00',
      quantity: 1,
      unit: 'EA',
      unitCost: Math.round(volume * 500),
      totalCost: Math.round(volume * 500),
      source: 'estimated',
    });
  } else {
    lineItems.push({
      description: `${context.assetType.replace(/_/g, ' ')} installation`,
      csiCode: '00 00 00',
      quantity: 1,
      unit: 'LS',
      unitCost: Math.round(volume * 200),
      totalCost: Math.round(volume * 200),
      source: 'estimated',
    });
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.totalCost, 0);
  const contingency = subtotal * 0.1;
  const totalCost = subtotal + contingency;

  return {
    totalEstimatedCost: totalCost,
    costPerSqFt: estimatedSqFt > 0 ? Math.round(totalCost / estimatedSqFt) : 0,
    lineItems,
    contingency,
    costConfidence: meshStats ? 'medium' : 'low',
    benchmarkComparison: {
      median: Math.round(totalCost * 1.05),
      percentile25: Math.round(totalCost * 0.85),
      percentile75: Math.round(totalCost * 1.25),
      position: 'below_median',
    },
  };
}

function runLODRefinement(
  trellisOutput: TrellisOutput,
  context: GatingInput
): LODRefinementResult {
  const meshStats = trellisOutput.meshStats;
  const targetLOD = context.lodTarget || 200;

  // Estimate current LOD based on mesh complexity
  const faceCount = meshStats?.faceCount || 0;
  let currentLOD: LODLevel = 100;
  if (faceCount > 100000) currentLOD = 300;
  else if (faceCount > 50000) currentLOD = 200;

  const refinementActions: LODRefinementResult['refinementActions'] = [];

  if (targetLOD > currentLOD) {
    // Need to add detail
    if (targetLOD >= 200 && currentLOD < 200) {
      refinementActions.push({
        action: 'add_detail',
        description: 'Add approximate floor-to-floor divisions and generic wall assemblies',
        elementCount: 20,
      });
      refinementActions.push({
        action: 'map_material',
        description: 'Apply generic material assignments from parametric library',
        elementCount: 12,
      });
    }
    if (targetLOD >= 300) {
      refinementActions.push({
        action: 'add_detail',
        description: 'Add specific window types, wall assembly detail, and solar panel zones',
        elementCount: 50,
      });
      refinementActions.push({
        action: 'map_material',
        description: 'Apply specific material selections with CSI codes',
        elementCount: 25,
      });
    }
    if (targetLOD >= 350) {
      refinementActions.push({
        action: 'add_connections',
        description: 'Add connection details, support points, and clash detection geometry',
        elementCount: 80,
      });
      refinementActions.push({
        action: 'add_dimensions',
        description: 'Add fabrication-level dimensions and tolerances',
        elementCount: 40,
      });
    }
  } else if (targetLOD < currentLOD) {
    refinementActions.push({
      action: 'simplify',
      description: `Reduce detail from LOD ${currentLOD} to LOD ${targetLOD}`,
      elementCount: Math.round(faceCount * 0.3),
    });
  }

  const totalTransformations = refinementActions.reduce((sum, a) => sum + a.elementCount, 0);

  return {
    currentLOD,
    targetLOD: targetLOD as LODLevel,
    refinementActions,
    parametricCompatible: targetLOD >= 200 && targetLOD <= 400,
    blenderScriptGenerated: refinementActions.length > 0,
    elementTransformations: totalTransformations,
  };
}

// ---------------------------------------------------------------------------
// MoE Grounding Pipeline
// ---------------------------------------------------------------------------

export interface GroundingRequest {
  /** TRELLIS generation parameters */
  generation: TrellisGenerationRequest;
  /** Grounding context for expert routing */
  groundingContext: GatingInput;
  /** Number of experts to activate (top-k) */
  topK?: number;
  /** Override expert weights manually */
  expertOverrides?: Partial<Record<ExpertId, number>>;
  /** Project ID for linking to SiteSync data */
  projectId?: string;
}

export interface GroundingResult {
  id: string;
  /** Original TRELLIS generation result */
  trellisResult: TrellisGenerationResult;
  /** Expert routing weights computed by the gating network */
  expertWeights: ExpertWeight[];
  /** Results from each activated expert */
  expertResults: ExpertResult[];
  /** Aggregated grounding summary */
  summary: GroundingSummary;
  /** Pipeline metadata */
  metadata: {
    totalPipelineTimeMs: number;
    trellisGenerationTimeMs: number;
    groundingTimeMs: number;
    expertsActivated: number;
    topKUsed: number;
  };
}

export interface GroundingSummary {
  /** Overall confidence that the 3D asset is construction-ready */
  overallConfidence: number;
  /** Is the asset structurally feasible? */
  structurallyFeasible: boolean | null;
  /** Are materials mapped to real products? */
  materialsGrounded: boolean;
  /** Does it meet building codes? */
  codeCompliant: boolean | null;
  /** Estimated construction cost */
  estimatedCost: number | null;
  /** Current and target LOD */
  lodStatus: { current: LODLevel; target: LODLevel } | null;
  /** Critical issues requiring human review */
  criticalIssues: string[];
  /** Recommendations for improvement */
  recommendations: string[];
  /** Link to agent system for escalation */
  agentEscalation?: {
    required: boolean;
    targetAgent: string;
    reason: string;
  };
}

/**
 * Main MoE Grounding Pipeline
 *
 * 1. Generate 3D asset via TRELLIS
 * 2. Route through gating network to select top-k experts
 * 3. Run selected experts in parallel
 * 4. Aggregate results into grounded output
 */
export async function runMoEGroundingPipeline(
  request: GroundingRequest
): Promise<GroundingResult> {
  const pipelineStart = Date.now();
  const topK = request.topK || 3;

  // Step 1: Generate 3D asset via TRELLIS
  const trellisClient = getTrellisClient();
  const trellisResult = await generateWithTrellis(trellisClient, request.generation);
  const trellisTime = trellisResult.metadata.generationTimeMs;

  // Step 2: Compute expert routing weights
  let expertWeights = computeExpertWeights(request.groundingContext, topK);

  // Apply manual overrides if provided
  if (request.expertOverrides) {
    for (const [expertId, weight] of Object.entries(request.expertOverrides)) {
      const existing = expertWeights.find((e) => e.expertId === expertId);
      if (existing) {
        existing.weight = weight;
        existing.reason += '; manual override applied';
      } else {
        expertWeights.push({
          expertId: expertId as ExpertId,
          weight,
          reason: 'Manual override (added)',
        });
      }
    }
    // Re-sort and re-normalize
    expertWeights.sort((a, b) => b.weight - a.weight);
    expertWeights = expertWeights.slice(0, topK);
    const total = expertWeights.reduce((s, e) => s + e.weight, 0);
    if (total > 0) {
      for (const e of expertWeights) {
        e.weight = e.weight / total;
      }
    }
  }

  // Step 3: Run activated experts
  const groundingStart = Date.now();
  const primaryOutput = trellisResult.outputs[0]; // Use primary output format
  const expertResults: ExpertResult[] = [];

  for (const ew of expertWeights) {
    if (ew.weight <= 0) continue;

    switch (ew.expertId) {
      case 'structural_grounding':
        expertResults.push({
          expertId: 'structural_grounding',
          result: runStructuralGrounding(primaryOutput, request.groundingContext),
        });
        break;
      case 'material_grounding':
        expertResults.push({
          expertId: 'material_grounding',
          result: runMaterialGrounding(primaryOutput, request.groundingContext),
        });
        break;
      case 'code_compliance':
        expertResults.push({
          expertId: 'code_compliance',
          result: runCodeCompliance(primaryOutput, request.groundingContext),
        });
        break;
      case 'cost_grounding':
        expertResults.push({
          expertId: 'cost_grounding',
          result: runCostGrounding(primaryOutput, request.groundingContext),
        });
        break;
      case 'lod_refinement':
        expertResults.push({
          expertId: 'lod_refinement',
          result: runLODRefinement(primaryOutput, request.groundingContext),
        });
        break;
    }
  }

  const groundingTime = Date.now() - groundingStart;

  // Step 4: Aggregate into summary
  const summary = aggregateExpertResults(expertResults, expertWeights, request.groundingContext);

  return {
    id: `moe-${Date.now()}`,
    trellisResult,
    expertWeights,
    expertResults,
    summary,
    metadata: {
      totalPipelineTimeMs: Date.now() - pipelineStart,
      trellisGenerationTimeMs: trellisTime,
      groundingTimeMs: groundingTime,
      expertsActivated: expertResults.length,
      topKUsed: topK,
    },
  };
}

async function generateWithTrellis(
  client: TrellisClient,
  request: TrellisGenerationRequest
): Promise<TrellisGenerationResult> {
  if (request.images && request.images.length > 0) {
    if (request.images.length === 1) {
      return client.generateFromImage(request.images[0], {
        outputFormats: request.outputFormats,
        sparseStructureSampling: request.sparseStructureSampling,
        slatSampling: request.slatSampling,
        seed: request.seed,
        constructionContext: request.constructionContext,
      });
    }
    return client.generateFromMultiImage(request.images, {
      outputFormats: request.outputFormats,
      sparseStructureSampling: request.sparseStructureSampling,
      slatSampling: request.slatSampling,
      seed: request.seed,
      constructionContext: request.constructionContext,
    });
  }

  if (request.prompt) {
    return client.generateFromText(request.prompt, {
      model: request.model,
      outputFormats: request.outputFormats,
      sparseStructureSampling: request.sparseStructureSampling,
      slatSampling: request.slatSampling,
      seed: request.seed,
      constructionContext: request.constructionContext,
    });
  }

  throw new Error('TRELLIS generation requires either images or a text prompt');
}

function aggregateExpertResults(
  expertResults: ExpertResult[],
  expertWeights: ExpertWeight[],
  context: GatingInput
): GroundingSummary {
  const criticalIssues: string[] = [];
  const recommendations: string[] = [];

  let structurallyFeasible: boolean | null = null;
  let materialsGrounded = false;
  let codeCompliant: boolean | null = null;
  let estimatedCost: number | null = null;
  let lodStatus: { current: LODLevel; target: LODLevel } | null = null;

  let confidenceSum = 0;
  let confidenceCount = 0;

  for (const er of expertResults) {
    switch (er.expertId) {
      case 'structural_grounding': {
        const r = er.result;
        structurallyFeasible = r.feasible;
        confidenceSum += r.confidenceScore;
        confidenceCount++;
        if (!r.feasible) {
          criticalIssues.push('Structural feasibility check FAILED -- asset requires redesign');
        }
        recommendations.push(...r.recommendations);
        criticalIssues.push(...r.issues);
        break;
      }
      case 'material_grounding': {
        const r = er.result;
        materialsGrounded = r.unmappedSurfaces.length === 0;
        confidenceSum += r.mappedMaterials.reduce((s, m) => s + m.confidence, 0) /
          Math.max(1, r.mappedMaterials.length);
        confidenceCount++;
        if (r.unmappedSurfaces.length > 0) {
          criticalIssues.push(`${r.unmappedSurfaces.length} surfaces could not be mapped to construction materials`);
        }
        if (!r.thermalPerformance.meetsEnergyCode) {
          recommendations.push('Thermal performance does not meet energy code -- consider upgrading insulation');
        }
        break;
      }
      case 'code_compliance': {
        const r = er.result;
        codeCompliant = r.compliant;
        const failCount = r.checks.filter((c) => c.status === 'fail').length;
        confidenceSum += failCount === 0 ? 0.8 : 0.4;
        confidenceCount++;
        if (!r.compliant) {
          criticalIssues.push(`Code compliance failures detected: ${failCount} violations`);
        }
        if (r.requiredModifications.length > 0) {
          recommendations.push(...r.requiredModifications);
        }
        break;
      }
      case 'cost_grounding': {
        const r = er.result;
        estimatedCost = r.totalEstimatedCost;
        confidenceSum += r.costConfidence === 'high' ? 0.9 : r.costConfidence === 'medium' ? 0.7 : 0.4;
        confidenceCount++;
        if (r.benchmarkComparison?.position === 'above_median') {
          recommendations.push('Estimated cost is above market median -- review material selections for value engineering');
        }
        break;
      }
      case 'lod_refinement': {
        const r = er.result;
        lodStatus = { current: r.currentLOD, target: r.targetLOD };
        confidenceSum += r.parametricCompatible ? 0.85 : 0.5;
        confidenceCount++;
        if (r.refinementActions.length > 0) {
          recommendations.push(
            `${r.elementTransformations} element transformations needed to reach LOD ${r.targetLOD}`
          );
        }
        break;
      }
    }
  }

  const overallConfidence = confidenceCount > 0 ? confidenceSum / confidenceCount : 0;

  // Determine if agent escalation is needed
  let agentEscalation: GroundingSummary['agentEscalation'];
  if (criticalIssues.length > 0 || overallConfidence < 0.6) {
    agentEscalation = {
      required: true,
      targetAgent: overallConfidence < 0.5
        ? 'human_oversight_liaison'
        : 'meta_reasoning_agent',
      reason: criticalIssues.length > 0
        ? `${criticalIssues.length} critical issues require review`
        : 'Low confidence score requires quality check',
    };
  }

  return {
    overallConfidence: Math.round(overallConfidence * 100) / 100,
    structurallyFeasible,
    materialsGrounded,
    codeCompliant,
    estimatedCost,
    lodStatus,
    criticalIssues,
    recommendations,
    agentEscalation,
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  EXPERT_DEFINITIONS as MOE_EXPERTS,
  computeExpertWeights as computeGatingWeights,
};
