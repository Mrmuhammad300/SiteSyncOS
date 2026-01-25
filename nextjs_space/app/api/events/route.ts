/**
 * SiteSync OS - Event Spine API
 * Handles project events for the event-driven architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { emitProjectEvent } from '@/lib/quantum-ledger';
import { EventType } from '@prisma/client';

// GET /api/events - List events with filtering
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const eventType = searchParams.get('eventType') as EventType | null;
    const processed = searchParams.get('processed');
    const limit = parseInt(searchParams.get('limit') ?? '50');
    const offset = parseInt(searchParams.get('offset') ?? '0');

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (eventType) where.eventType = eventType;
    if (processed !== null) where.processed = processed === 'true';

    const [events, total] = await Promise.all([
      prisma.projectEvent.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, projectNumber: true } },
          ledgerEntries: true,
          auditPack: true,
        },
        orderBy: { occurredAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.projectEvent.count({ where }),
    ]);

    return NextResponse.json({
      events,
      pagination: { total, limit, offset },
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// POST /api/events - Emit a new event
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { eventType, projectId, data, correlationId, causationId, policyData, auditData } = body;

    if (!eventType || !projectId || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: eventType, projectId, data' },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const event = await emitProjectEvent({
      eventType,
      projectId,
      data,
      correlationId,
      causationId,
      policyData,
      auditData,
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Error emitting event:', error);
    return NextResponse.json(
      { error: 'Failed to emit event' },
      { status: 500 }
    );
  }
}
