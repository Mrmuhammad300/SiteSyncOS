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

    const rawTenants = await prisma.tenant.findMany({
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

    // Transform data to match frontend interface
    const tenants = rawTenants.map(t => ({
      id: t.id,
      companyName: null, // Schema doesn't have company name, use null
      contactName: `${t.firstName} ${t.lastName}`.trim(),
      email: t.email || '',
      phone: t.phone,
      type: 'Residential', // Default type since schema doesn't have this
      status: t.status,
      property: t.property ? {
        id: t.property.id,
        name: t.property.name,
        address: `${t.property.street || ''}, ${t.property.city || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
      } : null,
      units: t.units || [],
      leases: t.leases.map(l => ({
        id: l.id,
        monthlyRent: l.monthlyRent ? Number(l.monthlyRent) : 0,
        startDate: l.startDate ? l.startDate.toISOString() : '',
        endDate: l.endDate ? l.endDate.toISOString() : '',
        status: l.status
      })),
      payments: t.payments.map(p => ({
        id: p.id,
        amount: p.amount ? Number(p.amount) : 0,
        dueDate: p.dueDate ? p.dueDate.toISOString() : '',
        status: p.status
      })),
      _count: t._count
    }));

    return NextResponse.json({ tenants });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json({ tenants: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { propertyId, contactName, email, phone, unitIds } = body;

    if (!propertyId || !contactName) {
      return NextResponse.json({ error: 'Property ID and contact name required' }, { status: 400 });
    }

    // Parse contact name into first/last
    const nameParts = contactName.trim().split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || '';

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
