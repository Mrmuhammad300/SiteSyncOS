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
    const available = searchParams.get('available');

    const where: Record<string, unknown> = {};
    if (propertyId) where.propertyId = propertyId;
    if (available === 'true') where.isOccupied = false;

    const units = await prisma.unit.findMany({
      where,
      include: {
        property: { select: { id: true, name: true, street: true, city: true } },
        tenants: {
          include: { tenant: { select: { id: true, firstName: true, lastName: true } } }
        }
      },
      orderBy: [{ floor: 'asc' }, { unitNumber: 'asc' }]
    });

    return NextResponse.json({ units });
  } catch (error) {
    console.error('Error fetching units:', error);
    return NextResponse.json({ error: 'Failed to fetch units' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { propertyId, unitNumber, floor, squareFeet, bedrooms, bathrooms, marketRent, unitType, amenities, features } = body;

    if (!propertyId || !unitNumber || marketRent === undefined) {
      return NextResponse.json({ error: 'Property ID, unit number, and market rent required' }, { status: 400 });
    }

    const unit = await prisma.unit.create({
      data: {
        propertyId,
        unitNumber,
        floor,
        squareFeet,
        bedrooms: bedrooms || 0,
        bathrooms: bathrooms || 1,
        marketRent,
        unitType: unitType || 'Standard',
        amenities: amenities || [],
        features: features || [],
        isOccupied: false,
        isAvailable: true
      },
      include: {
        property: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json({ unit }, { status: 201 });
  } catch (error) {
    console.error('Error creating unit:', error);
    return NextResponse.json({ error: 'Failed to create unit' }, { status: 500 });
  }
}
