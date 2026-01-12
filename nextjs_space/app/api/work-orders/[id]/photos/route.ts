import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cloudStoragePath, caption, isPublic } = body;

    if (!cloudStoragePath) {
      return NextResponse.json({ error: 'Missing cloudStoragePath' }, { status: 400 });
    }

    const photo = await prisma.workOrderPhoto.create({
      data: {
        workOrderId: params.id,
        cloudStoragePath,
        caption,
        isPublic: isPublic || false,
        uploadedById: session.user.id,
      },
    });

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    console.error('Error adding photo:', error);
    return NextResponse.json({ error: 'Failed to add photo' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const photos = await prisma.workOrderPhoto.findMany({
      where: { workOrderId: params.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ photos });
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
}
