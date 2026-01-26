import { prisma } from './db';

// ============================================
// STATE MACHINE DEFINITIONS
// ============================================

export interface StateTransition {
  event: string;
  from: string | null; // null = initial transition
  to: string;
}

export interface GuardCondition {
  requiredFields?: string[];
  requiredState?: string;
  rolesAllowed?: string[];
  onFail: 'block_and_return_missing_fields' | 'block_and_escalate';
}

export interface StateMachineDefinition {
  domain: string;
  states: string[];
  initialState: string;
  terminalStates: string[];
  transitions: StateTransition[];
  guards: Record<string, GuardCondition>;
}

// RFI State Machine
export const RFI_STATE_MACHINE: StateMachineDefinition = {
  domain: 'rfi',
  states: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ANSWERED', 'CLOSED', 'VOID'],
  initialState: 'DRAFT',
  terminalStates: ['CLOSED', 'VOID'],
  transitions: [
    { event: 'RFI_CREATED', from: null, to: 'DRAFT' },
    { event: 'RFI_SUBMITTED', from: 'DRAFT', to: 'SUBMITTED' },
    { event: 'RFI_ASSIGNED', from: 'SUBMITTED', to: 'UNDER_REVIEW' },
    { event: 'RFI_REQUESTED_MORE_INFO', from: 'UNDER_REVIEW', to: 'SUBMITTED' },
    { event: 'RFI_RESPONDED', from: 'UNDER_REVIEW', to: 'ANSWERED' },
    { event: 'RFI_REOPENED', from: 'ANSWERED', to: 'UNDER_REVIEW' },
    { event: 'RFI_CLOSED', from: 'ANSWERED', to: 'CLOSED' },
    { event: 'RFI_CANCELED', from: 'DRAFT', to: 'VOID' },
  ],
  guards: {
    RFI_SUBMITTED: {
      requiredFields: ['projectId', 'subject', 'description'],
      onFail: 'block_and_return_missing_fields',
    },
    RFI_RESPONDED: {
      requiredFields: ['responseText'],
      onFail: 'block_and_return_missing_fields',
    },
    RFI_CLOSED: {
      requiredState: 'ANSWERED',
      rolesAllowed: ['SuperAdmin', 'Admin', 'ProjectManager'],
      onFail: 'block_and_escalate',
    },
  },
};

// Change Order State Machine
export const CHANGE_ORDER_STATE_MACHINE: StateMachineDefinition = {
  domain: 'change_order',
  states: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'IMPLEMENTED'],
  initialState: 'DRAFT',
  terminalStates: ['IMPLEMENTED'],
  transitions: [
    { event: 'CHANGE_ORDER_CREATED', from: null, to: 'DRAFT' },
    { event: 'CHANGE_ORDER_SUBMITTED', from: 'DRAFT', to: 'PENDING' },
    { event: 'CHANGE_ORDER_APPROVED', from: 'PENDING', to: 'APPROVED' },
    { event: 'CHANGE_ORDER_REJECTED', from: 'PENDING', to: 'REJECTED' },
    { event: 'CHANGE_ORDER_IMPLEMENTED', from: 'APPROVED', to: 'IMPLEMENTED' },
    { event: 'CHANGE_ORDER_REOPENED', from: 'REJECTED', to: 'DRAFT' },
  ],
  guards: {
    CHANGE_ORDER_SUBMITTED: {
      requiredFields: ['projectId', 'title', 'description', 'proposedCost'],
      onFail: 'block_and_return_missing_fields',
    },
    CHANGE_ORDER_APPROVED: {
      requiredState: 'PENDING',
      rolesAllowed: ['SuperAdmin', 'Admin', 'ProjectManager'],
      onFail: 'block_and_escalate',
    },
  },
};

