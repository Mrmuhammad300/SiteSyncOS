/**
 * Kimi K2.5 Spatial Generation System
 * Converts structured room/layout specs into 3D scene code (Three.js/Babylon.js/Unity)
 * Enforces Human-in-the-Loop gates for any licensure/liability workflows.
 */

import { prisma } from './db';
import {
  SpatialModelStatus,
  SpatialTargetEngine,
  SpatialArtifactType,
  SpatialLegalMode,
} from '@prisma/client';

// ===========================================
// TYPE DEFINITIONS (matching JSON schemas)
// ===========================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface DoorSpec {
  wall: 'north' | 'south' | 'east' | 'west';
  offset: number;
  width: number;
  height: number;
  swing?: 'left_in' | 'right_in' | 'left_out' | 'right_out' | 'none';
}

export interface WindowSpec {
  wall: 'north' | 'south' | 'east' | 'west';
  offset: number;
  width: number;
  height: number;
  sillHeight?: number;
}

export interface FurnitureSpec {
  name: string;
  width: number;
  length: number;
  height: number;
  position?: Vector3;
  rotationY?: number;
}

export interface RoomSpec {
  name: string;
  width: number;
  length: number;
  height?: number;
  position?: Vector3;
  doors?: DoorSpec[];
  windows?: WindowSpec[];
  furniture?: FurnitureSpec[];
}

export interface LevelSpec {
  name: string;
  elevation?: number;
  rooms: RoomSpec[];
}

export interface LayoutSpec {
  levels: LevelSpec[];
  globalDefaults?: {
    wallThickness?: number;
    ceilingHeight?: number;
    [key: string]: unknown;
  };
}

export interface ReferenceImage {
  type: 'floorplan' | 'sketch' | 'site_plan';
  uri: string;
  notes?: string;
}

export interface GenerationConstraints {
  maxPolygonsHint?: number;
  materialsSimple?: boolean;
  useStandardUnits?: boolean;
  requireCompleteRunnableCode?: boolean;
  templateInjectionSafe?: boolean;
}

export interface LegalMode {
  mode: 'non_authoritative_preview' | 'licensed_review_required' | 'construction_issue_blocked';
  disclaimerText?: string;
  requiresHumanApprovalFor?: string[];
}

export interface SpatialGenerateRequest {
  projectId: string;
  propertyId?: string;
  units: 'metric' | 'imperial';
  targetEngine: 'threejs' | 'babylonjs' | 'unity_csharp';
  layoutSpec: LayoutSpec;
  referenceImages?: ReferenceImage[];
  generationConstraints?: GenerationConstraints;
  legalMode?: LegalMode;
  promptContractId?: string;
}

export interface SpatialIterateRequest {
  projectId: string;
  spatialModelId: string;
  iterationInstructions: string;
  targetEngine?: 'threejs' | 'babylonjs' | 'unity_csharp';
  legalMode?: LegalMode;
}

export interface SpatialExportRequest {
  projectId: string;
  spatialModelId: string;
  format: 'glb' | 'obj';
  exportMode?: 'kimi_generated_script' | 'server_side_converter';
  legalMode?: LegalMode;
}

export interface SpatialArtifact {
  artifactType: 'scene_code' | 'render_preview' | 'export_script' | 'glb_asset' | 'obj_asset' | 'metadata_json';
  uri: string;
  contentType: string;
  sha256?: string;
  inlineContent?: string;
}

export interface AuditEnvelope {
  traceId: string;
  createdAt: string;
  actor: {
    type: 'user' | 'agent' | 'system';
    id: string;
    displayName?: string;
  };
  modelInfo: {
    provider: string;
    model: string;
    promptVersion?: string;
  };
  policy: {
    nonAuthoritative: boolean;
    humanInLoopEnforced: boolean;
  };
}

export interface SpatialGenerateResponse {
  spatialModelId: string;
  status: 'generated' | 'needs_review' | 'blocked';
  nonAuthoritative: true;
  engine: 'threejs' | 'babylonjs' | 'unity_csharp';
  warnings: string[];
  assumptions: string[];
  artifacts: SpatialArtifact[];
  audit: AuditEnvelope;
}

