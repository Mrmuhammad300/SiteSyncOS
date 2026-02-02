/**
 * MoE Grounding Module for SiteSync OS
 *
 * Mixture of Experts architecture that grounds TRELLIS-generated 3D assets
 * in construction reality through domain-specific expert validation.
 *
 * Usage:
 *   import { runMoEGroundingPipeline, getTrellisClient } from '@/lib/moe-grounding';
 */

export {
  // TRELLIS Client
  TrellisClient,
  getTrellisClient,
  type TrellisGenerationRequest,
  type TrellisGenerationResult,
  type TrellisOutput,
  type TrellisOutputFormat,
  type TrellisModelVariant,
  type TrellisConnectionStatus,
  type ConstructionAssetType,
} from './trellis-client';

export {
  // MoE Engine
  runMoEGroundingPipeline,
  computeExpertWeights,
  EXPERT_DEFINITIONS,
  MOE_EXPERTS,
  computeGatingWeights,
  // Types
  type ExpertId,
  type ExpertDefinition,
  type ExpertWeight,
  type GatingInput,
  type GroundingRequest,
  type GroundingResult,
  type GroundingSummary,
  type ExpertResult,
  type StructuralGroundingResult,
  type MaterialGroundingResult,
  type CodeComplianceResult,
  type CostGroundingResult,
  type LODRefinementResult,
} from './moe-grounding-engine';
