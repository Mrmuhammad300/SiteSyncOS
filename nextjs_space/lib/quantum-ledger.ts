/**
 * SiteSync OS - Quantum Ledger Core Logic
 * Implements event-driven treasury workflows with audit trails
 */

import { prisma } from './db';
import { EventType, ApprovalStatus, LedgerEntryType } from '@prisma/client';

// Policy thresholds for draw approvals (in USD)
export const APPROVAL_THRESHOLDS = {
  AUTO_APPROVE_MAX: 25000,
  HITL_REQUIRED_MIN: 25001,
  COMMITTEE_REQUIRED_MIN: 250001,
};

// Account codes for ledger entries
export const ACCOUNT_CODES = {
  CONSTRUCTION_DRAWS: '1100',
  RETAINAGE: '1200',
  ACCOUNTS_PAYABLE: '2100',
  CONSTRUCTION_EXPENSE: '5100',
  CONTINGENCY: '5200',
};

/**
 * Generate a unique entry number for ledger entries
 */
export async function generateLedgerEntryNumber(): Promise<string> {
  const count = await prisma.ledgerEntry.count();
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `LE-${dateStr}-${String(count + 1).padStart(5, '0')}`;
}

/**
 * Generate a unique pack number for audit packs
 */
export async function generateAuditPackNumber(): Promise<string> {
  const count = await prisma.auditPack.count();
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `AP-${dateStr}-${String(count + 1).padStart(4, '0')}`;
}

/**
 * Emit a project event to the event spine
 */
export async function emitProjectEvent(params: {
  eventType: EventType;
  projectId: string;
  data: Record<string, unknown>;
  correlationId?: string;
  causationId?: string;
  policyData?: Record<string, unknown>;
  auditData?: Record<string, unknown>;
  confidence?: number;
}) {
  const event = await prisma.projectEvent.create({
    data: {
      eventType: params.eventType,
      projectId: params.projectId,
      data: params.data as object,
      correlationId: params.correlationId || generateCorrelationId(),
      causationId: params.causationId,
      policyData: params.policyData as object | undefined,
      auditData: params.auditData as object | undefined,
      confidence: params.confidence ?? 1.0,
    },
  });

  // Process event asynchronously
  processEvent(event.id).catch(console.error);

  return event;
}

