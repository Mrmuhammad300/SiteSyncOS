import { prisma } from './db';
import {
  AgentType,
  AutonomyLevel,
  AgentExecutionStatus,
  DomainEventType,
} from '@prisma/client';

// ============================================
// AGENT DEFINITIONS
// ============================================

export interface AgentDefinition {
  id: string;
  name: string;
  type: AgentType;
  description: string;
  autonomyLevel: AutonomyLevel;
  triggers?: string[];
  inputs?: string[];
  outputs: string[];
  monitors?: string[];
  actions?: string[];
  ruleset?: string[];
  onViolation?: string;
  routingLogic?: string;
  integrations?: string[];
  scenarios?: string[];
  tools?: string[];
  failurePolicy?: string;
  resolutionStrategy?: string;
  memoryTypes?: string[];
  learningSignals?: string[];
  sources?: string[];
  constraints?: string[];
  formats?: string[];
}

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: 'human_oversight_liaison',
    name: 'Human Oversight Liaison',
    type: 'InterfaceAgent',
    description: 'Acts as the bridge between AI agents and human users. Translates AI outputs into human-readable actions and routes approvals.',
    autonomyLevel: 'AdvisoryOnly',
    triggers: ['approval_required', 'confidence_below_threshold', 'regulatory_flag'],
    outputs: ['approval_request', 'explanation_summary', 'decision_context'],
  },
  {
    id: 'decision_advisor',
    name: 'Decision Advisor',
    type: 'ReasoningAgent',
    description: 'Provides context-aware recommendations, highlights trade-offs, risks, and alternative paths.',
    autonomyLevel: 'DraftWithApproval',
    inputs: ['project_data', 'financial_models', 'risk_scores'],
    outputs: ['recommended_action', 'alternative_options', 'confidence_score'],
  },
  {
    id: 'collective_ai_overseer',
    name: 'Collective AI Overseer',
    type: 'GovernanceAgent',
    description: 'Monitors overall system health, agent behavior, and alignment with SiteSync objectives.',
    autonomyLevel: 'AutoExecuteThreshold',
    monitors: ['agent_conflicts', 'execution_failures', 'performance_drift'],
    actions: ['throttle_agents', 'escalate_to_human', 'log_system_event'],
    outputs: ['system_health_report', 'agent_performance_metrics'],
  },
  {
    id: 'ethical_alignment_council',
    name: 'Ethical Alignment Council',
    type: 'PolicyAgent',
    description: 'Ensures outputs align with ethical, legal, and organizational constraints.',
    autonomyLevel: 'DraftWithApproval',
    ruleset: ['no_unapproved_commitments', 'no_financial_advice_without_disclaimer', 'no_regulatory_overreach'],
    onViolation: 'block_and_escalate',
    outputs: ['policy_compliance_report', 'violation_flags'],
  },
  {
    id: 'ai_risk_sentinel',
    name: 'AI Risk Sentinel',
    type: 'RiskAgent',
    description: 'Detects bias, hallucinations, overconfidence, and unintended consequences.',
    autonomyLevel: 'AutoExecuteThreshold',
    monitors: ['confidence_vs_data', 'source_verification', 'anomaly_detection'],
    outputs: ['risk_flag', 'confidence_adjustment'],
  },
  {
    id: 'transparency_officer',
    name: 'Transparency Officer',
    type: 'AuditAgent',
    description: 'Maintains explainability and audit trails for AI-assisted decisions.',
    autonomyLevel: 'AdvisoryOnly',
    outputs: ['decision_path', 'data_sources', 'agent_interactions'],
  },
  {
    id: 'agent_ecosystem_orchestrator',
    name: 'Agent Ecosystem Orchestrator',
    type: 'CoordinationAgent',
    description: 'Routes tasks to specialized agents and manages execution order.',
    autonomyLevel: 'AutoExecuteThreshold',
    routingLogic: 'mixture_of_experts',
    integrations: ['n8n', 'external_ai_services', 'design_callbacks', 'trellis_3d_generation', 'moe_grounding_engine'],
    outputs: ['task_routing_plan', 'execution_sequence', 'moe_grounding_result'],
  },
  {
    id: 'meta_reasoning_agent',
    name: 'Meta-Reasoning Agent',
    type: 'QualityControlAgent',
    description: 'Evaluates AI outputs for logic, consistency, and reasoning gaps.',
    autonomyLevel: 'DraftWithApproval',
    inputs: ['agent_outputs'],
    actions: ['request_revision', 'approve_output', 'flag_inconsistency'],
    outputs: ['quality_assessment', 'revision_requests'],
  },
  {
    id: 'strategic_futures_simulator',
    name: 'Strategic Futures Simulator',
    type: 'SimulationAgent',
    description: 'Models long-term outcomes, scenario variations, and downstream impacts.',
    autonomyLevel: 'DraftWithApproval',
    scenarios: ['best_case', 'base_case', 'worst_case'],
    outputs: ['scenario_comparison', 'risk_adjusted_recommendation'],
  },
  {
    id: 'workflow_automation_engine',
    name: 'Workflow Automation Engine',
    type: 'ExecutionAgent',
    description: 'Executes approved workflows via APIs and automation tools.',
    autonomyLevel: 'AutoExecuteThreshold',
    tools: ['n8n', 'webhooks', 'internal_api'],
    failurePolicy: 'retry_then_escalate',
    outputs: ['execution_result', 'workflow_status'],
  },
  {
    id: 'inter_agent_mediator',
    name: 'Inter-Agent Mediator',
    type: 'ConsensusAgent',
    description: 'Resolves conflicts between agents and enforces consensus rules.',
    autonomyLevel: 'DraftWithApproval',
    resolutionStrategy: 'confidence_weighted_vote',
    outputs: ['consensus_decision', 'conflict_resolution'],
  },
  {
    id: 'collective_memory_curator',
    name: 'Collective Memory Curator',
    type: 'KnowledgeAgent',
    description: 'Stores, retrieves, and organizes shared system knowledge.',
    autonomyLevel: 'AutoExecuteThreshold',
    memoryTypes: ['project_history', 'decisions', 'outcomes'],
    outputs: ['retrieved_knowledge', 'memory_update'],
  },
  {
    id: 'learning_and_evolution_coach',
    name: 'Learning & Evolution Coach',
    type: 'LearningAgent',
    description: 'Improves agent behavior based on feedback and outcomes.',
    autonomyLevel: 'ContinuousOptimization',
    learningSignals: ['human_corrections', 'outcome_success', 'error_frequency'],
    outputs: ['learning_insights', 'behavior_adjustments'],
  },
  {
    id: 'truth_and_evidence_validator',
    name: 'Truth & Evidence Validator',
    type: 'VerificationAgent',
    description: 'Validates claims against internal and external sources.',
    autonomyLevel: 'DraftWithApproval',
    sources: ['internal_documents', 'approved_external_apis'],
    outputs: ['validation_result', 'evidence_citations'],
  },
  {
    id: 'innovation_catalyst',
    name: 'Innovation Catalyst',
    type: 'CreativeAgent',
    description: 'Generates novel approaches, alternatives, and optimizations.',
    autonomyLevel: 'AdvisoryOnly',
    constraints: ['no_execution_authority'],
    outputs: ['creative_alternatives', 'optimization_suggestions'],
  },
  {
    id: 'design_and_narrative_synthesizer',
    name: 'Design & Narrative Synthesizer',
    type: 'CommunicationAgent',
    description: 'Transforms complex outputs into human-friendly narratives.',
    autonomyLevel: 'AdvisoryOnly',
    formats: ['executive_summary', 'investor_memo', 'city_ready_language'],
    outputs: ['formatted_narrative', 'stakeholder_report'],
  },
];

