import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Get project budget
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, budget: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get all transactions for this project
    const transactions = await prisma.budgetTransaction.findMany({
      where: { projectId },
      select: { type: true, expenseType: true, amount: true, status: true, transactionDate: true },
    });

    // Calculate totals
    const summary = {
      totalBudget: project.budget,
      totalSpent: 0,
      totalPending: 0,
      totalApproved: 0,
      remaining: project.budget,
      percentUsed: 0,
      byCategory: {} as Record<string, { budgeted: number; spent: number; pending: number }>,
      monthlyTrend: [] as { month: string; amount: number }[],
    };

    // Get category budgets
    const categories = await prisma.budgetCategory.findMany({
      where: { projectId },
      select: { name: true, budgetedAmount: true },
    });

    categories.forEach((cat) => {
      summary.byCategory[cat.name] = { budgeted: cat.budgetedAmount, spent: 0, pending: 0 };
    });

    // Process transactions
    const monthlyData: Record<string, number> = {};

    transactions.forEach((t) => {
      if (t.type === 'Expense') {
        if (t.status === 'Approved' || t.status === 'Paid') {
          summary.totalSpent += t.amount;
          summary.totalApproved += t.amount;
        } else if (t.status === 'Pending') {
          summary.totalPending += t.amount;
        }

        // Track by expense type
        if (!summary.byCategory[t.expenseType]) {
          summary.byCategory[t.expenseType] = { budgeted: 0, spent: 0, pending: 0 };
        }
        if (t.status === 'Approved' || t.status === 'Paid') {
          summary.byCategory[t.expenseType].spent += t.amount;
        } else if (t.status === 'Pending') {
          summary.byCategory[t.expenseType].pending += t.amount;
        }

        // Monthly trend
        const month = t.transactionDate.toISOString().slice(0, 7);
        monthlyData[month] = (monthlyData[month] || 0) + t.amount;
      }
    });

    summary.remaining = summary.totalBudget - summary.totalSpent;
    summary.percentUsed = summary.totalBudget > 0 ? (summary.totalSpent / summary.totalBudget) * 100 : 0;

    // Convert monthly data to array
    summary.monthlyTrend = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }));

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error fetching budget summary:', error);
    return NextResponse.json({ error: 'Failed to fetch budget summary' }, { status: 500 });
  }
}
