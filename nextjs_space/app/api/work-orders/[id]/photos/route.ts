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

    const photos = await prisma.workOrderPhoto.findMany({
      where: { workOrderId: params.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ photos });
  } catch (error) {
    console.error('Error fetching photos:', error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    const body = await req.json();
    const { cloudStoragePath, caption, isPublic } = body;

    if (!cloudStoragePath) {
      return NextResponse.json({ error: 'Cloud storage path required' }, { status: 400 });
    }

    const photo = await prisma.workOrderPhoto.create({
      data: {
        workOrderId: params.id,
        cloudStoragePath,
        caption,
        isPublic: isPublic || false,
        uploadedById: userId
      }
    });

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    console.error('Error creating photo:', error);
    return NextResponse.json({ error: 'Failed to create photo' }, { status: 500 });
  }
}