export interface SpatialExportResponse {
  exportId: string;
  format: 'glb' | 'obj';
  artifact: SpatialArtifact;
  audit: AuditEnvelope;
}

// ===========================================
// PROMPT CONTRACTS
// ===========================================

export interface PromptContract {
  id: string;
  version: string;
  targetEngine: string;
  systemInstructions: string[];
  safetyInstructions: string[];
}

export const PROMPT_CONTRACTS: Record<string, PromptContract> = {
  kimi_threejs_full_scene_v1: {
    id: 'kimi_threejs_full_scene_v1',
    version: '1.0',
    targetEngine: 'threejs',
    systemInstructions: [
      'Generate COMPLETE runnable Three.js code.',
      'Use consistent units and state all assumptions clearly.',
      'No external assets unless explicitly provided.',
      'Return code only inside a single code block marked with ```javascript.',
      'Include a metadata JSON block describing walls/doors/windows/furniture with coordinates.',
      'Use OrbitControls for camera interaction.',
      'Include basic ambient and directional lighting.',
      'Use MeshStandardMaterial with appropriate colors for different room types.',
    ],
    safetyInstructions: [
      'Do not claim code compliance or construction suitability.',
      'Add disclaimer in metadata: NOT_FOR_CONSTRUCTION.',
      'Label all outputs as AI_GENERATED and NON_AUTHORITATIVE.',
    ],
  },
  kimi_babylonjs_full_scene_v1: {
    id: 'kimi_babylonjs_full_scene_v1',
    version: '1.0',
    targetEngine: 'babylonjs',
    systemInstructions: [
      'Generate COMPLETE runnable Babylon.js code.',
      'Use consistent units and state all assumptions clearly.',
      'No external assets unless explicitly provided.',
      'Return code only inside a single code block marked with ```javascript.',
      'Include a metadata JSON block describing walls/doors/windows/furniture with coordinates.',
      'Use ArcRotateCamera for interaction.',
      'Include basic hemispheric and directional lighting.',
      'Use StandardMaterial with appropriate colors.',
    ],
    safetyInstructions: [
      'Do not claim code compliance or construction suitability.',
      'Add disclaimer in metadata: NOT_FOR_CONSTRUCTION.',
      'Label all outputs as AI_GENERATED and NON_AUTHORITATIVE.',
    ],
  },
  kimi_unity_csharp_v1: {
    id: 'kimi_unity_csharp_v1',
    version: '1.0',
    targetEngine: 'unity_csharp',
    systemInstructions: [
      'Generate COMPLETE runnable Unity C# script that can be attached to a GameObject.',
      'Use consistent units (1 unit = 1 meter) and state all assumptions clearly.',
      'Create geometry programmatically using primitive meshes.',
      'Return code only inside a single code block marked with ```csharp.',
      'Include a metadata JSON comment block describing walls/doors/windows/furniture with coordinates.',
      'Use MeshRenderer with standard Unity materials.',
    ],
    safetyInstructions: [
      'Do not claim code compliance or construction suitability.',
      'Add disclaimer in metadata: NOT_FOR_CONSTRUCTION.',
      'Label all outputs as AI_GENERATED and NON_AUTHORITATIVE.',
    ],
  },
  kimi_export_blender_script_v1: {
    id: 'kimi_export_blender_script_v1',
    version: '1.0',
    targetEngine: 'blender',
    systemInstructions: [
      'Generate a Blender Python script that reconstructs the scene and exports to GLB.',
      'Script must be runnable headless with: blender --background --python script.py',
      'All dimensions must match the provided layout_spec exactly.',
      'Use bpy.ops.mesh.primitive_* for geometry creation.',
      'Export using bpy.ops.export_scene.gltf with GLB format.',
      'Read layout from a JSON file passed as command line argument or embedded in script.',
    ],
    safetyInstructions: [
      'Do not claim engineering adequacy.',
      'Include disclaimer in exported metadata.',
      'Mark file as AI_GENERATED in custom properties.',
    ],
  },
};

