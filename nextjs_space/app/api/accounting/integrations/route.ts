import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { validate } from '@/lib/validations';
import { CreateAccountingIntegrationSchema } from '@/lib/validations/accounting';

type AccountingProvider = 'QuickBooks' | 'Xero' | 'FreshBooks' | 'Sage' | 'NetSuite' | 'Custom';

/**
 * GET /api/accounting/integrations
 * List all accounting integrations for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session.user as any).id;
    
    const integrations = await prisma.accountingIntegration.findMany({
      where: {
        userId
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        provider: true,
        name: true,
        companyId: true,
        isActive: true,
        autoSyncEnabled: true,
        syncFrequency: true,
        lastSyncAt: true,
        lastError: true,
        syncCount: true,
        createdAt: true,
        updatedAt: true,
        // Don't return sensitive credentials
      }
    });
    
    return NextResponse.json({ integrations });
  } catch (error) {
    console.error('[ACCOUNTING_INTEGRATIONS_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/integrations
 * Create a new accounting integration
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await validate(req, CreateAccountingIntegrationSchema);
  if (!parsed.ok) return parsed.error;

  const userId = (session.user as any).id;
  const {
    provider, name, companyId, apiKey, apiSecret,
    accessToken, refreshToken, webhookUrl, config,
    autoSyncEnabled, syncFrequency,
  } = parsed.data;

  try {
    const integration = await prisma.accountingIntegration.create({
      data: {
        userId,
        provider: provider as AccountingProvider,
        name,
        companyId: companyId ?? null,
        apiKey: apiKey ?? null,
        apiSecret: apiSecret ?? null,
        accessToken: accessToken ?? null,
        refreshToken: refreshToken ?? null,
        webhookUrl: webhookUrl ?? null,
        config: config != null ? JSON.stringify(config) : null,
        autoSyncEnabled,
        syncFrequency: syncFrequency ?? null,
        isActive: true,
      },
      select: {
        id: true,
        provider: true,
        name: true,
        companyId: true,
        isActive: true,
        autoSyncEnabled: true,
        syncFrequency: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    return NextResponse.json({ integration }, { status: 201 });
  } catch (error) {
    console.error('[ACCOUNTING_INTEGRATIONS_POST]', error);
    return NextResponse.json(
      { error: 'Failed to create integration' },
      { status: 500 }
    );
  }
}
