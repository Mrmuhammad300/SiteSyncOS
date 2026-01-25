/**
 * SiteSync OS - Milestones API
 * Manages project milestones that trigger draw eligibility
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { emitProjectEvent } from '@/lib/quantum-ledger';
import { MilestoneType } from '@prisma/client';

interface SessionUser {
  id: string;
}

// GET /api/milestones - List milestones
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    const milestones = await prisma.projectMilestone.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        verifiedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ milestones });
  } catch (error) {
    console.error('Error fetching milestones:', error);
    return NextResponse.json(
      { error: 'Failed to fetch milestones' },
      { status: 500 }
    );
  }
}

// POST /api/milestones - Create a milestone
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      projectId,
      milestoneType,
      name,
      description,
      scheduledDate,
      budgetedCost,
      sortOrder,
    } = body;

    if (!projectId || !milestoneType || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, milestoneType, name' },
        { status: 400 }
      );
    }

    const milestone = await prisma.projectMilestone.create({
      data: {
        projectId,
        milestoneType: milestoneType as MilestoneType,
        name,
        description,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        budgetedCost,
        sortOrder: sortOrder ?? 0,
      },
    });

    return NextResponse.json({ milestone }, { status: 201 });
  } catch (error) {
    console.error('Error creating milestone:', error);
    return NextResponse.json(
      { error: 'Failed to create milestone' },
      { status: 500 }
    );
  }
}

// PATCH /api/milestones - Complete/verify a milestone
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user as SessionUser;

    const body = await req.json();
    const {
      milestoneId,
      action,
      verificationMethod,
      evidenceLinks,
      actualCost,
    } = body;

    if (!milestoneId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: milestoneId, action' },
        { status: 400 }
      );
    }

    const milestone = await prisma.projectMilestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone) {
      return NextResponse.json(
        { error: 'Milestone not found' },
        { status: 404 }
      );
    }

    if (action === 'complete') {
      // Mark milestone as completed
      const updated = await prisma.projectMilestone.update({
        where: { id: milestoneId },
        data: {
          status: 'Completed',
          completedDate: new Date(),
          percentComplete: 100,
          actualCost,
          evidenceLinks: evidenceLinks ?? [],
        },
      });

      // Emit MilestoneCompleted event
      await emitProjectEvent({
        eventType: 'MilestoneCompleted',
        projectId: milestone.projectId,
        data: {
          milestoneId,
          milestoneType: milestone.milestoneType,
          milestoneName: milestone.name,
          evidenceLinks: evidenceLinks ?? [],
          completedDate: new Date().toISOString(),
        },
        auditData: {
          evidenceLinks: evidenceLinks ?? [],
          completedBy: user.id,
        },
      });

      return NextResponse.json({ milestone: updated });
    }

    if (action === 'verify') {
      // Verify milestone for draw eligibility
      const updated = await prisma.projectMilestone.update({
        where: { id: milestoneId },
        data: {
          status: 'Verified',
          verifiedDate: new Date(),
          verifiedById: user.id,
          verificationMethod,
          drawEligible: true,
          evidenceLinks: evidenceLinks ?? milestone.evidenceLinks,
        },
      });

      // Emit verification event
      await emitProjectEvent({
        eventType: 'InspectionCompleted',
        projectId: milestone.projectId,
        data: {
          milestoneId,
          milestoneType: milestone.milestoneType,
          verifiedBy: user.id,
          verificationMethod,
          status: 'VERIFIED',
          evidenceLinks: evidenceLinks ?? [],
        },
      });

      return NextResponse.json({ milestone: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating milestone:', error);
    return NextResponse.json(
      { error: 'Failed to update milestone' },
      { status: 500 }
    );
  }
}