// ===========================================
// POLICY DEFINITIONS
// ===========================================

const LICENSED_ACTIONS = [
  'permit_submission',
  'construction_document_issue',
  'code_compliance_signoff',
  'structural_adequacy_signoff',
  'licensed_stamp',
  'ifc_issue',
];

const DEFAULT_DISCLAIMER = 'AI-generated preview. Not a construction document. Human licensure review required for any regulated use.';

const ARTIFACT_LABELS = ['AI_GENERATED', 'NON_AUTHORITATIVE', 'NOT_FOR_CONSTRUCTION'];

export function isLicensedAction(actionType: string): boolean {
  return LICENSED_ACTIONS.includes(actionType);
}

export function checkPolicyGate(
  actionType: string,
  hasHumanApproval: boolean,
  hasStampedArtifact: boolean
): { blocked: boolean; message?: string } {
  if (isLicensedAction(actionType)) {
    if (!hasHumanApproval) {
      return {
        blocked: true,
        message: `Licensed action '${actionType}' blocked. Human licensed review and attestation required.`,
      };
    }
    if (!hasStampedArtifact) {
      return {
        blocked: true,
        message: `Licensed action '${actionType}' requires uploaded stamped artifact to proceed.`,
      };
    }
  }
  return { blocked: false };
}

// ===========================================
// PROMPT BUILDING
// ===========================================

function formatLayoutSpecForPrompt(layoutSpec: LayoutSpec, units: 'metric' | 'imperial'): string {
  const unitLabel = units === 'metric' ? 'meters' : 'feet';
  
  let prompt = `Here is a JSON layout specification describing a building. All dimensions are in ${unitLabel}.\n\n`;
  prompt += '```json\n';
  prompt += JSON.stringify(layoutSpec, null, 2);
  prompt += '\n```\n\n';
  prompt += 'Please generate complete, runnable 3D scene code based on this specification.\n';
  prompt += 'Ensure all rooms, walls, doors, windows, and furniture are positioned correctly.\n';
  prompt += 'Include proper materials and lighting for visualization.\n';
  
  return prompt;
}

function buildSystemPrompt(contract: PromptContract, constraints?: GenerationConstraints): string {
  let systemPrompt = 'You are an expert 3D scene generator for architectural visualization.\n\n';
  systemPrompt += 'INSTRUCTIONS:\n';
  contract.systemInstructions.forEach((inst, i) => {
    systemPrompt += `${i + 1}. ${inst}\n`;
  });
  
  systemPrompt += '\nSAFETY REQUIREMENTS:\n';
  contract.safetyInstructions.forEach((inst, i) => {
    systemPrompt += `${i + 1}. ${inst}\n`;
  });
  
  if (constraints) {
    systemPrompt += '\nCONSTRAINTS:\n';
    if (constraints.maxPolygonsHint) {
      systemPrompt += `- Maximum polygon hint: ${constraints.maxPolygonsHint}\n`;
    }
    if (constraints.materialsSimple) {
      systemPrompt += '- Use simple materials without textures\n';
    }
    if (constraints.requireCompleteRunnableCode) {
      systemPrompt += '- Code must be complete and runnable without modifications\n';
    }
  }
  
  return systemPrompt;
}

function buildIterationPrompt(originalCode: string, instructions: string): string {
  let prompt = 'Here is the current 3D scene code:\n\n';
  prompt += '```javascript\n';
  prompt += originalCode;
  prompt += '\n```\n\n';
  prompt += 'User requested changes:\n';
  prompt += instructions + '\n\n';
  prompt += 'Please generate the updated complete scene code with the requested changes.\n';
  prompt += 'Maintain all existing functionality and safety labels.\n';
  
  return prompt;
}

