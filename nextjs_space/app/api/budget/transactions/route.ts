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
    const status = searchParams.get('status');
    const expenseType = searchParams.get('expenseType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    if (expenseType) where.expenseType = expenseType;
    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate);
      if (endDate) where.transactionDate.lte = new Date(endDate);
    }

    const transactions = await prisma.budgetTransaction.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        category: { select: { id: true, name: true, code: true } },
        submittedBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { transactionDate: 'desc' },
    });

    // Calculate summary stats
    const summary = {
      totalExpenses: 0,
      totalPending: 0,
      totalApproved: 0,
      byCategory: {} as Record<string, number>,
    };

    transactions.forEach((t) => {
      if (t.type === 'Expense') {
        summary.totalExpenses += t.amount;
        if (t.status === 'Pending') summary.totalPending += t.amount;
        if (t.status === 'Approved' || t.status === 'Paid') summary.totalApproved += t.amount;
        summary.byCategory[t.expenseType] = (summary.byCategory[t.expenseType] || 0) + t.amount;
      }
    });

    return NextResponse.json({ transactions, summary });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      projectId,
      categoryId,
      type,
      expenseType,
      description,
      amount,
      vendorName,
      vendorInvoiceNumber,
      transactionDate,
      dueDate,
      receiptPath,
      invoicePath,
      notes,
    } = body;

    if (!projectId || !description || amount === undefined) {
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
        type: type || 'Expense',
        expenseType: expenseType || 'Other',
        description,
        amount,
        vendorName,
        vendorInvoiceNumber,
        transactionDate: new Date(transactionDate || Date.now()),
        dueDate: dueDate ? new Date(dueDate) : null,
        receiptPath,
        invoicePath,
        notes,
        submittedById: session.user.id,
      },
      include: {
        project: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
