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

    const rawWorkOrders = await prisma.maintenanceWorkOrder.findMany({
      where,
      include: {
        property: { select: { id: true, name: true, street: true, city: true } },
        unit: { select: { id: true, unitNumber: true, floor: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedVendor: { select: { id: true, companyName: true, contactName: true } },
        tenant: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Transform data to match frontend interface
    const workOrders = rawWorkOrders.map(wo => ({
      ...wo,
      property: wo.property ? {
        id: wo.property.id,
        name: wo.property.name,
        address: `${wo.property.street || ''}, ${wo.property.city || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
      } : null,
      assignedTo: wo.assignedTo ? {
        id: wo.assignedTo.id,
        name: `${wo.assignedTo.firstName} ${wo.assignedTo.lastName}`.trim()
      } : null,
      vendor: wo.assignedVendor ? {
        id: wo.assignedVendor.id,
        companyName: wo.assignedVendor.companyName || wo.assignedVendor.contactName || 'Unknown Vendor'
      } : null,
      reportedBy: wo.tenant ? {
        id: wo.tenant.id,
        name: `${wo.tenant.firstName} ${wo.tenant.lastName}`.trim()
      } : { id: '', name: 'Staff' }
    }));

    return NextResponse.json({ workOrders });
  } catch (error) {
    console.error('Error fetching maintenance work orders:', error);
    return NextResponse.json({ workOrders: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        description: description || '',
        category,
        priority: priority || 'Normal',
        status: 'Reported',
        assignedToId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null
      },
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, unitNumber: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    return NextResponse.json({ workOrder }, { status: 201 });
  } catch (error) {
    console.error('Error creating maintenance work order:', error);
    return NextResponse.json({ error: 'Failed to create work order' }, { status: 500 });
  }
}
