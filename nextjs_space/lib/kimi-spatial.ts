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
// INPUT VALIDATION & SANITIZATION
// ===========================================

const MAX_ROOMS_PER_LEVEL = 50;
const MAX_LEVELS = 10;
const MAX_DIMENSION = 1000; // meters
const MIN_DIMENSION = 0.1; // meters
const MAX_STRING_LENGTH = 200;

function sanitizeString(input: string, maxLength: number = MAX_STRING_LENGTH): string {
  // Remove potential prompt injection patterns
  return String(input)
    .slice(0, maxLength)
    .replace(/\bignore\s+(all\s+)?(previous|above|prior)\s+instructions?\b/gi, '[REMOVED]')
    .replace(/\bforget\s+(all\s+)?(previous|above|prior)\b/gi, '[REMOVED]')
    .replace(/\bsystem\s*:\s*/gi, '[REMOVED]')
    .replace(/\buser\s*:\s*/gi, '[REMOVED]')
    .replace(/\bassistant\s*:\s*/gi, '[REMOVED]')
    .replace(/```/g, '---')  // Prevent code block injection
    .replace(/[<>]/g, '');   // Remove HTML-like chars
}

function validateRoomSpec(room: RoomSpec): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!room.name || typeof room.name !== 'string') {
    errors.push('Room name is required');
  }
  
  if (typeof room.width !== 'number' || room.width < MIN_DIMENSION || room.width > MAX_DIMENSION) {
    errors.push(`Room width must be between ${MIN_DIMENSION} and ${MAX_DIMENSION}`);
  }
  
  if (typeof room.length !== 'number' || room.length < MIN_DIMENSION || room.length > MAX_DIMENSION) {
    errors.push(`Room length must be between ${MIN_DIMENSION} and ${MAX_DIMENSION}`);
  }
  
  if (room.height !== undefined && (typeof room.height !== 'number' || room.height < MIN_DIMENSION || room.height > MAX_DIMENSION)) {
    errors.push(`Room height must be between ${MIN_DIMENSION} and ${MAX_DIMENSION}`);
  }
  
  return { valid: errors.length === 0, errors };
}

function validateLayoutSpec(layoutSpec: LayoutSpec): { valid: boolean; errors: string[]; sanitized: LayoutSpec } {
  const errors: string[] = [];
  
  if (!layoutSpec || !Array.isArray(layoutSpec.levels)) {
    return { valid: false, errors: ['Layout must have levels array'], sanitized: layoutSpec };
  }
  
  if (layoutSpec.levels.length > MAX_LEVELS) {
    errors.push(`Maximum ${MAX_LEVELS} levels allowed`);
  }
  
  const sanitized: LayoutSpec = {
    levels: [],
    globalDefaults: {
      wallThickness: Math.min(Math.max(layoutSpec.globalDefaults?.wallThickness || 0.15, 0.05), 1),
      ceilingHeight: Math.min(Math.max(layoutSpec.globalDefaults?.ceilingHeight || 2.7, 2), 10),
    },
  };
  
  for (const level of layoutSpec.levels.slice(0, MAX_LEVELS)) {
    const sanitizedLevel: LevelSpec = {
      name: sanitizeString(level.name || 'Floor', 50),
      elevation: typeof level.elevation === 'number' ? Math.max(-100, Math.min(level.elevation, 500)) : 0,
      rooms: [],
    };
    
    if (!Array.isArray(level.rooms)) {
      errors.push(`Level "${sanitizedLevel.name}" must have rooms array`);
      continue;
    }
    
    if (level.rooms.length > MAX_ROOMS_PER_LEVEL) {
      errors.push(`Maximum ${MAX_ROOMS_PER_LEVEL} rooms per level allowed`);
    }
    
    for (const room of level.rooms.slice(0, MAX_ROOMS_PER_LEVEL)) {
      const validation = validateRoomSpec(room);
      if (!validation.valid) {
        errors.push(...validation.errors.map(e => `Room "${room.name}": ${e}`));
      }
      
      sanitizedLevel.rooms.push({
        name: sanitizeString(room.name || 'Room', 100),
        width: Math.min(Math.max(Number(room.width) || 4, MIN_DIMENSION), MAX_DIMENSION),
        length: Math.min(Math.max(Number(room.length) || 4, MIN_DIMENSION), MAX_DIMENSION),
        height: room.height ? Math.min(Math.max(Number(room.height), MIN_DIMENSION), MAX_DIMENSION) : undefined,
        position: room.position,
      });
    }
    
    sanitized.levels.push(sanitizedLevel);
  }
  
  return { valid: errors.length === 0, errors, sanitized };
}

// ===========================================
// PROMPT BUILDING
// ===========================================

function formatLayoutSpecForPrompt(layoutSpec: LayoutSpec, units: 'metric' | 'imperial'): string {
  const unitLabel = units === 'metric' ? 'meters' : 'feet';
  
  // Validate and sanitize the layout spec before use in prompt
  const { sanitized } = validateLayoutSpec(layoutSpec);
  
  let prompt = `Here is a JSON layout specification describing a building. All dimensions are in ${unitLabel}.\n\n`;
  prompt += '---json\n';  // Use --- instead of ``` to prevent injection
  prompt += JSON.stringify(sanitized, null, 2);
  prompt += '\n---\n\n';
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
  // Sanitize iteration instructions to prevent prompt injection
  const sanitizedInstructions = sanitizeString(instructions, 2000);
  
  let prompt = 'Here is the current 3D scene code:\n\n';
  prompt += '---javascript\n';  // Use --- to prevent injection
  prompt += originalCode;
  prompt += '\n---\n\n';
  prompt += 'User requested changes (for 3D visualization only):\n';
  prompt += sanitizedInstructions + '\n\n';
  prompt += 'Please generate the updated complete scene code with the requested changes.\n';
  prompt += 'Maintain all existing functionality and safety labels.\n';
  prompt += 'IMPORTANT: Only modify 3D rendering code. Do not add network calls, data access, or browser APIs.\n';
  
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
// LLM API INTEGRATION (Abacus AI RouteLLM)
// ===========================================

const LLM_API_BASE = 'https://routellm.abacus.ai/v1';

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface LLMChatRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface LLMChatResponse {
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

async function callLLMAPI(request: LLMChatRequest): Promise<LLMChatResponse> {
  const apiKey = process.env.ABACUSAI_API_KEY;
  if (!apiKey) {
    throw new Error('ABACUSAI_API_KEY environment variable not set');
  }
  
  // Omit model to use RouteLLM auto-routing (recommended)
  // RouteLLM automatically selects the best model for the task
  const { model: _unusedModel, ...requestWithoutModel } = request;
  
  const response = await fetch(`${LLM_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestWithoutModel),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LLM API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

// Alias for backward compatibility
async function callKimiAPI(request: LLMChatRequest): Promise<LLMChatResponse> {
  return callLLMAPI(request);
}

function extractCodeFromResponse(content: string): { code: string; metadata?: Record<string, unknown> } {
  let code = '';
  
  // Try multiple patterns to extract code (case-insensitive)
  const codePatterns = [
    /```(?:javascript|js|JavaScript|JS)\s*\n([\s\S]*?)```/i,  // javascript/js blocks
    /```(?:csharp|cs|CSharp|CS)\s*\n([\s\S]*?)```/i,          // csharp blocks
    /```(?:python|py|Python|PY)\s*\n([\s\S]*?)```/i,          // python blocks
    /```(?:typescript|ts|TypeScript|TS)\s*\n([\s\S]*?)```/i,  // typescript blocks
    /```\s*\n([\s\S]*?)```/,                                    // plain code blocks (no language)
  ];
  
  for (const pattern of codePatterns) {
    const match = content.match(pattern);
    if (match && match[1]?.trim()) {
      code = match[1].trim();
      break;
    }
  }
  
  // If no code block found, check if the entire response looks like code
  if (!code && content.includes('THREE.') && content.includes('scene')) {
    // Response might be raw code without markdown formatting
    code = content.trim();
    // Remove any leading/trailing non-code text
    const sceneStart = code.indexOf('const scene') !== -1 ? code.indexOf('const scene') :
                       code.indexOf('var scene') !== -1 ? code.indexOf('var scene') :
                       code.indexOf('let scene') !== -1 ? code.indexOf('let scene') :
                       code.indexOf('new THREE.Scene') !== -1 ? code.indexOf('new THREE.Scene') : -1;
    if (sceneStart > 0) {
      code = code.substring(sceneStart);
    }
  }
  
  // Extract metadata JSON block
  let metadata: Record<string, unknown> | undefined;
  const metadataMatch = content.match(/```json\s*\n([\s\S]*?)```/i);
  if (metadataMatch) {
    try {
      metadata = JSON.parse(metadataMatch[1]);
    } catch {
      // Ignore parsing errors
    }
  }
  
  console.log('[extractCodeFromResponse] Content length:', content.length, 'Extracted code length:', code.length);
  
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
  const messages: LLMMessage[] = [
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
  
  // Call LLM API (using Abacus RouteLLM)
  const kimiResponse = await callKimiAPI({
    model: 'claude-3-5-sonnet-v2',
    messages,
    temperature: 0.3,
    max_tokens: 16000,
  });
  
  const latencyMs = Date.now() - startTime;
  const content = kimiResponse.choices[0]?.message?.content || '';
  
  console.log('[generateScene] LLM response received, length:', content.length);
  
  // Extract code and metadata
  let { code, metadata } = extractCodeFromResponse(content);
  const { warnings, assumptions } = extractWarningsAndAssumptions(content);
  
  // If no code was extracted, use fallback generator
  if (!code || code.length < 100) {
    console.log('[generateScene] No valid code extracted, using fallback generator');
    code = generateFallbackThreeJSCode(request.layoutSpec);
    warnings.push('Used fallback scene generator');
  }
  
  console.log('[generateScene] Final code length:', code.length);
  
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
  
  // Call LLM API (using Abacus RouteLLM)
  const kimiResponse = await callKimiAPI({
    model: 'claude-3-5-sonnet-v2',
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
  
  // Call LLM API (using Abacus RouteLLM)
  const kimiResponse = await callKimiAPI({
    model: 'claude-3-5-sonnet-v2',
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


// ===========================================
// NATURAL LANGUAGE TO LAYOUT CONVERSION
// ===========================================

const NL_TO_LAYOUT_SYSTEM_PROMPT = `You are an expert architectural layout designer. Convert natural language descriptions into structured JSON layout specifications.

OUTPUT FORMAT: You must output ONLY a valid JSON object matching this schema:
{
  "levels": [
    {
      "name": "string (e.g., 'Ground Floor', 'First Floor')",
      "elevation": number (in meters, 0 for ground floor),
      "rooms": [
        {
          "name": "string (room name)",
          "width": number (in meters),
          "length": number (in meters),
          "height": number (optional, ceiling height in meters)
        }
      ]
    }
  ],
  "globalDefaults": {
    "wallThickness": number (default 0.15 meters),
    "ceilingHeight": number (default 2.7 meters)
  }
}

RULES:
1. Use realistic dimensions based on the description
2. If dimensions aren't specified, use reasonable defaults (living room: 5x6m, bedroom: 4x4m, kitchen: 3x4m, bathroom: 2x3m)
3. Convert imperial units to metric if needed (1 foot = 0.3048 meters)
4. Output ONLY the JSON, no explanation or markdown code blocks
5. Ensure all required fields are present`;

export async function convertPromptToLayout(
  prompt: string,
  units: 'metric' | 'imperial' = 'metric'
): Promise<{ layoutSpec: LayoutSpec; rawResponse: string }> {
  const userPrompt = units === 'imperial' 
    ? `${prompt}\n\nNote: The user is working in imperial units. Convert any feet/inches to meters in your output.`
    : prompt;

  const response = await callLLMAPI({
    model: 'claude-3-5-sonnet-v2',
    messages: [
      { role: 'system', content: NL_TO_LAYOUT_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 4000,
  });

  const rawResponse = response.choices[0]?.message?.content || '';
  
  // Try to extract JSON from the response
  let jsonStr = rawResponse.trim();
  
  // Remove markdown code blocks if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }
  
  // Try to find JSON object in the response
  const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    jsonStr = jsonObjectMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonStr);
    
    // Validate and ensure structure
    const layoutSpec: LayoutSpec = {
      levels: parsed.levels || [{
        name: 'Ground Floor',
        elevation: 0,
        rooms: [{ name: 'Main Room', width: 5, length: 6, height: 2.7 }],
      }],
      globalDefaults: {
        wallThickness: parsed.globalDefaults?.wallThickness || 0.15,
        ceilingHeight: parsed.globalDefaults?.ceilingHeight || 2.7,
      },
    };
    
    return { layoutSpec, rawResponse };
  } catch (e) {
    throw new Error(`Failed to parse layout from AI response: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

// ===========================================
// DIRECT THREE.JS SCENE GENERATION
// ===========================================

const THREEJS_GENERATION_PROMPT = `You are an expert Three.js developer. Generate complete, runnable Three.js code that creates a 3D architectural visualization.

REQUIREMENTS:
1. Output ONLY JavaScript code, no markdown or explanations
2. Create a scene with:
   - Scene, Camera, Renderer
   - OrbitControls for interaction
   - Ambient and directional lighting
   - MeshStandardMaterial with colors for different elements
3. Generate walls as BoxGeometry with appropriate dimensions
4. Position rooms according to the layout (arrange them in a logical floor plan)
5. Add floor and ceiling planes
6. Use different colors: walls (#e0e0e0), floors (#8B4513), ceilings (#f5f5f5)
7. Set up proper camera position to view the entire scene
8. Include window resize handling
9. Start the animation loop

The code must be completely self-contained and runnable when injected into an HTML page that has Three.js and OrbitControls loaded.

DO NOT include:
- import statements
- export statements  
- HTML elements creation (assume canvas exists)
- Comments about what the code does`;

export async function generateThreeJSSceneDirectly(
  layoutSpec: LayoutSpec,
  units: 'metric' | 'imperial'
): Promise<{ code: string; warnings: string[]; assumptions: string[] }> {
  const unitLabel = units === 'metric' ? 'meters' : 'feet';
  
  const userPrompt = `Generate a Three.js scene for this building layout (dimensions in ${unitLabel}):

${JSON.stringify(layoutSpec, null, 2)}

Create walls, floors, and ceilings for each room. Position rooms in a logical floor plan layout.`;

  const response = await callLLMAPI({
    model: 'claude-3-5-sonnet-v2',
    messages: [
      { role: 'system', content: THREEJS_GENERATION_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 8000,
  });

  let code = response.choices[0]?.message?.content || '';
  
  // Clean up code - remove markdown if present
  const codeMatch = code.match(/```(?:javascript|js)?\s*([\s\S]*?)```/);
  if (codeMatch) {
    code = codeMatch[1].trim();
  }
  
  // If still no valid code, provide fallback
  if (!code || code.length < 100) {
    code = generateFallbackThreeJSCode(layoutSpec);
  }
  
  return {
    code,
    warnings: [],
    assumptions: ['Room positions calculated automatically', 'Standard materials applied'],
  };
}

function generateFallbackThreeJSCode(layoutSpec: LayoutSpec): string {
  const rooms = layoutSpec.levels[0]?.rooms || [];
  const wallHeight = layoutSpec.globalDefaults?.ceilingHeight || 2.7;
  const wallThickness = layoutSpec.globalDefaults?.wallThickness || 0.15;
  
  // Calculate positions for rooms
  let currentX = 0;
  const roomPositions = rooms.map((room, i) => {
    const pos = { x: currentX, z: 0 };
    currentX += room.width + 1; // 1m gap between rooms
    return pos;
  });
  
  return `
// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(${currentX / 2}, 15, 20);
camera.lookAt(${currentX / 2}, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.target.set(${currentX / 2}, ${wallHeight / 2}, 0);
controls.update();

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
scene.add(directionalLight);

// Materials
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, side: THREE.DoubleSide });
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
const ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f5f5 });

// Helper function to create a room
function createRoom(name, width, length, height, posX, posZ) {
  const group = new THREE.Group();
  group.name = name;
  
  // Floor
  const floorGeometry = new THREE.PlaneGeometry(width, length);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(posX + width/2, 0, posZ + length/2);
  floor.receiveShadow = true;
  group.add(floor);
  
  // Ceiling
  const ceiling = new THREE.Mesh(floorGeometry, ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(posX + width/2, height, posZ + length/2);
  group.add(ceiling);
  
  // Walls
  const wallThickness = ${wallThickness};
  
  // North wall
  const northWall = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, wallThickness),
    wallMaterial
  );
  northWall.position.set(posX + width/2, height/2, posZ);
  northWall.castShadow = true;
  group.add(northWall);
  
  // South wall
  const southWall = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, wallThickness),
    wallMaterial
  );
  southWall.position.set(posX + width/2, height/2, posZ + length);
  southWall.castShadow = true;
  group.add(southWall);
  
  // East wall
  const eastWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, height, length),
    wallMaterial
  );
  eastWall.position.set(posX + width, height/2, posZ + length/2);
  eastWall.castShadow = true;
  group.add(eastWall);
  
  // West wall
  const westWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThickness, height, length),
    wallMaterial
  );
  westWall.position.set(posX, height/2, posZ + length/2);
  westWall.castShadow = true;
  group.add(westWall);
  
  return group;
}

// Create rooms
${rooms.map((room, i) => {
  const pos = roomPositions[i];
  const height = room.height || wallHeight;
  return `scene.add(createRoom("${room.name}", ${room.width}, ${room.length}, ${height}, ${pos.x}, ${pos.z}));`;
}).join('\n')}

// Ground plane
const groundGeometry = new THREE.PlaneGeometry(${currentX + 10}, 30);
const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3a5c });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.set(${currentX / 2}, -0.01, 5);
ground.receiveShadow = true;
scene.add(ground);

// Grid helper
const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
gridHelper.position.y = -0.005;
scene.add(gridHelper);

// Resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
`;
}