// ============================================
// AGENT DEPENDENCY GRAPH
// ============================================

export interface AgentEdge {
  from: string;
  to: string;
  type: 'routes_to' | 'executes_via' | 'quality_checks_with' | 'verifies_with' | 'models_with' | 
        'risk_checks_with' | 'escalates_to' | 'requires_human' | 'reports_to' | 'resolves_with' |
        'stores_to' | 'learns_from' | 'validates_with' | 'synthesizes_with';
}

export const AGENT_DEPENDENCY_GRAPH: AgentEdge[] = [
  { from: 'agent_ecosystem_orchestrator', to: 'decision_advisor', type: 'routes_to' },
  { from: 'agent_ecosystem_orchestrator', to: 'workflow_automation_engine', type: 'executes_via' },
  { from: 'agent_ecosystem_orchestrator', to: 'meta_reasoning_agent', type: 'quality_checks_with' },
  { from: 'decision_advisor', to: 'truth_and_evidence_validator', type: 'verifies_with' },
  { from: 'decision_advisor', to: 'strategic_futures_simulator', type: 'models_with' },
  { from: 'meta_reasoning_agent', to: 'ai_risk_sentinel', type: 'risk_checks_with' },
  { from: 'ai_risk_sentinel', to: 'ethical_alignment_council', type: 'escalates_to' },
  { from: 'ethical_alignment_council', to: 'human_oversight_liaison', type: 'requires_human' },
  { from: 'workflow_automation_engine', to: 'collective_ai_overseer', type: 'reports_to' },
  { from: 'inter_agent_mediator', to: 'decision_advisor', type: 'resolves_with' },
  { from: 'collective_memory_curator', to: 'decision_advisor', type: 'stores_to' },
  { from: 'learning_and_evolution_coach', to: 'collective_ai_overseer', type: 'learns_from' },
  { from: 'truth_and_evidence_validator', to: 'collective_memory_curator', type: 'validates_with' },
  { from: 'design_and_narrative_synthesizer', to: 'human_oversight_liaison', type: 'synthesizes_with' },
  { from: 'innovation_catalyst', to: 'decision_advisor', type: 'routes_to' },
  { from: 'transparency_officer', to: 'collective_ai_overseer', type: 'reports_to' },
];

