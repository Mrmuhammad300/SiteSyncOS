import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

/**
 * GET /api/accounting/integrations/[id]
 * Get a specific accounting integration
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session.user as any).id;
    const { id } = params;
    
    const integration = await prisma.accountingIntegration.findFirst({
      where: {
        id,
        userId
      },
      select: {
        id: true,
        provider: true,
        name: true,
        companyId: true,
        webhookUrl: true,
        config: true,
        autoSyncEnabled: true,
        syncFrequency: true,
        isActive: true,
        lastSyncAt: true,
        lastError: true,
        syncCount: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }
    
    // Parse config if it exists
    const parsedIntegration = {
      ...integration,
      config: integration.config ? JSON.parse(integration.config) : null
    };
    
    return NextResponse.json({ integration: parsedIntegration });
  } catch (error) {
    console.error('[ACCOUNTING_INTEGRATION_GET]', error);
    return NextResponse.json(
      { error: 'Failed to fetch integration' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/accounting/integrations/[id]
 * Update an accounting integration
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session.user as any).id;
    const { id } = params;
    const body = await req.json();
    
    // Verify ownership
    const existing = await prisma.accountingIntegration.findFirst({
      where: { id, userId }
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }
    
    // Prepare update data
    const updateData: any = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.companyId !== undefined) updateData.companyId = body.companyId;
    if (body.apiKey !== undefined) updateData.apiKey = body.apiKey;
    if (body.apiSecret !== undefined) updateData.apiSecret = body.apiSecret;
    if (body.accessToken !== undefined) updateData.accessToken = body.accessToken;
    if (body.refreshToken !== undefined) updateData.refreshToken = body.refreshToken;
    if (body.webhookUrl !== undefined) updateData.webhookUrl = body.webhookUrl;
    if (body.config !== undefined) {
      updateData.config = body.config ? JSON.stringify(body.config) : null;
    }
    if (body.autoSyncEnabled !== undefined) updateData.autoSyncEnabled = body.autoSyncEnabled;
    if (body.syncFrequency !== undefined) updateData.syncFrequency = body.syncFrequency;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    
    const integration = await prisma.accountingIntegration.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        provider: true,
        name: true,
        companyId: true,
        isActive: true,
        autoSyncEnabled: true,
        syncFrequency: true,
        lastSyncAt: true,
        syncCount: true,
        updatedAt: true
      }
    });
    
    return NextResponse.json({ integration });
  } catch (error) {
    console.error('[ACCOUNTING_INTEGRATION_PATCH]', error);
    return NextResponse.json(
      { error: 'Failed to update integration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/accounting/integrations/[id]
 * Delete an accounting integration
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = (session.user as any).id;
    const { id } = params;
    
    // Verify ownership
    const existing = await prisma.accountingIntegration.findFirst({
      where: { id, userId }
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }
    
    await prisma.accountingIntegration.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ACCOUNTING_INTEGRATION_DELETE]', error);
    return NextResponse.json(
      { error: 'Failed to delete integration' },
      { status: 500 }
    );
  }
}
