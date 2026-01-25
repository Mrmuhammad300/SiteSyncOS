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

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;

    // Lenders only see draws for projects they have access to
    const userRole = (session.user as { role?: string }).role;
    if (userRole === 'Lender') {
      const lenderAccess = await prisma.lenderAccess.findMany({
        where: { userId: (session.user as { id: string }).id },
        select: { projectId: true }
      });
      where.projectId = { in: lenderAccess.map(la => la.projectId) };
    }

    const drawRequests = await prisma.drawRequest.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, projectNumber: true } },
        submittedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        items: true,
        documents: true,
        complianceChecks: true,
        approvalWorkflow: {
          select: {
            approvalStatus: true,
            evidenceComplete: true,
            policyValidated: true,
            riskScore: true,
            conditions: true,
          }
        },
        _count: { select: { items: true, documents: true, complianceChecks: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ drawRequests });
  } catch (error) {
    console.error('Error fetching draw requests:', error);
    return NextResponse.json({ error: 'Failed to fetch draw requests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, drawNumber, title, description, requestedAmount, retainagePercent } = body;

    if (!projectId || !drawNumber || !title) {
      return NextResponse.json({ error: 'Project ID, draw number, and title required' }, { status: 400 });
    }

    // Generate request number
    const count = await prisma.drawRequest.count();
    const requestNumber = `DR-${String(count + 1).padStart(5, '0')}`;

    const drawRequest = await prisma.drawRequest.create({
      data: {
        projectId,
        drawNumber,
        requestNumber,
        title,
        description,
        requestedAmount: requestedAmount || 0,
        retainagePercent: retainagePercent || 0.10,
        status: 'Draft'
      },
      include: {
        project: { select: { id: true, name: true } },
        items: true
      }
    });

    return NextResponse.json({ drawRequest }, { status: 201 });
  } catch (error) {
    console.error('Error creating draw request:', error);
    return NextResponse.json({ error: 'Failed to create draw request' }, { status: 500 });
  }
}
