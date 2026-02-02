import { NextRequest, NextResponse } from 'next/server';
import {
  runMoEGroundingPipeline,
  getTrellisClient,
  computeExpertWeights,
  EXPERT_DEFINITIONS,
  type GroundingRequest,
  type GatingInput,
  type ConstructionAssetType,
  type TrellisOutputFormat,
  type TrellisModelVariant,
} from '@/lib/moe-grounding';

const VALID_ASSET_TYPES: ConstructionAssetType[] = [
  'building_exterior', 'building_interior', 'structural_element',
  'mep_component', 'site_element', 'furniture_fixture',
  'material_sample', 'equipment', 'landscape', 'facade_detail',
];

const VALID_OUTPUT_FORMATS: TrellisOutputFormat[] = ['mesh', 'gaussian', 'radiance_field'];

const VALID_MODELS: TrellisModelVariant[] = [
  'TRELLIS-image-large', 'TRELLIS-text-base', 'TRELLIS-text-large', 'TRELLIS-text-xlarge',
];

function isValidAssetType(value: string): value is ConstructionAssetType {
  return VALID_ASSET_TYPES.includes(value as ConstructionAssetType);
}

function isValidOutputFormat(value: string): value is TrellisOutputFormat {
  return VALID_OUTPUT_FORMATS.includes(value as TrellisOutputFormat);
}

function isValidModel(value: string): value is TrellisModelVariant {
  return VALID_MODELS.includes(value as TrellisModelVariant);
}

/**
 * GET /api/moe-grounding
 *
 * Query parameters:
 *   action: 'status' | 'experts' | 'preview-routing'
 *
 * - status: Check TRELLIS server connection and available models
 * - experts: List all expert definitions and their capabilities
 * - preview-routing: Preview expert routing weights for a given context
 *     Additional params: assetType, projectType, lodTarget, topK
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
        const rawAssetType = searchParams.get('assetType') || 'building_exterior';
        if (!isValidAssetType(rawAssetType)) {
          return NextResponse.json(
            { error: `Invalid assetType: ${rawAssetType}. Valid types: ${VALID_ASSET_TYPES.join(', ')}` },
            { status: 400 }
          );
        }
        const assetType: ConstructionAssetType = rawAssetType;
        const projectType = searchParams.get('projectType') || undefined;
        const lodTarget = searchParams.get('lodTarget')
          ? parseInt(searchParams.get('lodTarget')!, 10)
          : undefined;
        const topK = searchParams.get('topK')
          ? parseInt(searchParams.get('topK')!, 10)
          : 3;

        const gatingInput: GatingInput = {
          assetType,
          projectType,
          lodTarget: lodTarget as GatingInput['lodTarget'],
          hasStructuralRequirements: ['building_exterior', 'structural_element'].includes(assetType),
          hasCostConstraints: true,
          isPermitRequired: ['building_exterior', 'building_interior'].includes(assetType),
        };

        const weights = computeExpertWeights(gatingInput, topK);

        return NextResponse.json({
          context: gatingInput,
          topK,
          routing: weights,
        });
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
 *
 * Request body:
 *   {
 *     mode: 'text-to-3d' | 'image-to-3d',
 *     prompt?: string,           // for text-to-3d
 *     images?: string[],         // for image-to-3d (base64)
 *     model?: TrellisModelVariant,
 *     outputFormats?: TrellisOutputFormat[],
 *     assetType: ConstructionAssetType,
 *     projectType?: string,
 *     lodTarget?: number,
 *     topK?: number,
 *     projectId?: string,
 *     seed?: number,
 *     expertOverrides?: Record<string, number>,
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      mode,
      prompt,
      images,
      model,
      outputFormats = ['mesh'],
      assetType = 'building_exterior',
      projectType,
      lodTarget,
      topK = 3,
      projectId,
      seed,
      expertOverrides,
    } = body;

    // Validate mode
    if (!mode || !['text-to-3d', 'image-to-3d'].includes(mode)) {
      return NextResponse.json(
        { error: 'mode is required and must be "text-to-3d" or "image-to-3d"' },
        { status: 400 }
      );
    }

    if (mode === 'text-to-3d' && !prompt) {
      return NextResponse.json(
        { error: 'prompt is required for text-to-3d mode' },
        { status: 400 }
      );
    }

    if (mode === 'image-to-3d' && (!images || images.length === 0)) {
      return NextResponse.json(
        { error: 'images array is required for image-to-3d mode' },
        { status: 400 }
      );
    }

    // Validate assetType
    if (!isValidAssetType(assetType)) {
      return NextResponse.json(
        { error: `Invalid assetType: ${assetType}. Valid types: ${VALID_ASSET_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate outputFormats
    const invalidFormats = outputFormats.filter((f: string) => !isValidOutputFormat(f));
    if (invalidFormats.length > 0) {
      return NextResponse.json(
        { error: `Invalid outputFormats: ${invalidFormats.join(', ')}. Valid formats: ${VALID_OUTPUT_FORMATS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate model if provided
    if (model && !isValidModel(model)) {
      return NextResponse.json(
        { error: `Invalid model: ${model}. Valid models: ${VALID_MODELS.join(', ')}` },
        { status: 400 }
      );
    }

    // Build grounding request
    const validatedAssetType: ConstructionAssetType = assetType;
    const validatedFormats: TrellisOutputFormat[] = outputFormats;
    const groundingRequest: GroundingRequest = {
      generation: {
        model: model || (mode === 'text-to-3d' ? 'TRELLIS-text-large' : 'TRELLIS-image-large'),
        prompt: mode === 'text-to-3d' ? prompt : undefined,
        images: mode === 'image-to-3d' ? images : undefined,
        outputFormats: validatedFormats,
        seed,
        constructionContext: {
          assetType: validatedAssetType,
          projectType,
          lodTarget,
        },
      },
      groundingContext: {
        assetType: validatedAssetType,
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

    // Run the MoE grounding pipeline
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
