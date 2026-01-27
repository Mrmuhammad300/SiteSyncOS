/**
 * POST /api/integrations/kimi/v1/scene/export
 * Export a spatial model to GLB/OBJ format via generated Blender script
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import {
  exportScene,
  SpatialExportRequest,
} from '@/lib/kimi-spatial';

export const maxDuration = 180; // Allow 3 minutes for export

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

    if (!body.format) {
      return NextResponse.json(
        { error: 'Missing required field: format (glb or obj)' },
        { status: 400 }
      );
    }

    if (!['glb', 'obj'].includes(body.format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be "glb" or "obj"' },
        { status: 400 }
      );
    }

    // Build request object
    const exportRequest: SpatialExportRequest = {
      projectId: body.project_id || body.projectId,
      spatialModelId: body.spatial_model_id || body.spatialModelId,
      format: body.format,
      exportMode: body.export_mode || body.exportMode || 'kimi_generated_script',
      legalMode: body.legal_mode || body.legalMode,
    };

    // Build actor from session
    const actor = {
      type: 'user' as const,
      id: (session.user as { id: string }).id,
      displayName: session.user.name || session.user.email || undefined,
    };

    // Export the scene
    const result = await exportScene(exportRequest, actor);

    return NextResponse.json({
      export_id: result.exportId,
      format: result.format,
      artifact: {
        artifact_type: result.artifact.artifactType,
        uri: result.artifact.uri,
        content_type: result.artifact.contentType,
        sha256: result.artifact.sha256,
        inline_content: result.artifact.inlineContent,
      },
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
    console.error('Spatial export error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message.includes('not found')) {
      return NextResponse.json(
        { error: message },
        { status: 404 }
      );
    }
    
    if (message.includes('blocked')) {
      return NextResponse.json(
        { error: message, policy_blocked: true },
        { status: 403 }
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
