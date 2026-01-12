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

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Get project budget
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { budget: true }
    });

    // Get all transactions
    const transactions = await prisma.budgetTransaction.findMany({
      where: { projectId },
      select: { amount: true, type: true, status: true }
    });

    // Get categories with their budgets
    const categories = await prisma.budgetCategory.findMany({
      where: { projectId },
      include: {
        transactions: {
          select: { amount: true, type: true, status: true }
        }
      }
    });

    // Calculate totals
    const totalSpent = transactions
      .filter(t => t.status === 'Paid' && t.type === 'Expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalCommitted = transactions
      .filter(t => (t.status === 'Pending' || t.status === 'Approved') && t.type === 'Expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalBudget = project?.budget || 0;
    const totalRemaining = totalBudget - totalSpent - totalCommitted;

    // Calculate by category
    const categoryBreakdown = categories.map(cat => {
      const catSpent = cat.transactions
        .filter(t => t.status === 'Paid')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      return {
        name: cat.name,
        budget: cat.budgetedAmount || 0,
        spent: catSpent,
        percentage: cat.budgetedAmount ? Math.round((catSpent / cat.budgetedAmount) * 100) : 0
      };
    });

    return NextResponse.json({
      summary: {
        totalBudget,
        totalSpent,
        totalCommitted,
        totalRemaining,
        categories: categoryBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching budget summary:', error);
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
  }
}
