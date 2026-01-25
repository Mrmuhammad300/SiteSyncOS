/**
 * SiteSync OS - Draw Request Workflow API
 * Handles approval workflows with policy enforcement
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import {
  emitProjectEvent,
  evaluateDrawApproval,
  generateAuditPack,
  APPROVAL_THRESHOLDS,
} from '@/lib/quantum-ledger';

interface SessionUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

// GET /api/draw-requests/[id]/workflow - Get workflow status
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user as SessionUser;

    const { id } = await params;

    const workflow = await prisma.drawApprovalWorkflow.findUnique({
      where: { drawRequestId: id },
      include: {
        drawRequest: {
          include: {
            project: { select: { id: true, name: true, projectNumber: true } },
            items: true,
            complianceChecks: true,
          },
        },
        initiatedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        decidedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Get related events
    const events = await prisma.projectEvent.findMany({
      where: {
        projectId: workflow.drawRequest.projectId,
        data: {
          path: ['drawRequestId'],
          equals: id,
        },
      },
      orderBy: { occurredAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      workflow,
      events,
      thresholds: APPROVAL_THRESHOLDS,
    });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}

// POST /api/draw-requests/[id]/workflow - Initiate or update workflow
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user as SessionUser;

    const { id } = await params;
    const body = await req.json();
    const { action, decisionNotes, conditions } = body;

    const drawRequest = await prisma.drawRequest.findUnique({
      where: { id },
      include: {
        project: true,
        items: true,
        complianceChecks: true,
        approvalWorkflow: true,
      },
    });

    if (!drawRequest) {
      return NextResponse.json(
        { error: 'Draw request not found' },
        { status: 404 }
      );
    }

    // Action: initiate - Start the approval workflow
    if (action === 'initiate') {
      const evaluation = evaluateDrawApproval(drawRequest.requestedAmount);

      // Check if all compliance items are complete
      const complianceComplete = drawRequest.complianceChecks.every(
        (check) => !check.isRequired || check.isCompleted
      );

      const workflow = await prisma.drawApprovalWorkflow.upsert({
        where: { drawRequestId: id },
        create: {
          drawRequestId: id,
          requestedAmount: drawRequest.requestedAmount,
          approvalStatus: evaluation.approvalStatus,
          initiatedById: user.id,
          evidenceComplete: complianceComplete,
          policyValidated: true,
        },
        update: {
          requestedAmount: drawRequest.requestedAmount,
          approvalStatus: evaluation.approvalStatus,
          evidenceComplete: complianceComplete,
        },
      });

      // Emit CapitalDrawRequested event
      await emitProjectEvent({
        eventType: 'CapitalDrawRequested',
        projectId: drawRequest.projectId,
        data: {
          amount: drawRequest.requestedAmount,
          drawRequestId: id,
          requestedBy: user.id,
          evidenceLinks: drawRequest.complianceChecks
            .filter((c) => c.documentPath)
            .map((c) => c.documentPath),
          payee: {
            drawNumber: drawRequest.drawNumber,
          },
          terms: {
            draw_category: 'Construction',
            retainage_pct: drawRequest.retainagePercent * 100,
          },
        },
        policyData: {
          requires_human_approval: evaluation.requiresHumanApproval,
          required_roles: evaluation.requiredRoles,
        },
      });

      // Update draw request status
      await prisma.drawRequest.update({
        where: { id },
        data: { status: 'Submitted', submittedDate: new Date() },
      });

      return NextResponse.json({
        workflow,
        evaluation,
        message: evaluation.requiresHumanApproval
          ? `Draw requires approval from: ${evaluation.requiredRoles.join(', ')}`
          : 'Draw auto-approved based on policy',
      });
    }

    // Action: approve - Approve the draw request
    if (action === 'approve') {
      if (!['SuperAdmin', 'Admin', 'ProjectManager', 'Lender'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions to approve' },
          { status: 403 }
        );
      }

      // Separation of duties: Initiator cannot approve their own request
      if (drawRequest.approvalWorkflow?.initiatedById === user.id) {
        return NextResponse.json(
          { error: 'Separation of duties violation: Cannot approve your own request' },
          { status: 403 }
        );
      }

      await prisma.drawApprovalWorkflow.update({
        where: { drawRequestId: id },
        data: {
          approvalStatus: 'Approved',
          decidedAt: new Date(),
          decidedById: user.id,
          decisionNotes,
          conditions: conditions ?? [],
        },
      });

      // Emit DrawApproved event
      await emitProjectEvent({
        eventType: 'DrawApproved',
        projectId: drawRequest.projectId,
        data: {
          drawRequestId: id,
          approvedAmount: drawRequest.requestedAmount,
          conditions: conditions ?? ['retainage_applied'],
          approvers: [{ role: user.role, id: user.id }],
        },
      });

      // Generate audit pack
      await generateAuditPack({
        projectId: drawRequest.projectId,
        drawRequestId: id,
        title: `Draw Approval - ${drawRequest.requestNumber}`,
        description: `Approved by ${user.firstName} ${user.lastName}`,
        evidenceLinks: drawRequest.complianceChecks
          .filter((c) => c.documentPath)
          .map((c) => c.documentPath as string),
        generatedById: user.id,
      });

      return NextResponse.json({
        message: 'Draw request approved',
        status: 'Approved',
      });
    }

    // Action: deny - Deny the draw request
    if (action === 'deny') {
      if (!['SuperAdmin', 'Admin', 'ProjectManager', 'Lender'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions to deny' },
          { status: 403 }
        );
      }

      await prisma.drawApprovalWorkflow.update({
        where: { drawRequestId: id },
        data: {
          approvalStatus: 'Denied',
          decidedAt: new Date(),
          decidedById: user.id,
          decisionNotes,
        },
      });

      // Emit DrawDenied event
      await emitProjectEvent({
        eventType: 'DrawDenied',
        projectId: drawRequest.projectId,
        data: {
          drawRequestId: id,
          reason: decisionNotes ?? 'No reason provided',
        },
      });

      return NextResponse.json({
        message: 'Draw request denied',
        status: 'Denied',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing workflow:', error);
    return NextResponse.json(
      { error: 'Failed to process workflow' },
      { status: 500 }
    );
  }
}
