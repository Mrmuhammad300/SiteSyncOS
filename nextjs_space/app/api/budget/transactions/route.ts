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
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const categoryId = searchParams.get('categoryId');

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (type) where.type = type;
    if (categoryId) where.categoryId = categoryId;

    const transactions = await prisma.budgetTransaction.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, name: true } }
      },
      orderBy: { transactionDate: 'desc' }
    });

    // Calculate summary stats
    const summary = {
      totalExpenses: transactions
        .filter(t => t.type === 'Expense')
        .reduce((sum, t) => sum + (t.amount || 0), 0),
      totalIncome: transactions
        .filter(t => t.type === 'Income')
        .reduce((sum, t) => sum + (t.amount || 0), 0),
      count: transactions.length
    };

    return NextResponse.json({ transactions, summary });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const body = await req.json();
    const { projectId, categoryId, description, amount, type, transactionDate, vendorName, vendorInvoiceNumber, notes } = body;

    if (!projectId || !description || amount === undefined || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Generate transaction number
    const count = await prisma.budgetTransaction.count();
    const transactionNumber = `TXN-${String(count + 1).padStart(6, '0')}`;

    const transaction = await prisma.budgetTransaction.create({
      data: {
        transactionNumber,
        projectId,
        categoryId,
        description,
        amount,
        type,
        status: 'Pending',
        transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
        vendorName,
        vendorInvoiceNumber,
        notes,
        submittedById: userId
      },
      include: {
        project: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
