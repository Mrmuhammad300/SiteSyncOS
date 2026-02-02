import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

/**
 * GET /api/activities
 * Get activity feed
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build filter
    const where: any = {};

    if (projectId) {
      where.projectId = projectId;
    }

    if (userId) {
      where.userId = userId;
    }

    // For non-admin users, only show activities from their projects
    if (user.role !== 'Admin') {
      // Get user's project IDs
      const userProjects = await prisma.projectTeam.findMany({
        where: { userId: user.id },
        select: { projectId: true },
      });

      const projectIds = userProjects.map((pt: { projectId: string }) => pt.projectId);

      if (where.projectId) {
        // Check if user has access to the requested project
        if (!projectIds.includes(where.projectId)) {
          return NextResponse.json(
            { error: 'Access denied' },
            { status: 403 }
          );
        }
      } else {
        // Limit to user's projects
        where.projectId = { in: projectIds };
      }
    }

    // Get activities
    const activities = await prisma.activity.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        project: {
          select: {
            name: true,
            projectNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      activities,
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}
