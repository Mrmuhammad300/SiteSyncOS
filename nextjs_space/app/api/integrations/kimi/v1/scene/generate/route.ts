/**
 * POST /api/integrations/kimi/v1/scene/generate
 * Generate a 3D scene from structured layout specifications
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import {
  generateScene,
  SpatialGenerateRequest,
} from '@/lib/kimi-spatial';

export const maxDuration = 120; // Allow 2 minutes for generation

// Verify user has access to project
async function verifyProjectAccess(userId: string, projectId: string): Promise<boolean> {
  // Check if user is project manager, architect, engineer, superintendent, or on the team
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { projectManagerId: userId },
        { superintendentId: userId },
        { architectId: userId },
        { engineerId: userId },
        { team: { some: { userId } } },
      ],
    },
  });
  
  if (project) return true;
  
  // Also check if user is admin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  
  return user?.role === 'Admin' || user?.role === 'SuperAdmin';
}

// Verify user has access to property
async function verifyPropertyAccess(userId: string, propertyId: string): Promise<boolean> {
  // For now, allow access if property exists and user is authenticated
  // More restrictive access can be added later
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
  });
  
  if (!property) return false;
  
  // Check if user is admin or has relevant role
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  
  // Admin, Project Manager, and Architect roles can access properties
  const allowedRoles = ['Admin', 'SuperAdmin', 'ProjectManager', 'Architect'];
  return user?.role ? allowedRoles.includes(user.role) : false;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const body = await request.json();

    // Validate required fields
    if (!body.layoutSpec && !body.layout_spec) {
      return NextResponse.json(
        { error: 'Missing required field: layoutSpec with levels array' },
        { status: 400 }
      );
    }
    
    const layoutSpec = body.layout_spec || body.layoutSpec;
    if (!layoutSpec.levels || !Array.isArray(layoutSpec.levels)) {
      return NextResponse.json(
        { error: 'layoutSpec must contain a levels array' },
        { status: 400 }
      );
    }

    // Validate project access if projectId provided
    const projectId = body.project_id || body.projectId;
    if (projectId && projectId !== 'none') {
      const hasAccess = await verifyProjectAccess(userId, projectId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You do not have access to this project' },
          { status: 403 }
        );
      }
    }

    // Validate property access if propertyId provided
    const propertyId = body.property_id || body.propertyId;
    if (propertyId && propertyId !== 'none') {
      const hasAccess = await verifyPropertyAccess(userId, propertyId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You do not have access to this property' },
          { status: 403 }
        );
      }
    }

    // Strict validation for units and engine
    const validUnits = ['metric', 'imperial'];
    const validEngines = ['threejs', 'babylonjs', 'unity_csharp'];
    
    const units = validUnits.includes(body.units) ? body.units : 'metric';
    const targetEngine = validEngines.includes(body.target_engine || body.targetEngine) 
      ? (body.target_engine || body.targetEngine) 
      : 'threejs';

    // Build request object with defaults
    const generateRequest: SpatialGenerateRequest = {
      projectId: (projectId && projectId !== 'none') ? projectId : undefined,
      propertyId: (propertyId && propertyId !== 'none') ? propertyId : undefined,
      units,
      targetEngine,
      layoutSpec,
      referenceImages: body.reference_images || body.referenceImages,
      generationConstraints: body.generation_constraints || body.generationConstraints,
      legalMode: body.legal_mode || body.legalMode,
      promptContractId: body.prompt_contract_id || body.promptContractId,
    };

    // Build actor from session
    const actor = {
      type: 'user' as const,
      id: userId,
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
    if (message.includes('ABACUSAI_API_KEY') || message.includes('KIMI_API_KEY')) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable. Please try again.' },
        { status: 503 }
      );
    }
    
    // Generic error for security
    return NextResponse.json(
      { error: 'Failed to generate scene. Please try again.' },
      { status: 500 }
    );
  }
}
