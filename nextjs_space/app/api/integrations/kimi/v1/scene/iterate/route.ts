/**
 * POST /api/integrations/kimi/v1/scene/iterate
 * Iterate on an existing spatial model with instructions
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import {
  iterateScene,
  SpatialIterateRequest,
} from '@/lib/kimi-spatial';

export const maxDuration = 120; // Allow 2 minutes for iteration

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.spatial_model_id && !body.spatialModelId) {
      return NextResponse.json(
        { error: 'Missing required field: spatial_model_id' },
        { status: 400 }
      );
    }

    if (!body.iteration_instructions && !body.iterationInstructions) {
      return NextResponse.json(
        { error: 'Missing required field: iteration_instructions' },
        { status: 400 }
      );
    }

    // Build request object
    const iterateRequest: SpatialIterateRequest = {
      projectId: body.project_id || body.projectId,
      spatialModelId: body.spatial_model_id || body.spatialModelId,
      iterationInstructions: body.iteration_instructions || body.iterationInstructions,
      targetEngine: body.target_engine || body.targetEngine,
      legalMode: body.legal_mode || body.legalMode,
    };

    // Build actor from session
    const actor = {
      type: 'user' as const,
      id: (session.user as { id: string }).id,
      displayName: session.user.name || session.user.email || undefined,
    };

    // Iterate the scene
    const result = await iterateScene(iterateRequest, actor);

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
    console.error('Spatial iteration error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message.includes('not found')) {
      return NextResponse.json(
        { error: message },
        { status: 404 }
      );
    }
    
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