function generateCorrelationId(): string {
  return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Process an event - creates ledger entries and triggers workflows
 */
async function processEvent(eventId: string) {
  const event = await prisma.projectEvent.findUnique({
    where: { id: eventId },
    include: { project: true },
  });

  if (!event || event.processed) return;

  try {
    switch (event.eventType) {
      case 'CapitalDrawRequested':
        await handleCapitalDrawRequested(event);
        break;
      case 'DrawApproved':
        await handleDrawApproved(event);
        break;
      case 'DrawDenied':
        await handleDrawDenied(event);
        break;
      case 'MilestoneCompleted':
        await handleMilestoneCompleted(event);
        break;
      case 'PaymentProcessed':
        await handlePaymentProcessed(event);
        break;
      default:
        // Log event but no specific handling
        break;
    }

    await prisma.projectEvent.update({
      where: { id: eventId },
      data: { processed: true, processedAt: new Date() },
    });
  } catch (error) {
    console.error(`Error processing event ${eventId}:`, error);
  }
}

/**
 * Handle CapitalDrawRequested event
 */
async function handleCapitalDrawRequested(event: { id: string; projectId: string; data: unknown }) {
  const data = event.data as {
    amount: number;
    drawRequestId: string;
    milestoneId?: string;
    requestedBy: string;
    evidenceLinks?: string[];
  };

  // Determine approval status based on amount
  let approvalStatus: ApprovalStatus = 'Pending';
  if (data.amount <= APPROVAL_THRESHOLDS.AUTO_APPROVE_MAX) {
    approvalStatus = 'AutoApproved';
  } else if (data.amount >= APPROVAL_THRESHOLDS.COMMITTEE_REQUIRED_MIN) {
    approvalStatus = 'CommitteeRequired';
  } else {
    approvalStatus = 'HITLRequired';
  }

  // Create approval workflow
  await prisma.drawApprovalWorkflow.upsert({
    where: { drawRequestId: data.drawRequestId },
    create: {
      drawRequestId: data.drawRequestId,
      requestedAmount: data.amount,
      approvalStatus,
      initiatedById: data.requestedBy,
      evidenceComplete: (data.evidenceLinks?.length ?? 0) > 0,
    },
    update: {
      requestedAmount: data.amount,
      approvalStatus,
      evidenceComplete: (data.evidenceLinks?.length ?? 0) > 0,
    },
  });

  // If auto-approved, emit approval event
  if (approvalStatus === 'AutoApproved') {
    await emitProjectEvent({
      eventType: 'DrawApproved',
      projectId: event.projectId,
      data: {
        drawRequestId: data.drawRequestId,
        approvedAmount: data.amount,
        conditions: ['retainage_applied'],
        autoApproved: true,
      },
      causationId: event.id,
    });
  }
}

/**
 * Handle DrawApproved event - create ledger entries
 */
async function handleDrawApproved(event: { id: string; projectId: string; data: unknown }) {
  const data = event.data as {
    drawRequestId: string;
    approvedAmount: number;
    conditions?: string[];
  };

  const entryNumber = await generateLedgerEntryNumber();

  // Create debit entry (Construction Draws)
  await prisma.ledgerEntry.create({
    data: {
      entryNumber,
      projectId: event.projectId,
      eventId: event.id,
      entryType: 'Debit',
      accountCode: ACCOUNT_CODES.CONSTRUCTION_DRAWS,
      accountName: 'Construction Draws',
      description: `Draw approved for ${data.drawRequestId}`,
      amount: data.approvedAmount,
      lineageRef: event.id,
    },
  });

  // Create credit entry (Construction Expense)
  const creditEntryNumber = await generateLedgerEntryNumber();
  await prisma.ledgerEntry.create({
    data: {
      entryNumber: creditEntryNumber,
      projectId: event.projectId,
      eventId: event.id,
      entryType: 'Credit',
      accountCode: ACCOUNT_CODES.CONSTRUCTION_EXPENSE,
      accountName: 'Construction Expense',
      description: `Construction expense for ${data.drawRequestId}`,
      amount: data.approvedAmount,
      lineageRef: event.id,
    },
  });

  // Update draw request status
  await prisma.drawRequest.update({
    where: { id: data.drawRequestId },
    data: {
      status: 'Approved',
      approvedAmount: data.approvedAmount,
      approvedDate: new Date(),
    },
  });

  // Generate audit pack
  await generateAuditPack({
    projectId: event.projectId,
    eventId: event.id,
    drawRequestId: data.drawRequestId,
    title: `Draw Approval - ${data.drawRequestId}`,
  });
}

/**
 * Handle DrawDenied event
 */
async function handleDrawDenied(event: { id: string; projectId: string; data: unknown }) {
  const data = event.data as {
    drawRequestId: string;
    reason: string;
  };

  await prisma.drawRequest.update({
    where: { id: data.drawRequestId },
    data: {
      status: 'Rejected',
      lenderComments: data.reason,
    },
  });

  await prisma.drawApprovalWorkflow.update({
    where: { drawRequestId: data.drawRequestId },
    data: {
      approvalStatus: 'Denied',
      decidedAt: new Date(),
      decisionNotes: data.reason,
    },
  });
}

/**
 * Handle MilestoneCompleted event
 */
async function handleMilestoneCompleted(event: { id: string; projectId: string; data: unknown }) {
  const data = event.data as {
    milestoneId: string;
    milestoneType: string;
    evidenceLinks?: string[];
  };

  // Update milestone
  await prisma.projectMilestone.update({
    where: { id: data.milestoneId },
    data: {
      status: 'Completed',
      completedDate: new Date(),
      drawEligible: true,
      percentComplete: 100,
    },
  });

  // Update project phase based on milestone completion
  const milestone = await prisma.projectMilestone.findUnique({
    where: { id: data.milestoneId },
  });

  if (milestone?.milestoneType === 'CertificateOfOccupancy') {
    await prisma.project.update({
      where: { id: event.projectId },
      data: { phase: 'Closeout' },
    });
  }
}

/**
 * Handle PaymentProcessed event
 */
async function handlePaymentProcessed(event: { id: string; projectId: string; data: unknown }) {
  const data = event.data as {
    drawRequestId: string;
    fundedAmount: number;
  };

  await prisma.drawRequest.update({
    where: { id: data.drawRequestId },
    data: {
      status: 'Funded',
      fundedAmount: data.fundedAmount,
      fundedDate: new Date(),
    },
  });
}

/**
 * Generate an audit pack for compliance
 */
export async function generateAuditPack(params: {
  projectId: string;
  eventId?: string;
  drawRequestId?: string;
  title: string;
  description?: string;
  evidenceLinks?: string[];
  generatedById?: string;
}) {
  const packNumber = await generateAuditPackNumber();

  return prisma.auditPack.create({
    data: {
      packNumber,
      projectId: params.projectId,
      eventId: params.eventId,
      drawRequestId: params.drawRequestId,
      title: params.title,
      description: params.description,
      evidenceLinks: params.evidenceLinks ?? [],
      lineageRefs: params.eventId ? [params.eventId] : [],
      complianceStatus: 'Generated',
      generatedById: params.generatedById,
    },
  });
}

/**
 * Get draw approval status based on policy rules
 */
export function evaluateDrawApproval(amount: number): {
  approvalStatus: ApprovalStatus;
  requiresHumanApproval: boolean;
  requiredRoles: string[];
} {
  if (amount <= APPROVAL_THRESHOLDS.AUTO_APPROVE_MAX) {
    return {
      approvalStatus: 'AutoApproved',
      requiresHumanApproval: false,
      requiredRoles: [],
    };
  }

  if (amount >= APPROVAL_THRESHOLDS.COMMITTEE_REQUIRED_MIN) {
    return {
      approvalStatus: 'CommitteeRequired',
      requiresHumanApproval: true,
      requiredRoles: ['CFO', 'CEO', 'BoardMember'],
    };
  }

  return {
    approvalStatus: 'HITLRequired',
    requiresHumanApproval: true,
    requiredRoles: ['CFO', 'ProjectManager'],
  };
}

/**
 * Update cashflow forecast based on events
 */
export async function updateCashflowForecast(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      drawRequests: { where: { status: 'Approved' } },
      budgetTransactions: { where: { status: 'Paid' } },
    },
  });

  if (!project) return;

  const totalDrawn = project.drawRequests.reduce(
    (sum, dr) => sum + (dr.fundedAmount ?? dr.approvedAmount ?? 0),
    0
  );

  const totalExpenses = project.budgetTransactions.reduce(
    (sum, tx) => sum + tx.amount,
    0
  );

  const costToComplete = project.budget - totalExpenses;
  const budgetVariance = ((totalExpenses / project.budget) * 100) - 100;

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await prisma.cashflowForecast.create({
    data: {
      projectId,
      forecastDate: now,
      periodStart: now,
      periodEnd,
      projectedInflow: totalDrawn,
      projectedOutflow: totalExpenses,
      netCashflow: totalDrawn - totalExpenses,
      cumulativeBalance: project.budget - totalExpenses,
      budgetVariance,
      costToComplete,
      riskFactors: { variance: budgetVariance > 10 },
    },
  });
}
