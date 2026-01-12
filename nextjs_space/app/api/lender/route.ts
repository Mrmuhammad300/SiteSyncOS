import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    // Get lender's accessible projects
    const where: Record<string, unknown> = {};
    const userRole = (session.user as { role?: string }).role;
    const userId = (session.user as { id: string }).id;
    
    if (userRole === 'Lender') {
      const lenderAccess = await prisma.lenderAccess.findMany({
        where: { userId },
        select: { projectId: true }
      });
      where.id = { in: lenderAccess.map(la => la.projectId) };
    }
    if (projectId) where.id = projectId;

    const projects = await prisma.project.findMany({
      where,
      include: {
        drawRequests: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            drawNumber: true,
            status: true,
            requestedAmount: true,
            approvedAmount: true,
            fundedAmount: true,
            _count: { select: { items: true, documents: true } }
          }
        },
        _count: {
          select: { drawRequests: true, rfis: true, changeOrders: true }
        }
      }
    });

    // Get budget transactions separately
    const projectIds = projects.map(p => p.id);
    const budgetTransactions = await prisma.budgetTransaction.groupBy({
      by: ['projectId'],
      where: { 
        projectId: { in: projectIds },
        status: 'Paid'
      },
      _sum: { amount: true }
    });

    // Create a map of project spending
    const spendingMap = new Map(
      budgetTransactions.map(bt => [bt.projectId, bt._sum.amount || 0])
    );

    // Calculate compliance metrics for each project
    const projectsWithMetrics = projects.map(project => {
      const totalSpent = spendingMap.get(project.id) || 0;
      const budgetUtilization = project.budget ? (totalSpent / project.budget) * 100 : 0;
      const pendingDraws = project.drawRequests.filter(dr => dr.status === 'Submitted' || dr.status === 'UnderReview').length;
      const approvedDraws = project.drawRequests.filter(dr => dr.status === 'Approved' || dr.status === 'Funded').length;

      return {
        ...project,
        metrics: {
          totalBudget: project.budget || 0,
          totalSpent,
          budgetUtilization: Math.round(budgetUtilization * 100) / 100,
          pendingDraws,
          approvedDraws,
          totalDraws: project._count.drawRequests,
          openRFIs: project._count.rfis,
          changeOrders: project._count.changeOrders
        }
      };
    });

    return NextResponse.json({ projects: projectsWithMetrics });
  } catch (error) {
    console.error('Error fetching lender dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch lender data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can grant lender access
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, projectId, loanAmount, institution, loanNumber, canApproveDraws } = body;

    const lenderAccess = await prisma.lenderAccess.create({
      data: {
        userId,
        projectId,
        loanAmount,
        institution,
        loanNumber,
        canApproveDraws: canApproveDraws || false
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ lenderAccess }, { status: 201 });
  } catch (error) {
    console.error('Error creating lender access:', error);
    return NextResponse.json({ error: 'Failed to create lender access' }, { status: 500 });
  }
}
