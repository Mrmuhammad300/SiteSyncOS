import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const drawRequest = await prisma.drawRequest.findUnique({
      where: { id: params.id },
      include: {
        project: { select: { id: true, name: true, budget: true } },
        submittedBy: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        items: true,
        documents: true,
        complianceChecks: true
      }
    });

    if (!drawRequest) {
      return NextResponse.json({ error: 'Draw request not found' }, { status: 404 });
    }

    return NextResponse.json({ drawRequest });
  } catch (error) {
    console.error('Error fetching draw request:', error);
    return NextResponse.json({ error: 'Failed to fetch draw request' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;

    const body = await req.json();
    const { status, lenderComments, internalNotes, approvedAmount } = body;

    const updateData: Record<string, unknown> = {};
    
    if (status) {
      updateData.status = status;
      
      if (status === 'Submitted') {
        updateData.submittedDate = new Date();
        if (userId) updateData.submittedById = userId;
      } else if (status === 'UnderReview') {
        updateData.reviewedDate = new Date();
        if (userId) updateData.reviewedById = userId;
      } else if (status === 'Approved') {
        updateData.approvedDate = new Date();
        if (userId) updateData.approvedById = userId;
      } else if (status === 'Funded') {
        updateData.fundedDate = new Date();
      }
    }

    if (lenderComments !== undefined) updateData.lenderComments = lenderComments;
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes;
    if (approvedAmount !== undefined) updateData.approvedAmount = approvedAmount;

    const drawRequest = await prisma.drawRequest.update({
      where: { id: params.id },
      data: updateData,
      include: {
        project: { select: { id: true, name: true } },
        items: true,
        documents: true,
        complianceChecks: true
      }
    });

    return NextResponse.json({ drawRequest });
  } catch (error) {
    console.error('Error updating draw request:', error);
    return NextResponse.json({ error: 'Failed to update draw request' }, { status: 500 });
  }
}