// ============================================
// EVENT-AGENT BINDINGS
// ============================================

export interface EventBinding {
  eventType: DomainEventType;
  pipeline: string[];
  autonomyLevel: AutonomyLevel;
  finalOutput: string;
  requiresAudit?: boolean;
  blockOnRiskFlag?: boolean;
  minConfidence?: number;
  hardBlockIf?: string[];
  autoExecutionThreshold?: number;
}

export const EVENT_AGENT_BINDINGS: EventBinding[] = [
  // Project Events
  {
    eventType: 'ProjectCreated',
    pipeline: ['agent_ecosystem_orchestrator', 'decision_advisor', 'ai_risk_sentinel', 'collective_memory_curator', 'transparency_officer'],
    autonomyLevel: 'DraftWithApproval',
    finalOutput: 'project_initialization_packet',
    minConfidence: 0.7,
  },
  {
    eventType: 'ProjectUpdated',
    pipeline: ['decision_advisor', 'meta_reasoning_agent', 'ai_risk_sentinel', 'transparency_officer'],
    autonomyLevel: 'DraftWithApproval',
    finalOutput: 'change_impact_summary',
  },
  // RFI Events
  {
    eventType: 'RfiCreated',
    pipeline: ['decision_advisor', 'truth_and_evidence_validator', 'meta_reasoning_agent', 'transparency_officer'],
    autonomyLevel: 'DraftWithApproval',
    finalOutput: 'draft_rfi_response',
  },
  {
    eventType: 'RfiResponseReceived',
    pipeline: ['meta_reasoning_agent', 'human_oversight_liaison', 'collective_memory_curator'],
    autonomyLevel: 'AdvisoryOnly',
    finalOutput: 'human_action_summary',
  },
  {
    eventType: 'RfiOverdue',
    pipeline: ['workflow_automation_engine', 'collective_ai_overseer', 'human_oversight_liaison'],
    autonomyLevel: 'AutoExecuteThreshold',
    finalOutput: 'escalation_action',
    autoExecutionThreshold: 0.85,
  },
  // Submittal Events
  {
    eventType: 'SubmittalCreated',
    pipeline: ['agent_ecosystem_orchestrator', 'truth_and_evidence_validator', 'meta_reasoning_agent', 'transparency_officer'],
    autonomyLevel: 'DraftWithApproval',
    finalOutput: 'submittal_review_packet',
  },
  {
    eventType: 'SubmittalReviewed',
    pipeline: ['human_oversight_liaison', 'design_and_narrative_synthesizer', 'collective_memory_curator'],
    autonomyLevel: 'AdvisoryOnly',
    finalOutput: 'review_summary',
  },
  // Change Order Events
  {
    eventType: 'ChangeOrderCreated',
    pipeline: ['strategic_futures_simulator', 'decision_advisor', 'ai_risk_sentinel', 'ethical_alignment_council', 'transparency_officer'],
    autonomyLevel: 'DraftWithApproval',
    finalOutput: 'change_order_impact_analysis',
  },
  {
    eventType: 'ChangeOrderApprovalRequested',
    pipeline: ['ethical_alignment_council', 'ai_risk_sentinel', 'transparency_officer', 'human_oversight_liaison'],
    autonomyLevel: 'DraftWithApproval',
    finalOutput: 'approval_packet',
    hardBlockIf: ['missing_scope', 'missing_cost_basis'],
  },
  {
    eventType: 'ChangeOrderApproved',
    pipeline: ['workflow_automation_engine', 'collective_ai_overseer', 'transparency_officer'],
    autonomyLevel: 'AutoExecuteThreshold',
    finalOutput: 'executed_change_order',
    autoExecutionThreshold: 0.9,
  },
  // Punch List Events
  {
    eventType: 'PunchItemCreated',
    pipeline: ['workflow_automation_engine', 'decision_advisor', 'transparency_officer'],
    autonomyLevel: 'AutoExecuteThreshold',
    finalOutput: 'assignment_recommendation',
    autoExecutionThreshold: 0.85,
  },
  {
    eventType: 'PunchItemCompleted',
    pipeline: ['human_oversight_liaison', 'meta_reasoning_agent', 'transparency_officer'],
    autonomyLevel: 'AdvisoryOnly',
    finalOutput: 'verification_prompt',
  },
  // Document Events
  {
    eventType: 'DocumentUploaded',
    pipeline: ['truth_and_evidence_validator', 'collective_memory_curator', 'meta_reasoning_agent'],
    autonomyLevel: 'DraftWithApproval',
    finalOutput: 'validated_document_record',
  },
  // Design Events
  {
    eventType: 'DesignTaskSent',
    pipeline: ['workflow_automation_engine', 'agent_ecosystem_orchestrator', 'transparency_officer'],
    autonomyLevel: 'AutoExecuteThreshold',
    finalOutput: 'dispatch_status',
  },
  {
    eventType: 'DesignCallbackReceived',
    pipeline: ['meta_reasoning_agent', 'truth_and_evidence_validator', 'human_oversight_liaison', 'design_and_narrative_synthesizer'],
    autonomyLevel: 'DraftWithApproval',
    finalOutput: 'human_ready_design_summary',
  },
  // MoE Grounding Events
  {
    eventType: 'MoEGroundingRequested',
    pipeline: ['agent_ecosystem_orchestrator', 'decision_advisor', 'meta_reasoning_agent', 'transparency_officer'],
    autonomyLevel: 'DraftWithApproval',
    finalOutput: 'moe_grounding_plan',
    minConfidence: 0.7,
  },
  {
    eventType: 'MoEGroundingCompleted',
    pipeline: ['meta_reasoning_agent', 'truth_and_evidence_validator', 'design_and_narrative_synthesizer', 'human_oversight_liaison'],
    autonomyLevel: 'DraftWithApproval',
    finalOutput: 'grounded_asset_review',
    requiresAudit: true,
  },
  {
    eventType: 'MoEExpertEscalation',
    pipeline: ['ai_risk_sentinel', 'ethical_alignment_council', 'human_oversight_liaison'],
    autonomyLevel: 'AdvisoryOnly',
    finalOutput: 'expert_escalation_response',
    blockOnRiskFlag: true,
  },
  {
    eventType: 'TrellisAssetGenerated',
    pipeline: ['agent_ecosystem_orchestrator', 'meta_reasoning_agent', 'collective_memory_curator', 'transparency_officer'],
    autonomyLevel: 'AutoExecuteThreshold',
    finalOutput: 'asset_registration',
    autoExecutionThreshold: 0.85,
  },
  // System Events
  {
    eventType: 'SystemRiskFlag',
    pipeline: ['ai_risk_sentinel', 'ethical_alignment_council', 'collective_ai_overseer', 'human_oversight_liaison'],
    autonomyLevel: 'AdvisoryOnly',
    finalOutput: 'risk_mitigation_action',
  },
  {
    eventType: 'SystemAlert',
    pipeline: ['collective_ai_overseer', 'ai_risk_sentinel', 'transparency_officer', 'human_oversight_liaison'],
    autonomyLevel: 'AdvisoryOnly',
    finalOutput: 'alert_response',
  },
];