function buildExportPrompt(sceneCode: string, format: 'glb' | 'obj', layoutSpec: LayoutSpec): string {
  let prompt = 'Here is a Three.js scene and its layout specification.\n\n';
  prompt += 'Three.js Code:\n```javascript\n';
  prompt += sceneCode;
  prompt += '\n```\n\n';
  prompt += 'Layout Specification:\n```json\n';
  prompt += JSON.stringify(layoutSpec, null, 2);
  prompt += '\n```\n\n';
  prompt += `Generate a Blender Python script that recreates this scene and exports to ${format.toUpperCase()} format.\n`;
  prompt += 'The script should:\n';
  prompt += '1. Read the layout spec (either embedded or from command line)\n';
  prompt += '2. Create all geometry programmatically\n';
  prompt += '3. Apply basic materials\n';
  prompt += `4. Export to ${format.toUpperCase()} format\n`;
  prompt += '5. Be runnable headless with: blender --background --python script.py\n';
  
  return prompt;
}

// ===========================================
// KIMI API INTEGRATION
// ===========================================

const KIMI_API_BASE = 'https://api.moonshot.cn/v1';

interface KimiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface KimiChatRequest {
  model: string;
  messages: KimiMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface KimiChatResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

async function callKimiAPI(request: KimiChatRequest): Promise<KimiChatResponse> {
  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) {
    throw new Error('KIMI_API_KEY environment variable not set');
  }
  
  const response = await fetch(`${KIMI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kimi API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

function extractCodeFromResponse(content: string): { code: string; metadata?: Record<string, unknown> } {
  // Extract JavaScript/C# code block
  const codeMatch = content.match(/```(?:javascript|js|csharp|cs|python)\n([\s\S]*?)```/);
  const code = codeMatch ? codeMatch[1].trim() : '';
  
  // Extract metadata JSON block
  let metadata: Record<string, unknown> | undefined;
  const metadataMatch = content.match(/```json\n([\s\S]*?)```/);
  if (metadataMatch) {
    try {
      metadata = JSON.parse(metadataMatch[1]);
    } catch {
      // Ignore parsing errors
    }
  }
  
  return { code, metadata };
}

function extractWarningsAndAssumptions(content: string): { warnings: string[]; assumptions: string[] } {
  const warnings: string[] = [];
  const assumptions: string[] = [];
  
  // Look for warning/assumption patterns in the response
  const warningMatch = content.match(/(?:WARNINGS?|Notes?):\s*([\s\S]*?)(?=ASSUMPTIONS?|$)/i);
  if (warningMatch) {
    const warningLines = warningMatch[1].split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'));
    warnings.push(...warningLines.map(line => line.replace(/^[\-•]\s*/, '').trim()).filter(Boolean));
  }
  
  const assumptionMatch = content.match(/ASSUMPTIONS?:\s*([\s\S]*?)(?=```|$)/i);
  if (assumptionMatch) {
    const assumptionLines = assumptionMatch[1].split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'));
    assumptions.push(...assumptionLines.map(line => line.replace(/^[\-•]\s*/, '').trim()).filter(Boolean));
  }
  
  return { warnings, assumptions };
}

// ===========================================
// AUDIT LOGGING
// ===========================================

function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

async function createAuditRecord(
  spatialModelId: string | null,
  actor: { type: 'user' | 'agent' | 'system'; id: string; displayName?: string },
  actionType: string,
  actionDetails: Record<string, unknown>,
  promptVersion: string | undefined,
  latencyMs: number,
  tokenEstimate: number,
  requestData?: unknown,
  responseData?: unknown,
  policyBlocksApplied?: string[]
): Promise<string> {
  const audit = await prisma.spatialAudit.create({
    data: {
      spatialModelId,
      actorType: actor.type,
      actorId: actor.id,
      actorDisplayName: actor.displayName,
      actionType,
      actionDetails: actionDetails as Parameters<typeof prisma.spatialAudit.create>[0]['data']['actionDetails'],
      promptVersion,
      latencyMs,
      tokenEstimate,
      requestData: requestData as Parameters<typeof prisma.spatialAudit.create>[0]['data']['requestData'],
      responseData: responseData as Parameters<typeof prisma.spatialAudit.create>[0]['data']['responseData'],
      policyBlocksApplied: policyBlocksApplied || [],
      nonAuthoritative: true,
      humanInLoopEnforced: true,
    },
  });
  
  return audit.traceId;
}