// Submittal State Machine
export const SUBMITTAL_STATE_MACHINE: StateMachineDefinition = {
  domain: 'submittal',
  states: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESUBMIT_REQUIRED'],
  initialState: 'DRAFT',
  terminalStates: ['APPROVED'],
  transitions: [
    { event: 'SUBMITTAL_CREATED', from: null, to: 'DRAFT' },
    { event: 'SUBMITTAL_SUBMITTED', from: 'DRAFT', to: 'SUBMITTED' },
    { event: 'SUBMITTAL_ASSIGNED', from: 'SUBMITTED', to: 'UNDER_REVIEW' },
    { event: 'SUBMITTAL_APPROVED', from: 'UNDER_REVIEW', to: 'APPROVED' },
    { event: 'SUBMITTAL_REJECTED', from: 'UNDER_REVIEW', to: 'REJECTED' },
    { event: 'SUBMITTAL_RESUBMIT_REQUIRED', from: 'UNDER_REVIEW', to: 'RESUBMIT_REQUIRED' },
    { event: 'SUBMITTAL_RESUBMITTED', from: 'RESUBMIT_REQUIRED', to: 'SUBMITTED' },
    { event: 'SUBMITTAL_RESUBMITTED', from: 'REJECTED', to: 'SUBMITTED' },
  ],
  guards: {
    SUBMITTAL_SUBMITTED: {
      requiredFields: ['projectId', 'title', 'specSection'],
      onFail: 'block_and_return_missing_fields',
    },
    SUBMITTAL_APPROVED: {
      requiredState: 'UNDER_REVIEW',
      rolesAllowed: ['SuperAdmin', 'Admin', 'ProjectManager', 'Architect'],
      onFail: 'block_and_escalate',
    },
  },
};

// Punch Item State Machine
export const PUNCH_ITEM_STATE_MACHINE: StateMachineDefinition = {
  domain: 'punch_item',
  states: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'CLOSED'],
  initialState: 'OPEN',
  terminalStates: ['CLOSED'],
  transitions: [
    { event: 'PUNCH_ITEM_CREATED', from: null, to: 'OPEN' },
    { event: 'PUNCH_ITEM_ASSIGNED', from: 'OPEN', to: 'ASSIGNED' },
    { event: 'PUNCH_ITEM_STARTED', from: 'ASSIGNED', to: 'IN_PROGRESS' },
    { event: 'PUNCH_ITEM_COMPLETED', from: 'IN_PROGRESS', to: 'COMPLETED' },
    { event: 'PUNCH_ITEM_VERIFIED', from: 'COMPLETED', to: 'VERIFIED' },
    { event: 'PUNCH_ITEM_CLOSED', from: 'VERIFIED', to: 'CLOSED' },
    { event: 'PUNCH_ITEM_REOPENED', from: 'COMPLETED', to: 'IN_PROGRESS' },
    { event: 'PUNCH_ITEM_REOPENED', from: 'VERIFIED', to: 'IN_PROGRESS' },
  ],
  guards: {
    PUNCH_ITEM_VERIFIED: {
      requiredState: 'COMPLETED',
      rolesAllowed: ['SuperAdmin', 'Admin', 'ProjectManager', 'Superintendent'],
      onFail: 'block_and_escalate',
    },
  },
};

// Draw Request State Machine
export const DRAW_REQUEST_STATE_MACHINE: StateMachineDefinition = {
  domain: 'draw_request',
  states: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'FUNDED', 'CANCELLED'],
  initialState: 'DRAFT',
  terminalStates: ['FUNDED', 'CANCELLED'],
  transitions: [
    { event: 'DRAW_REQUEST_CREATED', from: null, to: 'DRAFT' },
    { event: 'DRAW_REQUEST_SUBMITTED', from: 'DRAFT', to: 'SUBMITTED' },
    { event: 'DRAW_REQUEST_REVIEW_STARTED', from: 'SUBMITTED', to: 'UNDER_REVIEW' },
    { event: 'DRAW_REQUEST_APPROVED', from: 'UNDER_REVIEW', to: 'APPROVED' },
    { event: 'DRAW_REQUEST_REJECTED', from: 'UNDER_REVIEW', to: 'REJECTED' },
    { event: 'DRAW_REQUEST_FUNDED', from: 'APPROVED', to: 'FUNDED' },
    { event: 'DRAW_REQUEST_CANCELLED', from: 'DRAFT', to: 'CANCELLED' },
    { event: 'DRAW_REQUEST_RESUBMITTED', from: 'REJECTED', to: 'SUBMITTED' },
  ],
  guards: {
    DRAW_REQUEST_SUBMITTED: {
      requiredFields: ['projectId', 'amount', 'description'],
      onFail: 'block_and_return_missing_fields',
    },
    DRAW_REQUEST_APPROVED: {
      requiredState: 'UNDER_REVIEW',
      rolesAllowed: ['SuperAdmin', 'Admin', 'Lender'],
      onFail: 'block_and_escalate',
    },
  },
};

