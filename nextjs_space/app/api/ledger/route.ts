/**
 * SiteSync OS - Ledger API
 * Financial journal entries with audit trails
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { generateLedgerEntryNumber, ACCOUNT_CODES } from '@/lib/quantum-ledger';
import { LedgerEntryType } from '@prisma/client';

interface SessionUser {
  id: string;
  role: string;
}

// GET /api/ledger - List ledger entries
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const accountCode = searchParams.get('accountCode');
    const reconciled = searchParams.get('reconciled');
    const limit = parseInt(searchParams.get('limit') ?? '100');
    const offset = parseInt(searchParams.get('offset') ?? '0');

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (accountCode) where.accountCode = accountCode;
    if (reconciled !== null) where.reconciled = reconciled === 'true';

    const [entries, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, projectNumber: true } },
          event: { select: { id: true, eventType: true, occurredAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.ledgerEntry.count({ where }),
    ]);

    // Calculate totals
    const totals = await prisma.ledgerEntry.groupBy({
      by: ['entryType'],
      where,
      _sum: { amount: true },
    });

    const totalDebits = totals.find(t => t.entryType === 'Debit')?._sum.amount ?? 0;
    const totalCredits = totals.find(t => t.entryType === 'Credit')?._sum.amount ?? 0;

    return NextResponse.json({
      entries,
      pagination: { total, limit, offset },
      summary: {
        totalDebits,
        totalCredits,
        balance: totalDebits - totalCredits,
      },
      accountCodes: ACCOUNT_CODES,
    });
  } catch (error) {
    console.error('Error fetching ledger entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ledger entries' },
      { status: 500 }
    );
  }
}

// POST /api/ledger - Create a manual ledger entry
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user as SessionUser;

    // Only admins and project managers can create manual entries
    if (!['SuperAdmin', 'Admin', 'ProjectManager'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      projectId,
      entryType,
      accountCode,
      accountName,
      description,
      amount,
      metadata,
    } = body;

    if (!projectId || !entryType || !accountCode || !description || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const entryNumber = await generateLedgerEntryNumber();

    const entry = await prisma.ledgerEntry.create({
      data: {
        entryNumber,
        projectId,
        entryType: entryType as LedgerEntryType,
        accountCode,
        accountName: accountName ?? getAccountName(accountCode),
        description,
        amount: parseFloat(amount),
        metadata,
        lineageRef: `manual-${user.id}-${Date.now()}`,
      },
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error('Error creating ledger entry:', error);
    return NextResponse.json(
      { error: 'Failed to create ledger entry' },
      { status: 500 }
    );
  }
}

// PATCH /api/ledger - Reconcile entries
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = session.user as SessionUser;

    const body = await req.json();
    const { entryIds, reconcile } = body;

    if (!entryIds || !Array.isArray(entryIds)) {
      return NextResponse.json(
        { error: 'Missing entryIds array' },
        { status: 400 }
      );
    }

    await prisma.ledgerEntry.updateMany({
      where: { id: { in: entryIds } },
      data: {
        reconciled: reconcile !== false,
        reconciledAt: reconcile !== false ? new Date() : null,
        reconciledById: reconcile !== false ? user.id : null,
      },
    });

    return NextResponse.json({
      message: `${entryIds.length} entries ${reconcile !== false ? 'reconciled' : 'unreconciled'}`,
    });
  } catch (error) {
    console.error('Error reconciling entries:', error);
    return NextResponse.json(
      { error: 'Failed to reconcile entries' },
      { status: 500 }
    );
  }
}

function getAccountName(code: string): string {
  const names: Record<string, string> = {
    '1100': 'Construction Draws',
    '1200': 'Retainage',
    '2100': 'Accounts Payable',
    '5100': 'Construction Expense',
    '5200': 'Contingency',
  };
  return names[code] ?? 'Other';
}
