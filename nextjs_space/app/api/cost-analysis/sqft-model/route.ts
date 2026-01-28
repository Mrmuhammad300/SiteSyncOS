import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { costAnalysisService } from '@/lib/cost-analysis/cost-analysis-service';
import { gordianClient } from '@/lib/cost-analysis/gordian-client';

// GET /api/cost-analysis/sqft-model - List available square foot models
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const models = await gordianClient.listSquareFootModels();
    return NextResponse.json({ data: models });
  } catch (error) {
    console.error('Square foot models error:', error);
    return NextResponse.json({ error: 'Failed to fetch square foot models' }, { status: 500 });
  }
}

// POST /api/cost-analysis/sqft-model - Generate a square foot estimate
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { modelId, wallCode, area, perimeter, stories, storyHeight, locationId, includeBasement, contractorFees, architecturalFees } = body;

    if (!modelId || !wallCode || !area) {
      return NextResponse.json(
        { error: 'Missing required fields: modelId, wallCode, area' },
        { status: 400 }
      );
    }

    const estimate = await costAnalysisService.generateSquareFootEstimate({
      modelId,
      wallCode,
      area,
      perimeter,
      stories,
      storyHeight,
      locationId,
      includeBasement,
      contractorFees,
      architecturalFees,
    });

    return NextResponse.json(estimate);
  } catch (error) {
    console.error('Square foot estimate error:', error);
    return NextResponse.json({ error: 'Failed to generate square foot estimate' }, { status: 500 });
  }
}