// ===========================================
// CORE SERVICE FUNCTIONS
// ===========================================

export async function generateScene(
  request: SpatialGenerateRequest,
  actor: { type: 'user' | 'agent' | 'system'; id: string; displayName?: string }
): Promise<SpatialGenerateResponse> {
  const startTime = Date.now();
  const traceId = generateTraceId();
  
  // Determine prompt contract
  const contractId = request.promptContractId || `kimi_${request.targetEngine}_full_scene_v1`;
  const contract = PROMPT_CONTRACTS[contractId] || PROMPT_CONTRACTS.kimi_threejs_full_scene_v1;
  
  // Build prompts
  const systemPrompt = buildSystemPrompt(contract, request.generationConstraints);
  const userPrompt = formatLayoutSpecForPrompt(request.layoutSpec, request.units);
  
  // Build messages array
  const messages: KimiMessage[] = [
    { role: 'system', content: systemPrompt },
  ];
  
  // Add reference images if provided (vision mode)
  if (request.referenceImages && request.referenceImages.length > 0) {
    const imageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: 'text', text: userPrompt },
    ];
    
    for (const img of request.referenceImages) {
      imageContent.push({
        type: 'image_url',
        image_url: { url: img.uri },
      });
      if (img.notes) {
        imageContent.push({ type: 'text', text: `Image notes: ${img.notes}` });
      }
    }
    
    messages.push({ role: 'user', content: imageContent });
  } else {
    messages.push({ role: 'user', content: userPrompt });
  }
  
  // Call Kimi API
  const kimiResponse = await callKimiAPI({
    model: 'moonshot-v1-128k',
    messages,
    temperature: 0.3,
    max_tokens: 16000,
  });
  
  const latencyMs = Date.now() - startTime;
  const content = kimiResponse.choices[0]?.message?.content || '';
  
  // Extract code and metadata
  const { code, metadata } = extractCodeFromResponse(content);
  const { warnings, assumptions } = extractWarningsAndAssumptions(content);
  
  // Map target engine to enum
  const engineMap: Record<string, SpatialTargetEngine> = {
    threejs: SpatialTargetEngine.ThreeJS,
    babylonjs: SpatialTargetEngine.BabylonJS,
    unity_csharp: SpatialTargetEngine.UnityCSharp,
  };
  
  // Map legal mode to enum
  const legalModeMap: Record<string, SpatialLegalMode> = {
    non_authoritative_preview: SpatialLegalMode.NonAuthoritativePreview,
    licensed_review_required: SpatialLegalMode.LicensedReviewRequired,
    construction_issue_blocked: SpatialLegalMode.ConstructionIssueBlocked,
  };
  
  // Create spatial model record
  const spatialModel = await prisma.spatialModel.create({
    data: {
      projectId: request.projectId || null,
      propertyId: request.propertyId || null,
      status: SpatialModelStatus.Generated,
      targetEngine: engineMap[request.targetEngine] || SpatialTargetEngine.ThreeJS,
      units: request.units,
      layoutSpec: request.layoutSpec as object,
      referenceImages: request.referenceImages as object[] || [],
      generationConstraints: request.generationConstraints as object || {},
      legalMode: legalModeMap[request.legalMode?.mode || 'non_authoritative_preview'],
      disclaimerText: request.legalMode?.disclaimerText || DEFAULT_DISCLAIMER,
      promptContractId: contractId,
      warnings: warnings,
      assumptions: assumptions,
      createdById: actor.type === 'user' ? actor.id : null,
    },
  });
  
  // Create scene code artifact
  const sceneCodeArtifact = await prisma.spatialArtifact.create({
    data: {
      spatialModelId: spatialModel.id,
      artifactType: SpatialArtifactType.SceneCode,
      uri: `inline:${spatialModel.id}/scene.js`,
      contentType: 'application/javascript',
      inlineContent: code,
      labels: ARTIFACT_LABELS,
      metadata: (metadata || {}) as Parameters<typeof prisma.spatialArtifact.create>[0]['data']['metadata'],
    },
  });
  
  // Create metadata artifact if present
  if (metadata) {
    await prisma.spatialArtifact.create({
      data: {
        spatialModelId: spatialModel.id,
        artifactType: SpatialArtifactType.MetadataJson,
        uri: `inline:${spatialModel.id}/metadata.json`,
        contentType: 'application/json',
        inlineContent: JSON.stringify(metadata, null, 2),
        labels: ARTIFACT_LABELS,
      },
    });
  }
  
  // Create audit record
  await createAuditRecord(
    spatialModel.id,
    actor,
    'generate',
    { contractId, targetEngine: request.targetEngine },
    contract.version,
    latencyMs,
    kimiResponse.usage?.total_tokens || 0,
    { layoutSpec: request.layoutSpec, units: request.units },
    { codeLength: code.length, hasMetadata: !!metadata }
  );
  
  return {
    spatialModelId: spatialModel.spatialModelId,
    status: 'generated',
    nonAuthoritative: true,
    engine: request.targetEngine,
    warnings,
    assumptions,
    artifacts: [
      {
        artifactType: 'scene_code',
        uri: sceneCodeArtifact.uri,
        contentType: 'application/javascript',
        inlineContent: code,
      },
    ],
    audit: {
      traceId,
      createdAt: new Date().toISOString(),
      actor,
      modelInfo: {
        provider: 'kimi',
        model: 'kimi-k2.5',
        promptVersion: contract.version,
      },
      policy: {
        nonAuthoritative: true,
        humanInLoopEnforced: true,
      },
    },
  };
}

