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

    const categories = await prisma.budgetCategory.findMany({
      where: { projectId },
      include: {
        transactions: {
          select: { amount: true, type: true, status: true }
        },
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    });

    // Calculate totals for each category
    const categoriesWithTotals = categories.map(cat => {
      const paidTransactions = cat.transactions.filter(t => t.status === 'Paid');
      const spent = paidTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
      const committed = cat.transactions
        .filter(t => t.status === 'Pending' || t.status === 'Approved')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      return {
        ...cat,
        spent,
        committed,
        remaining: (cat.budgetedAmount || 0) - spent - committed,
        transactions: undefined
      };
    });

    return NextResponse.json({ categories: categoriesWithTotals });
  } catch (error) {
    console.error('Error fetching budget categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, name, code, budgetedAmount, parentId, description } = body;

    if (!projectId || !name) {
      return NextResponse.json({ error: 'Project ID and name required' }, { status: 400 });
    }

    const category = await prisma.budgetCategory.create({
      data: {
        projectId,
        name,
        code,
        budgetedAmount: budgetedAmount || 0,
        parentId,
        description
      }
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Error creating budget category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
