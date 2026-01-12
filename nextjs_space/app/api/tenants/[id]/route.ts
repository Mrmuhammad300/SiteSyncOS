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

    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
      include: {
        property: { select: { id: true, name: true, street: true, city: true } },
        units: {
          include: { unit: true }
        },
        leases: {
          orderBy: { startDate: 'desc' }
        },
        payments: {
          orderBy: { dueDate: 'desc' }
        },
        communications: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Calculate payment stats
    const totalPaid = tenant.payments
      .filter(p => p.status === 'Completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const outstanding = tenant.payments
      .filter(p => p.status === 'Pending' || p.status === 'Processing')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return NextResponse.json({ 
      tenant,
      stats: { totalPaid, outstanding }
    });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return NextResponse.json({ error: 'Failed to fetch tenant' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { firstName, lastName, email, phone, status, notes } = body;

    const updateData: Record<string, unknown> = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const tenant = await prisma.tenant.update({
      where: { id: params.id },
      data: updateData,
      include: {
        property: { select: { id: true, name: true } },
        units: { include: { unit: true } },
        leases: { where: { status: 'Active' } }
      }
    });

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error('Error updating tenant:', error);
    return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 });
  }
}
