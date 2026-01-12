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

    const categories = await prisma.budgetCategory.findMany({
      where: { projectId },
      include: {
        transactions: {
          select: { amount: true, status: true, type: true },
        },
        children: true,
      },
      orderBy: { code: 'asc' },
    });

    // Calculate spent and remaining for each category
    const categoriesWithStats = categories.map((cat) => {
      const spent = cat.transactions
        .filter((t) => t.type === 'Expense' && (t.status === 'Approved' || t.status === 'Paid'))
        .reduce((sum, t) => sum + t.amount, 0);
      const pending = cat.transactions
        .filter((t) => t.type === 'Expense' && t.status === 'Pending')
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        ...cat,
        spent,
        pending,
        remaining: cat.budgetedAmount - spent,
        percentUsed: cat.budgetedAmount > 0 ? (spent / cat.budgetedAmount) * 100 : 0,
        transactions: undefined,
      };
    });

    return NextResponse.json({ categories: categoriesWithStats });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, name, code, description, budgetedAmount, parentId } = body;

    if (!projectId || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const category = await prisma.budgetCategory.create({
      data: {
        projectId,
        name,
        code,
        description,
        budgetedAmount: budgetedAmount || 0,
        parentId,
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