// ============================================
// INTEGRATION POLICIES
// ============================================

export const INTEGRATION_POLICIES = {
  defaultApprovalRequired: true,
  autoExecutionThreshold: 0.85,
  maxAutonomyWithoutHuman: 'AutoExecuteThreshold' as AutonomyLevel,
  regulatedDomainOverride: true,
  defaultMinConfidence: 0.7,
  blockOnRiskFlag: true,
  requireAuditTrail: true,
};

// ============================================
// AUTONOMY LEVEL HELPERS
// ============================================

export function getAutonomyLevelNumber(level: AutonomyLevel): number {
  const mapping: Record<AutonomyLevel, number> = {
    AdvisoryOnly: 0,
    DraftWithApproval: 1,
    AutoExecuteThreshold: 2,
    ContinuousOptimization: 3,
  };
  return mapping[level];
}

export function canAutoExecute(level: AutonomyLevel, confidence: number, threshold: number = 0.85): boolean {
  const levelNum = getAutonomyLevelNumber(level);
  if (levelNum < 2) return false;
  return confidence >= threshold;
}

// ============================================
// AGENT SYSTEM INITIALIZATION
// ============================================

export async function initializeAgentSystem() {
  console.log('[AgentSystem] Initializing agent definitions...');
  
  for (const agentDef of AGENT_DEFINITIONS) {
    await prisma.aIAgent.upsert({
      where: { agentId: agentDef.id },
      create: {
        agentId: agentDef.id,
        name: agentDef.name,
        type: agentDef.type,
        description: agentDef.description,
        autonomyLevel: agentDef.autonomyLevel,
        configuration: {
          triggers: agentDef.triggers,
          inputs: agentDef.inputs,
          outputs: agentDef.outputs,
          monitors: agentDef.monitors,
          actions: agentDef.actions,
          ruleset: agentDef.ruleset,
          onViolation: agentDef.onViolation,
          routingLogic: agentDef.routingLogic,
          integrations: agentDef.integrations,
          scenarios: agentDef.scenarios,
          tools: agentDef.tools,
          failurePolicy: agentDef.failurePolicy,
          resolutionStrategy: agentDef.resolutionStrategy,
          memoryTypes: agentDef.memoryTypes,
          learningSignals: agentDef.learningSignals,
          sources: agentDef.sources,
          constraints: agentDef.constraints,
          formats: agentDef.formats,
        },
      },
      update: {
        name: agentDef.name,
        description: agentDef.description,
        autonomyLevel: agentDef.autonomyLevel,
        configuration: {
          triggers: agentDef.triggers,
          inputs: agentDef.inputs,
          outputs: agentDef.outputs,
          monitors: agentDef.monitors,
          actions: agentDef.actions,
          ruleset: agentDef.ruleset,
          onViolation: agentDef.onViolation,
          routingLogic: agentDef.routingLogic,
          integrations: agentDef.integrations,
          scenarios: agentDef.scenarios,
          tools: agentDef.tools,
          failurePolicy: agentDef.failurePolicy,
          resolutionStrategy: agentDef.resolutionStrategy,
          memoryTypes: agentDef.memoryTypes,
          learningSignals: agentDef.learningSignals,
          sources: agentDef.sources,
          constraints: agentDef.constraints,
          formats: agentDef.formats,
        },
      },
    });
  }
  
  console.log('[AgentSystem] Initialized', AGENT_DEFINITIONS.length, 'agents');
  
  // Initialize event bindings
  for (const binding of EVENT_AGENT_BINDINGS) {
    await prisma.eventAgentBinding.upsert({
      where: { eventType: binding.eventType },
      create: {
        eventType: binding.eventType,
        pipelineAgents: binding.pipeline,
        autonomyLevel: binding.autonomyLevel,
        finalOutput: binding.finalOutput,
        requiresAudit: binding.requiresAudit ?? true,
        blockOnRiskFlag: binding.blockOnRiskFlag ?? true,
        minConfidence: binding.minConfidence ?? 0.7,
        configuration: {
          hardBlockIf: binding.hardBlockIf,
          autoExecutionThreshold: binding.autoExecutionThreshold,
        },
      },
      update: {
        pipelineAgents: binding.pipeline,
        autonomyLevel: binding.autonomyLevel,
        finalOutput: binding.finalOutput,
        configuration: {
          hardBlockIf: binding.hardBlockIf,
          autoExecutionThreshold: binding.autoExecutionThreshold,
        },
      },
    });
  }
  
  console.log('[AgentSystem] Initialized', EVENT_AGENT_BINDINGS.length, 'event bindings');
  
  return { agents: AGENT_DEFINITIONS.length, bindings: EVENT_AGENT_BINDINGS.length };
}

// ============================================
// EXPORTS
// ============================================

export {
  AgentType,
  AutonomyLevel,
  AgentExecutionStatus,
  DomainEventType,
};