export async function iterateScene(
  request: SpatialIterateRequest,
  actor: { type: 'user' | 'agent' | 'system'; id: string; displayName?: string }
): Promise<SpatialGenerateResponse> {
  const startTime = Date.now();
  const traceId = generateTraceId();
  
  // Find existing model
  const existingModel = await prisma.spatialModel.findUnique({
    where: { spatialModelId: request.spatialModelId },
    include: { artifacts: true },
  });
  
  if (!existingModel) {
    throw new Error(`Spatial model not found: ${request.spatialModelId}`);
  }
  
  // Get existing scene code
  const sceneCodeArtifact = existingModel.artifacts.find(
    a => a.artifactType === SpatialArtifactType.SceneCode
  );
  const originalCode = sceneCodeArtifact?.inlineContent || '';
  
  // Determine prompt contract
  const targetEngine = request.targetEngine || 
    (existingModel.targetEngine === SpatialTargetEngine.ThreeJS ? 'threejs' :
     existingModel.targetEngine === SpatialTargetEngine.BabylonJS ? 'babylonjs' : 'unity_csharp');
  const contractId = `kimi_${targetEngine}_full_scene_v1`;
  const contract = PROMPT_CONTRACTS[contractId] || PROMPT_CONTRACTS.kimi_threejs_full_scene_v1;
  
  // Build prompts
  const systemPrompt = buildSystemPrompt(contract);
  const userPrompt = buildIterationPrompt(originalCode, request.iterationInstructions);
  
  // Call Kimi API
  const kimiResponse = await callKimiAPI({
    model: 'moonshot-v1-128k',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 16000,
  });
  
  const latencyMs = Date.now() - startTime;
  const content = kimiResponse.choices[0]?.message?.content || '';
  
  // Extract code and metadata
  const { code, metadata } = extractCodeFromResponse(content);
  const { warnings, assumptions } = extractWarningsAndAssumptions(content);
  
  // Map target engine to enum
  const engineMap: Record<string, SpatialTargetEngine> = {
    threejs: SpatialTargetEngine.ThreeJS,
    babylonjs: SpatialTargetEngine.BabylonJS,
    unity_csharp: SpatialTargetEngine.UnityCSharp,
  };
  
  // Create new spatial model as iteration
  const newModel = await prisma.spatialModel.create({
    data: {
      projectId: existingModel.projectId,
      propertyId: existingModel.propertyId,
      status: SpatialModelStatus.Generated,
      targetEngine: engineMap[targetEngine] || existingModel.targetEngine,
      units: existingModel.units,
      layoutSpec: existingModel.layoutSpec as object,
      referenceImages: existingModel.referenceImages as object[] || [],
      generationConstraints: existingModel.generationConstraints as object || {},
      legalMode: existingModel.legalMode,
      disclaimerText: existingModel.disclaimerText,
      promptContractId: contractId,
      warnings: warnings,
      assumptions: assumptions,
      version: existingModel.version + 1,
      parentModelId: existingModel.id,
      iterationNotes: request.iterationInstructions,
      createdById: actor.type === 'user' ? actor.id : null,
    },
  });
  
  // Create scene code artifact
  const newSceneCodeArtifact = await prisma.spatialArtifact.create({
    data: {
      spatialModelId: newModel.id,
      artifactType: SpatialArtifactType.SceneCode,
      uri: `inline:${newModel.id}/scene.js`,
      contentType: 'application/javascript',
      inlineContent: code,
      labels: ARTIFACT_LABELS,
      metadata: (metadata || {}) as Parameters<typeof prisma.spatialArtifact.create>[0]['data']['metadata'],
    },
  });
  
  // Create audit record
  await createAuditRecord(
    newModel.id,
    actor,
    'iterate',
    { contractId, parentModelId: existingModel.id, instructions: request.iterationInstructions },
    contract.version,
    latencyMs,
    kimiResponse.usage?.total_tokens || 0,
    { iterationInstructions: request.iterationInstructions },
    { codeLength: code.length, hasMetadata: !!metadata }
  );
  
  return {
    spatialModelId: newModel.spatialModelId,
    status: 'generated',
    nonAuthoritative: true,
    engine: targetEngine,
    warnings,
    assumptions,
    artifacts: [
      {
        artifactType: 'scene_code',
        uri: newSceneCodeArtifact.uri,
        contentType: 'application/javascript',
        inlineContent: code,
      },
    ],
    audit: {
      traceId,
      createdAt: new Date().toISOString(),
      actor,
      modelInfo: {
        provider: 'kimi',
        model: 'kimi-k2.5',
        promptVersion: contract.version,
      },
      policy: {
        nonAuthoritative: true,
        humanInLoopEnforced: true,
      },
    },
  };
}

