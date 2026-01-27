/**
 * GET /api/integrations/kimi/models
 * List spatial models with filtering
 * 
 * GET /api/integrations/kimi/models?projectId=xxx
 * GET /api/integrations/kimi/models?propertyId=xxx
 * GET /api/integrations/kimi/models?status=Generated
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import {
  listSpatialModels,
  getSpatialModel,
  getAuditTrail,
} from '@/lib/kimi-spatial';
import { SpatialModelStatus } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Check if requesting a specific model
    const spatialModelId = searchParams.get('spatialModelId') || searchParams.get('id');
    
    if (spatialModelId) {
      // Get single model with full details
      const model = await getSpatialModel(spatialModelId);
      
      if (!model) {
        return NextResponse.json(
          { error: 'Spatial model not found' },
          { status: 404 }
        );
      }
      
      // Get audit trail
      const audits = await getAuditTrail(spatialModelId);
      
      return NextResponse.json({
        model: {
          id: model.id,
          spatial_model_id: model.spatialModelId,
          project_id: model.projectId,
          property_id: model.propertyId,
          status: model.status,
          target_engine: model.targetEngine,
          units: model.units,
          layout_spec: model.layoutSpec,
          reference_images: model.referenceImages,
          generation_constraints: model.generationConstraints,
          legal_mode: model.legalMode,
          disclaimer_text: model.disclaimerText,
          non_authoritative: model.nonAuthoritative,
          prompt_contract_id: model.promptContractId,
          warnings: model.warnings,
          assumptions: model.assumptions,
          version: model.version,
          parent_model_id: model.parentModel?.spatialModelId,
          iterations: model.iterations.map(i => ({
            spatial_model_id: i.spatialModelId,
            version: i.version,
            created_at: i.createdAt.toISOString(),
          })),
          artifacts: model.artifacts.map(a => ({
            id: a.id,
            artifact_type: a.artifactType,
            uri: a.uri,
            content_type: a.contentType,
            sha256: a.sha256,
            inline_content: a.inlineContent,
            labels: a.labels,
            is_public: a.isPublic,
            created_at: a.createdAt.toISOString(),
          })),
          exports: model.exports.map(e => ({
            export_id: e.exportId,
            format: e.format,
            export_mode: e.exportMode,
            status: e.status,
            artifact_uri: e.artifactUri,
            created_at: e.createdAt.toISOString(),
            completed_at: e.completedAt?.toISOString(),
          })),
          annotations: model.annotations.map(a => ({
            id: a.id,
            position: { x: a.positionX, y: a.positionY, z: a.positionZ },
            title: a.title,
            description: a.description,
            annotation_type: a.annotationType,
            color: a.color,
            icon: a.icon,
            linked_rfi_id: a.linkedRfiId,
            linked_submittal_id: a.linkedSubmittalId,
            linked_change_order_id: a.linkedChangeOrderId,
          })),
          approvals: model.approvals.map(a => ({
            id: a.id,
            approval_type: a.approvalType,
            status: a.status,
            reviewer_id: a.reviewerId,
            attestation_text: a.attestationText,
            licensed_credential: a.licensedCredential,
            stamped_artifact_uri: a.stampedArtifactUri,
            rejection_reason: a.rejectionReason,
            requested_at: a.requestedAt.toISOString(),
            decided_at: a.decidedAt?.toISOString(),
          })),
          project: model.project,
          property: model.property,
          created_at: model.createdAt.toISOString(),
          updated_at: model.updatedAt.toISOString(),
        },
        audits: audits.map(a => ({
          trace_id: a.traceId,
          action_type: a.actionType,
          action_details: a.actionDetails,
          actor_type: a.actorType,
          actor_id: a.actorId,
          actor_display_name: a.actorDisplayName,
          model_provider: a.modelProvider,
          model_version: a.modelVersion,
          prompt_version: a.promptVersion,
          latency_ms: a.latencyMs,
          token_estimate: a.tokenEstimate,
          non_authoritative: a.nonAuthoritative,
          human_in_loop_enforced: a.humanInLoopEnforced,
          created_at: a.createdAt.toISOString(),
        })),
      });
    }
    
    // List models with filters
    const projectId = searchParams.get('projectId') || searchParams.get('project_id');
    const propertyId = searchParams.get('propertyId') || searchParams.get('property_id');
    const status = searchParams.get('status') as SpatialModelStatus | null;
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const take = parseInt(searchParams.get('take') || '20', 10);
    
    const { models, total } = await listSpatialModels({
      projectId: projectId || undefined,
      propertyId: propertyId || undefined,
      status: status || undefined,
      skip,
      take: Math.min(take, 100), // Cap at 100
    });
    
    return NextResponse.json({
      models: models.map(m => ({
        id: m.id,
        spatial_model_id: m.spatialModelId,
        project_id: m.projectId,
        property_id: m.propertyId,
        status: m.status,
        target_engine: m.targetEngine,
        units: m.units,
        version: m.version,
        prompt_contract_id: m.promptContractId,
        warnings_count: Array.isArray(m.warnings) ? m.warnings.length : 0,
        assumptions_count: Array.isArray(m.assumptions) ? m.assumptions.length : 0,
        has_scene_code: m.artifacts.length > 0,
        project: m.project,
        property: m.property,
        created_by: m.createdBy ? `${m.createdBy.firstName} ${m.createdBy.lastName}` : null,
        created_at: m.createdAt.toISOString(),
        updated_at: m.updatedAt.toISOString(),
      })),
      total,
      skip,
      take,
    });
  } catch (error) {
    console.error('Spatial models list error:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
