import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { costAnalysisService, type CostAnalysisRequest } from '@/lib/cost-analysis/cost-analysis-service';

// GET /api/cost-analysis - List saved cost estimates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = { userId: user.id };
    if (projectId) where.projectId = projectId;

    const [estimates, total] = await Promise.all([
      prisma.costEstimate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          project: { select: { id: true, name: true, projectNumber: true } },
        },
      }),
      prisma.costEstimate.count({ where }),
    ]);

    return NextResponse.json({
      data: estimates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Cost analysis list error:', error);
    return NextResponse.json({ error: 'Failed to fetch cost estimates' }, { status: 500 });
  }
}

// POST /api/cost-analysis - Run a new cost analysis
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      projectId,
      estimateName,
      projectName,
      projectType,
      location,
      squareFootage,
      stories,
      description,
      includeRSMeansBenchmark,
    } = body;

    if (!projectName || !projectType || !location?.zipCode || !squareFootage) {
      return NextResponse.json(
        { error: 'Missing required fields: projectName, projectType, location.zipCode, squareFootage' },
        { status: 400 }
      );
    }

    // Run cost analysis via the unified service
    const analysisRequest: CostAnalysisRequest = {
      projectName,
      projectType,
      location,
      squareFootage,
      stories,
      description,
      includeRSMeansBenchmark,
    };

    const result = await costAnalysisService.runCostAnalysis(analysisRequest);

    // Persist the result
    const dataSources: string[] = [];
    if (result.oneBuildEstimate) dataSources.push('1build');
    if (result.rsMeansBenchmark) dataSources.push('rsmeans');

    const costEstimate = await prisma.costEstimate.create({
      data: {
        userId: user.id,
        projectId: projectId || null,
        estimateName: estimateName || `${projectName} - Cost Analysis`,
        projectType,
        squareFootage,
        stories: stories || 1,
        description,
        address: location.address,
        city: location.city,
        state: location.state,
        zipCode: location.zipCode,

        oneBuildEstimateId: result.oneBuildEstimate?.estimateId,
        oneBuildStatus: result.oneBuildEstimate?.status,
        oneBuildTotalCost: result.oneBuildEstimate?.totalCost,
        oneBuildCostPerSqFt: result.oneBuildEstimate?.costPerSqFt,
        oneBuildLineItems: result.oneBuildEstimate?.lineItems ?? undefined,

        rsMeansNationalAvg: result.rsMeansBenchmark?.nationalAvgCostPerSqFt,
        rsMeansLocalizedAvg: result.rsMeansBenchmark?.localizedCostPerSqFt,
        rsMeansLocationFactor: result.rsMeansBenchmark?.locationFactor,
        rsMeansCostRangeLow: result.rsMeansBenchmark?.costRange.low,
        rsMeansCostRangeMid: result.rsMeansBenchmark?.costRange.median,
        rsMeansCostRangeHigh: result.rsMeansBenchmark?.costRange.high,

        benchmarkDelta: result.comparison?.estimateVsBenchmarkDelta,
        benchmarkDeltaPercent: result.comparison?.estimateVsBenchmarkPercent,
        isAboveBenchmark: result.comparison?.isAboveBenchmark,
        confidenceLevel: result.comparison?.confidenceLevel,
        recommendations: result.comparison?.recommendations ?? [],

        estimatedTotalCost: result.summary.estimatedTotalCost,
        costPerSqFt: result.summary.costPerSqFt,
        laborTotal: result.summary.laborTotal,
        materialTotal: result.summary.materialTotal,
        equipmentTotal: result.summary.equipmentTotal,
        contingency: result.summary.contingency,
        grandTotal: result.summary.grandTotal,

        dataSources,
      },
    });

    return NextResponse.json({
      estimate: costEstimate,
      analysis: result,
    }, { status: 201 });
  } catch (error) {
    console.error('Cost analysis error:', error);
    return NextResponse.json({ error: 'Failed to run cost analysis' }, { status: 500 });
  }
}
