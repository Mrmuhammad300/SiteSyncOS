import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// Simulation API - Admin only
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!['SuperAdmin', 'Admin'].includes(userRole)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      budgetVariance = 0, 
      scheduleDelay = 0, 
      resourceChange = 0, 
      riskFactor = 'medium',
      projectId 
    } = body;

    // Get current project data for simulation
    let baseData = {
      totalBudget: 10000000,
      totalProjects: 5,
      avgDuration: 12,
    };

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });
      if (project) {
        baseData.totalBudget = Number(project.budget) || 10000000;
      }
    } else {
      // Get aggregate data
      const projects = await prisma.project.findMany();
      const totalBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
      baseData = {
        totalBudget: totalBudget || 10000000,
        totalProjects: projects.length || 5,
        avgDuration: 12,
      };
    }

    // Calculate simulation results
    const riskMultipliers: Record<string, number> = {
      low: 0.8,
      medium: 1.0,
      high: 1.3,
      critical: 1.6,
    };

    const riskMultiplier = riskMultipliers[riskFactor] || 1.0;
    const budgetImpact = baseData.totalBudget * (budgetVariance / 100);
    const resourceImpact = baseData.totalBudget * (resourceChange / 100) * 0.5;

    const projectedBudget = baseData.totalBudget + budgetImpact + (resourceImpact * riskMultiplier);
    const projectedTimeline = Math.max(1, baseData.avgDuration + scheduleDelay + Math.round(riskMultiplier * 2 - 2));

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (budgetVariance > 15) {
      recommendations.push('Consider value engineering to reduce construction costs');
      recommendations.push('Explore alternative materials or methods');
    } else if (budgetVariance > 5) {
      recommendations.push('Monitor spending closely and implement cost controls');
    }

    if (scheduleDelay > 3) {
      recommendations.push('Implement schedule compression techniques (crashing, fast-tracking)');
      recommendations.push('Consider additional crews for critical path activities');
    } else if (scheduleDelay > 0) {
      recommendations.push('Review critical path and identify optimization opportunities');
    }

    if (resourceChange < -20) {
      recommendations.push('Critical: Severe resource constraint may impact quality and schedule');
      recommendations.push('Prioritize key activities and consider phased approach');
    } else if (resourceChange < -10) {
      recommendations.push('Review resource allocation for critical path activities');
    }

    if (riskFactor === 'critical') {
      recommendations.push('Increase contingency reserves to 15-20% of budget');
      recommendations.push('Implement daily risk monitoring and mitigation measures');
      recommendations.push('Consider risk transfer through insurance or contracts');
    } else if (riskFactor === 'high') {
      recommendations.push('Increase contingency reserves to 10-15% of budget');
      recommendations.push('Implement weekly risk reviews');
    }

    if (recommendations.length === 0) {
      recommendations.push('Current parameters are within acceptable tolerances');
      recommendations.push('Continue standard monitoring and reporting');
    }

    // Calculate risk score
    const riskScore = Math.min(100, Math.round(
      (Math.abs(budgetVariance) * 0.3) +
      (Math.abs(scheduleDelay) * 5) +
      (Math.abs(resourceChange) * 0.2) +
      (riskMultiplier * 20)
    ));

    const result = {
      scenario: `Budget ${budgetVariance >= 0 ? '+' : ''}${budgetVariance}%, Schedule ${scheduleDelay >= 0 ? '+' : ''}${scheduleDelay} months, Risk: ${riskFactor}`,
      baseData: {
        budget: baseData.totalBudget,
        duration: baseData.avgDuration,
        projects: baseData.totalProjects,
      },
      projections: {
        budget: projectedBudget,
        budgetChange: projectedBudget - baseData.totalBudget,
        budgetChangePercent: ((projectedBudget - baseData.totalBudget) / baseData.totalBudget) * 100,
        timeline: projectedTimeline,
        timelineChange: projectedTimeline - baseData.avgDuration,
      },
      riskAssessment: {
        level: riskFactor,
        score: riskScore,
        multiplier: riskMultiplier,
      },
      recommendations,
      simulatedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json(
      { error: 'Failed to run simulation' },
      { status: 500 }
    );
  }
}

// Get simulation templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!['SuperAdmin', 'Admin'].includes(userRole)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Return simulation templates
    const templates = [
      {
        id: 'optimistic',
        name: 'Optimistic Scenario',
        description: 'Best-case outcomes with favorable conditions',
        params: {
          budgetVariance: -5,
          scheduleDelay: -2,
          resourceChange: 10,
          riskFactor: 'low',
        },
      },
      {
        id: 'baseline',
        name: 'Baseline Scenario',
        description: 'Expected outcomes based on current projections',
        params: {
          budgetVariance: 0,
          scheduleDelay: 0,
          resourceChange: 0,
          riskFactor: 'medium',
        },
      },
      {
        id: 'pessimistic',
        name: 'Pessimistic Scenario',
        description: 'Challenging conditions with multiple setbacks',
        params: {
          budgetVariance: 20,
          scheduleDelay: 4,
          resourceChange: -15,
          riskFactor: 'high',
        },
      },
      {
        id: 'worstcase',
        name: 'Worst Case Scenario',
        description: 'Extreme conditions for stress testing',
        params: {
          budgetVariance: 40,
          scheduleDelay: 8,
          resourceChange: -30,
          riskFactor: 'critical',
        },
      },
    ];

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