// All state machines
export const STATE_MACHINES: StateMachineDefinition[] = [
  RFI_STATE_MACHINE,
  CHANGE_ORDER_STATE_MACHINE,
  SUBMITTAL_STATE_MACHINE,
  PUNCH_ITEM_STATE_MACHINE,
  DRAW_REQUEST_STATE_MACHINE,
];

// ============================================
// STATE MACHINE OPERATIONS
// ============================================

export interface TransitionResult {
  success: boolean;
  previousState: string | null;
  newState: string;
  event: string;
  guardFailure?: {
    type: 'missing_fields' | 'invalid_state' | 'unauthorized' | 'escalation_required';
    details: string[];
  };
}

export function getStateMachine(domain: string): StateMachineDefinition | undefined {
  return STATE_MACHINES.find(sm => sm.domain === domain);
}

export function canTransition(
  machine: StateMachineDefinition,
  currentState: string | null,
  event: string,
  data: Record<string, unknown>,
  userRole?: string
): TransitionResult {
  // Find valid transition
  const transition = machine.transitions.find(
    t => t.event === event && t.from === currentState
  );
  
  if (!transition) {
    return {
      success: false,
      previousState: currentState,
      newState: currentState || machine.initialState,
      event,
      guardFailure: {
        type: 'invalid_state',
        details: [`Cannot transition from ${currentState || 'null'} with event ${event}`],
      },
    };
  }
  
  // Check guards
  const guard = machine.guards[event];
  if (guard) {
    // Check required fields
    if (guard.requiredFields) {
      const missingFields = guard.requiredFields.filter(field => !data[field]);
      if (missingFields.length > 0) {
        return {
          success: false,
          previousState: currentState,
          newState: currentState || machine.initialState,
          event,
          guardFailure: {
            type: 'missing_fields',
            details: missingFields,
          },
        };
      }
    }
    
    // Check required state
    if (guard.requiredState && currentState !== guard.requiredState) {
      return {
        success: false,
        previousState: currentState,
        newState: currentState || machine.initialState,
        event,
        guardFailure: {
          type: 'invalid_state',
          details: [`Must be in state ${guard.requiredState}, currently in ${currentState}`],
        },
      };
    }
    
    // Check role authorization
    if (guard.rolesAllowed && userRole) {
      if (!guard.rolesAllowed.includes(userRole)) {
        if (guard.onFail === 'block_and_escalate') {
          return {
            success: false,
            previousState: currentState,
            newState: currentState || machine.initialState,
            event,
            guardFailure: {
              type: 'escalation_required',
              details: [`Role ${userRole} not authorized. Required: ${guard.rolesAllowed.join(', ')}`],
            },
          };
        }
        return {
          success: false,
          previousState: currentState,
          newState: currentState || machine.initialState,
          event,
          guardFailure: {
            type: 'unauthorized',
            details: [`Role ${userRole} not authorized`],
          },
        };
      }
    }
  }
  
  return {
    success: true,
    previousState: currentState,
    newState: transition.to,
    event,
  };
}

export function isTerminalState(machine: StateMachineDefinition, state: string): boolean {
  return machine.terminalStates.includes(state);
}

export function getAvailableTransitions(
  machine: StateMachineDefinition,
  currentState: string
): StateTransition[] {
  return machine.transitions.filter(t => t.from === currentState);
}

// ============================================
// DATABASE INITIALIZATION
// ============================================

export async function initializeStateMachines(): Promise<void> {
  console.log('[StateMachines] Initializing state machine definitions...');
  
  for (const machine of STATE_MACHINES) {
    await prisma.domainStateMachine.upsert({
      where: { domain: machine.domain },
      create: {
        domain: machine.domain,
        states: machine.states,
        initialState: machine.initialState,
        terminalStates: machine.terminalStates,
        transitions: JSON.parse(JSON.stringify(machine.transitions)),
        guards: JSON.parse(JSON.stringify(machine.guards)),
      },
      update: {
        states: machine.states,
        initialState: machine.initialState,
        terminalStates: machine.terminalStates,
        transitions: JSON.parse(JSON.stringify(machine.transitions)),
        guards: JSON.parse(JSON.stringify(machine.guards)),
      },
    });
  }
  
  console.log('[StateMachines] Initialized', STATE_MACHINES.length, 'state machines');
}
