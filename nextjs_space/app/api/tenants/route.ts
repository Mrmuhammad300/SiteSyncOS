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
    const propertyId = searchParams.get('propertyId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (propertyId) where.propertyId = propertyId;
    if (status) where.status = status;

    const tenants = await prisma.tenant.findMany({
      where,
      include: {
        property: { select: { id: true, name: true, street: true, city: true } },
        units: {
          include: {
            unit: { select: { id: true, unitNumber: true, floor: true } }
          }
        },
        leases: {
          where: { status: 'Active' },
          orderBy: { startDate: 'desc' },
          take: 1
        },
        payments: {
          orderBy: { dueDate: 'desc' },
          take: 5
        },
        _count: { select: { payments: true, communications: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ tenants });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { propertyId, firstName, lastName, email, phone, unitIds } = body;

    if (!propertyId || !firstName || !lastName) {
      return NextResponse.json({ error: 'Property ID, first name, and last name required' }, { status: 400 });
    }

    const tenant = await prisma.tenant.create({
      data: {
        propertyId,
        firstName,
        lastName,
        email,
        phone,
        status: 'Prospect',
        units: unitIds?.length ? {
          create: unitIds.map((unitId: string, idx: number) => ({
            unitId,
            isPrimary: idx === 0
          }))
        } : undefined
      },
      include: {
        property: { select: { id: true, name: true } },
        units: { include: { unit: true } }
      }
    });

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 });
  }
}