export async function exportScene(
  request: SpatialExportRequest,
  actor: { type: 'user' | 'agent' | 'system'; id: string; displayName?: string }
): Promise<SpatialExportResponse> {
  const startTime = Date.now();
  const traceId = generateTraceId();
  
  // Check policy gates for licensed actions
  if (request.legalMode?.mode === 'construction_issue_blocked') {
    const policyCheck = checkPolicyGate('construction_document_issue', false, false);
    if (policyCheck.blocked) {
      throw new Error(policyCheck.message);
    }
  }
  
  // Find existing model
  const existingModel = await prisma.spatialModel.findUnique({
    where: { spatialModelId: request.spatialModelId },
    include: { artifacts: true },
  });
  
  if (!existingModel) {
    throw new Error(`Spatial model not found: ${request.spatialModelId}`);
  }
  
  // Get existing scene code
  const sceneCodeArtifact = existingModel.artifacts.find(
    a => a.artifactType === SpatialArtifactType.SceneCode
  );
  const sceneCode = sceneCodeArtifact?.inlineContent || '';
  
  // Get the prompt contract for export
  const contract = PROMPT_CONTRACTS.kimi_export_blender_script_v1;
  
  // Build export prompt
  const systemPrompt = buildSystemPrompt(contract);
  const userPrompt = buildExportPrompt(sceneCode, request.format, existingModel.layoutSpec as unknown as LayoutSpec);
  
  // Call Kimi API
  const kimiResponse = await callKimiAPI({
    model: 'moonshot-v1-128k',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 16000,
  });
  
  const latencyMs = Date.now() - startTime;
  const content = kimiResponse.choices[0]?.message?.content || '';
  
  // Extract Python script
  const scriptMatch = content.match(/```python\n([\s\S]*?)```/);
  const exportScript = scriptMatch ? scriptMatch[1].trim() : '';
  
  // Create export record
  const exportRecord = await prisma.spatialExport.create({
    data: {
      spatialModelId: existingModel.id,
      format: request.format,
      exportMode: request.exportMode || 'kimi_generated_script',
      status: 'completed',
      requestedById: actor.type === 'user' ? actor.id : null,
      completedAt: new Date(),
    },
  });
  
  // Create export script artifact
  const exportArtifact = await prisma.spatialArtifact.create({
    data: {
      spatialModelId: existingModel.id,
      artifactType: SpatialArtifactType.ExportScript,
      uri: `inline:${existingModel.id}/export_${request.format}.py`,
      contentType: 'text/x-python',
      inlineContent: exportScript,
      labels: ARTIFACT_LABELS,
    },
  });
  
  // Create audit record
  await createAuditRecord(
    existingModel.id,
    actor,
    'export',
    { exportId: exportRecord.exportId, format: request.format, exportMode: request.exportMode },
    contract.version,
    latencyMs,
    kimiResponse.usage?.total_tokens || 0,
    { format: request.format },
    { scriptLength: exportScript.length }
  );
  
  return {
    exportId: exportRecord.exportId,
    format: request.format,
    artifact: {
      artifactType: 'export_script',
      uri: exportArtifact.uri,
      contentType: 'text/x-python',
      inlineContent: exportScript,
    },
    audit: {
      traceId,
      createdAt: new Date().toISOString(),
      actor,
      modelInfo: {
        provider: 'kimi',
        model: 'kimi-k2.5',
        promptVersion: contract.version,
      },
      policy: {
        nonAuthoritative: true,
        humanInLoopEnforced: true,
      },
    },
  };
}

