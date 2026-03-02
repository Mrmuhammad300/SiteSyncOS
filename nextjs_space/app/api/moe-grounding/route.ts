import { NextRequest, NextResponse } from 'next/server';
import {
  runMoEGroundingPipeline,
  getTrellisClient,
  computeExpertWeights,
  EXPERT_DEFINITIONS,
  type GroundingRequest,
  type GatingInput,
} from '@/lib/moe-grounding';
import { validate, validateObject } from '@/lib/validations';
import {
  MoEGroundingRequestSchema,
  MoERoutingPreviewSchema,
} from '@/lib/validations/moe-grounding';
import { rateLimit, PRESETS } from '@/lib/rate-limit';

/**
 * GET /api/moe-grounding
 *
 * Query parameters:
 *   action: 'status' | 'experts' | 'preview-routing'
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'status';

  try {
    switch (action) {
      case 'status': {
        const client = getTrellisClient();
        const connectionStatus = await client.checkConnection();
        return NextResponse.json({
          trellis: connectionStatus,
          moeEngine: {
            version: '1.0.0',
            experts: EXPERT_DEFINITIONS.length,
            expertIds: EXPERT_DEFINITIONS.map((e) => e.id),
          },
        });
      }

      case 'experts': {
        return NextResponse.json({
          experts: EXPERT_DEFINITIONS.map((e) => ({
            id: e.id,
            name: e.name,
            description: e.description,
            relevantAssetTypes: e.relevantAssetTypes,
            baseWeight: e.baseWeight,
          })),
        });
      }

      case 'preview-routing': {
        const parsed = validateObject(
          Object.fromEntries(searchParams.entries()),
          MoERoutingPreviewSchema
        );
        if (!parsed.ok) return parsed.error;

        const { projectType, lodTarget, topK } = parsed.data;
        const assetType = (parsed.data.assetType ?? 'building_exterior') as import('@/lib/moe-grounding').ConstructionAssetType;

        const gatingInput: GatingInput = {
          assetType,
          projectType,
          lodTarget: lodTarget as GatingInput['lodTarget'],
          hasStructuralRequirements: ['building_exterior', 'structural_element'].includes(assetType),
          hasCostConstraints: true,
          isPermitRequired: ['building_exterior', 'building_interior'].includes(assetType),
        };

        const weights = computeExpertWeights(gatingInput, topK);
        return NextResponse.json({ context: gatingInput, topK, routing: weights });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: status, experts, preview-routing` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[MoE Grounding API] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/moe-grounding
 *
 * Run the full MoE grounding pipeline:
 *   1. Generate 3D asset via TRELLIS (image-to-3D or text-to-3D)
 *   2. Route through gating network
 *   3. Execute domain-specific experts
 *   4. Return grounded result with construction metadata
 */
export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, PRESETS.AI);
  if (!limited.ok) return limited.error;

  const parsed = await validate(request, MoEGroundingRequestSchema);
  if (!parsed.ok) return parsed.error;

  const {
    mode, prompt, images, model,
    projectType, lodTarget, topK, projectId, seed, expertOverrides,
  } = parsed.data;

  // Apply defaults that Zod may infer as potentially-undefined in strict TS.
  const outputFormats = (parsed.data.outputFormats ?? ['mesh']) as import('@/lib/moe-grounding').TrellisOutputFormat[];
  const assetType = (parsed.data.assetType ?? 'building_exterior') as import('@/lib/moe-grounding').ConstructionAssetType;

  try {
    const groundingRequest: GroundingRequest = {
      generation: {
        model: model ?? (mode === 'text-to-3d' ? 'TRELLIS-text-large' : 'TRELLIS-image-large'),
        prompt: mode === 'text-to-3d' ? prompt : undefined,
        images: mode === 'image-to-3d' ? images : undefined,
        outputFormats,
        seed,
        constructionContext: { assetType, projectType, lodTarget },
      },
      groundingContext: {
        assetType,
        projectType,
        lodTarget,
        hasStructuralRequirements: ['building_exterior', 'structural_element'].includes(assetType),
        hasCostConstraints: true,
        isPermitRequired: ['building_exterior', 'building_interior'].includes(assetType),
      },
      topK,
      expertOverrides,
      projectId,
    };

    const result = await runMoEGroundingPipeline(groundingRequest);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[MoE Grounding API] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Pipeline execution failed' },
      { status: 500 }
    );
  }
}
