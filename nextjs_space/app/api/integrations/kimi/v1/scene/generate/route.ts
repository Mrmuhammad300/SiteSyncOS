/**
 * POST /api/integrations/kimi/v1/scene/generate
 * Generate a 3D scene from structured layout specifications
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import {
  generateScene,
  SpatialGenerateRequest,
} from '@/lib/kimi-spatial';

export const maxDuration = 120; // Allow 2 minutes for generation

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.layoutSpec || !body.layoutSpec.levels) {
      return NextResponse.json(
        { error: 'Missing required field: layoutSpec with levels array' },
        { status: 400 }
      );
    }

    // Build request object with defaults
    const generateRequest: SpatialGenerateRequest = {
      projectId: body.project_id || body.projectId,
      propertyId: body.property_id || body.propertyId,
      units: body.units || 'metric',
      targetEngine: body.target_engine || body.targetEngine || 'threejs',
      layoutSpec: body.layout_spec || body.layoutSpec,
      referenceImages: body.reference_images || body.referenceImages,
      generationConstraints: body.generation_constraints || body.generationConstraints,
      legalMode: body.legal_mode || body.legalMode,
      promptContractId: body.prompt_contract_id || body.promptContractId,
    };

    // Build actor from session
    const actor = {
      type: 'user' as const,
      id: (session.user as { id: string }).id,
      displayName: session.user.name || session.user.email || undefined,
    };

    // Generate the scene
    const result = await generateScene(generateRequest, actor);

    return NextResponse.json({
      spatial_model_id: result.spatialModelId,
      status: result.status,
      non_authoritative: result.nonAuthoritative,
      engine: result.engine,
      warnings: result.warnings,
      assumptions: result.assumptions,
      artifacts: result.artifacts.map(a => ({
        artifact_type: a.artifactType,
        uri: a.uri,
        content_type: a.contentType,
        sha256: a.sha256,
        inline_content: a.inlineContent,
      })),
      audit: {
        trace_id: result.audit.traceId,
        created_at: result.audit.createdAt,
        actor: result.audit.actor,
        model_info: {
          provider: result.audit.modelInfo.provider,
          model: result.audit.modelInfo.model,
          prompt_version: result.audit.modelInfo.promptVersion,
        },
        policy: {
          non_authoritative: result.audit.policy.nonAuthoritative,
          human_in_loop_enforced: result.audit.policy.humanInLoopEnforced,
        },
      },
    });
  } catch (error) {
    console.error('Spatial generation error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for specific error types
    if (message.includes('KIMI_API_KEY')) {
      return NextResponse.json(
        { error: 'Kimi API not configured. Please set KIMI_API_KEY environment variable.' },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
