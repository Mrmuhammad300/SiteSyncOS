import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

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
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session.user as any).id;
    const body = await req.json();
    
    const {
      provider,
      name,
      companyId,
      apiKey,
      apiSecret,
      accessToken,
      refreshToken,
      webhookUrl,
      config,
      autoSyncEnabled,
      syncFrequency
    } = body;
    
    // Validate required fields
    if (!provider || !name) {
      return NextResponse.json(
        { error: 'Provider and name are required' },
        { status: 400 }
      );
    }
    
    // Validate provider
    const validProviders = ['QuickBooks', 'Xero', 'FreshBooks', 'Sage', 'NetSuite', 'Custom'];
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }
    
    // Create integration
    const integration = await prisma.accountingIntegration.create({
      data: {
        userId,
        provider: provider as AccountingProvider,
        name,
        companyId,
        apiKey,
        apiSecret,
        accessToken,
        refreshToken,
        webhookUrl,
        config: config ? JSON.stringify(config) : null,
        autoSyncEnabled: autoSyncEnabled || false,
        syncFrequency: syncFrequency || null,
        isActive: true
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
