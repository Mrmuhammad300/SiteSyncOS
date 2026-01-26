import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import {
  initializeAgentSystem,
  AGENT_DEFINITIONS,
  EVENT_AGENT_BINDINGS,
  AGENT_DEPENDENCY_GRAPH,
} from '@/lib/agent-system';
import { initializeStateMachines, STATE_MACHINES } from '@/lib/state-machines';
import { processEvent, getAgentMetrics } from '@/lib/agent-orchestrator';
import { DomainEventType } from '@prisma/client';

interface SessionUser {
  id: string;
  email: string;
  role: string;
}

// GET: Retrieve agents, bindings, and metrics
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // agents, bindings, graph, metrics, executions, state-machines

    switch (type) {
      case 'agents': {
        const agents = await prisma.aIAgent.findMany({
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: {
                executions: true,
                decisions: true,
              },
            },
          },
        });
        return NextResponse.json({
          agents,
          definitions: AGENT_DEFINITIONS,
        });
      }

      case 'bindings': {
        const bindings = await prisma.eventAgentBinding.findMany({
          orderBy: { eventType: 'asc' },
        });
        return NextResponse.json({
          bindings,
          definitions: EVENT_AGENT_BINDINGS,
        });
      }

      case 'graph': {
        return NextResponse.json({
          nodes: AGENT_DEFINITIONS.map(a => ({
            id: a.id,
            name: a.name,
            type: a.type,
            autonomyLevel: a.autonomyLevel,
          })),
          edges: AGENT_DEPENDENCY_GRAPH,
        });
      }

      case 'metrics': {
        const metrics = await getAgentMetrics();
        return NextResponse.json(metrics);
      }

      case 'executions': {
        const projectId = searchParams.get('projectId');
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const where: Record<string, unknown> = {};
        if (projectId) where.projectId = projectId;
        if (status) where.status = status;

        const executions = await prisma.agentExecution.findMany({
          where,
          orderBy: { startedAt: 'desc' },
          take: limit,
          skip: offset,
          include: {
            agent: true,
            project: { select: { id: true, name: true } },
            approvedBy: { select: { id: true, firstName: true, lastName: true } },
            decisions: true,
          },
        });

        const total = await prisma.agentExecution.count({ where });

        return NextResponse.json({
          executions,
          total,
          limit,
          offset,
        });
      }

      case 'state-machines': {
        const machines = await prisma.domainStateMachine.findMany();
        return NextResponse.json({
          machines,
          definitions: STATE_MACHINES,
        });
      }

      default: {
        // Return summary
        const [agentCount, bindingCount, executionCount, pendingApprovals] = await Promise.all([
          prisma.aIAgent.count(),
          prisma.eventAgentBinding.count(),
          prisma.agentExecution.count(),
          prisma.agentExecution.count({ where: { status: 'AwaitingApproval' } }),
        ]);

        const metrics = await getAgentMetrics();

        return NextResponse.json({
          summary: {
            agents: agentCount,
            bindings: bindingCount,
            executions: executionCount,
            pendingApprovals,
          },
          metrics,
          definitions: {
            agentCount: AGENT_DEFINITIONS.length,
            bindingCount: EVENT_AGENT_BINDINGS.length,
            stateMachineCount: STATE_MACHINES.length,
          },
        });
      }
    }
  } catch (error) {
    console.error('Error fetching agent data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent data' },
      { status: 500 }
    );
  }
}

// POST: Initialize system or trigger event processing
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const allowedRoles = ['SuperAdmin', 'Admin', 'ProjectManager'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { action, eventType, eventData, projectId } = body;

    switch (action) {
      case 'initialize': {
        // Initialize agent system and state machines
        const agentResult = await initializeAgentSystem();
        await initializeStateMachines();
        return NextResponse.json({
          success: true,
          message: 'Agent system initialized',
          ...agentResult,
        });
      }

      case 'process_event': {
        if (!eventType) {
          return NextResponse.json(
            { error: 'Event type is required' },
            { status: 400 }
          );
        }

        // Validate event type
        const validEventTypes = Object.values(DomainEventType);
        if (!validEventTypes.includes(eventType)) {
          return NextResponse.json(
            { error: `Invalid event type: ${eventType}` },
            { status: 400 }
          );
        }

        const result = await processEvent(
          eventType as DomainEventType,
          eventData || {},
          projectId,
          user.id
        );

        return NextResponse.json({
          success: true,
          result,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing agent action:', error);
    return NextResponse.json(
      { error: 'Failed to process agent action' },
      { status: 500 }
    );
  }
}

// PATCH: Update agent configuration or approve execution
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const body = await request.json();
    const { action, agentId, executionId, approved, feedback, configuration } = body;

    switch (action) {
      case 'toggle_agent': {
        if (!agentId) {
          return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });
        }

        const agent = await prisma.aIAgent.update({
          where: { agentId },
          data: { isActive: body.isActive },
        });

        return NextResponse.json({ success: true, agent });
      }

      case 'update_configuration': {
        if (!agentId) {
          return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });
        }

        const agent = await prisma.aIAgent.update({
          where: { agentId },
          data: { configuration },
        });

        return NextResponse.json({ success: true, agent });
      }

      case 'approve_execution': {
        if (!executionId) {
          return NextResponse.json({ error: 'Execution ID required' }, { status: 400 });
        }

        const execution = await prisma.agentExecution.update({
          where: { id: executionId },
          data: {
            status: approved ? 'Approved' : 'Rejected',
            approvedById: user.id,
            approvedAt: new Date(),
            completedAt: new Date(),
          },
        });

        // Record learning signal
        await prisma.agentLearningSignal.create({
          data: {
            executionId: execution.id,
            agentId: execution.agentId,
            signalType: approved ? 'human_approval' : 'human_rejection',
            feedback,
            isPositive: approved,
          },
        });

        return NextResponse.json({ success: true, execution });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    );
  }
}
