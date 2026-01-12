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
    const unitId = searchParams.get('unitId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');

    const where: Record<string, unknown> = {};
    if (propertyId) where.propertyId = propertyId;
    if (unitId) where.unitId = unitId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;

    const workOrders = await prisma.maintenanceWorkOrder.findMany({
      where,
      include: {
        property: { select: { id: true, name: true, street: true, city: true } },
        unit: { select: { id: true, unitNumber: true, floor: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        tenant: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({ workOrders });
  } catch (error) {
    console.error('Error fetching maintenance work orders:', error);
    return NextResponse.json({ error: 'Failed to fetch work orders' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;

    const body = await req.json();
    const { propertyId, unitId, tenantId, title, description, category, priority, assignedToId, scheduledDate, estimatedCost } = body;

    if (!propertyId || !title || !category) {
      return NextResponse.json({ error: 'Property ID, title, and category required' }, { status: 400 });
    }

    // Generate work order number
    const count = await prisma.maintenanceWorkOrder.count();
    const workOrderNumber = `MWO-${String(count + 1).padStart(5, '0')}`;

    const workOrder = await prisma.maintenanceWorkOrder.create({
      data: {
        workOrderNumber,
        propertyId,
        unitId,
        tenantId,
        title,
        description,
        category,
        priority: priority || 'Normal',
        status: 'Reported',
        assignedToId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        estimatedCost
      },
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, unitNumber: true } },
        assignedTo: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ workOrder }, { status: 201 });
  } catch (error) {
    console.error('Error creating maintenance work order:', error);
    return NextResponse.json({ error: 'Failed to create work order' }, { status: 500 });
  }
}