// ===========================================
// QUERY FUNCTIONS
// ===========================================

export async function getSpatialModel(spatialModelId: string) {
  return prisma.spatialModel.findUnique({
    where: { spatialModelId },
    include: {
      artifacts: true,
      exports: true,
      annotations: true,
      audits: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      approvals: true,
      parentModel: {
        select: { spatialModelId: true, version: true },
      },
      iterations: {
        select: { spatialModelId: true, version: true, createdAt: true },
        orderBy: { version: 'desc' },
      },
      project: {
        select: { id: true, name: true, projectNumber: true },
      },
      property: {
        select: { id: true, name: true },
      },
    },
  });
}

export async function listSpatialModels(params: {
  projectId?: string;
  propertyId?: string;
  status?: SpatialModelStatus;
  createdById?: string;
  skip?: number;
  take?: number;
}) {
  const where: Record<string, unknown> = {};
  
  if (params.projectId) where.projectId = params.projectId;
  if (params.propertyId) where.propertyId = params.propertyId;
  if (params.status) where.status = params.status;
  if (params.createdById) where.createdById = params.createdById;
  
  const [models, total] = await Promise.all([
    prisma.spatialModel.findMany({
      where,
      include: {
        project: { select: { name: true, projectNumber: true } },
        property: { select: { name: true } },
        artifacts: { where: { artifactType: SpatialArtifactType.SceneCode } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: params.skip || 0,
      take: params.take || 20,
    }),
    prisma.spatialModel.count({ where }),
  ]);
  
  return { models, total };
}

export async function getAuditTrail(spatialModelId: string) {
  return prisma.spatialAudit.findMany({
    where: { spatialModelId },
    orderBy: { createdAt: 'desc' },
  });
}
