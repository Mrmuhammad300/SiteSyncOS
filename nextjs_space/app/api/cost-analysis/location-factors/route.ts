import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { costAnalysisService } from '@/lib/cost-analysis/cost-analysis-service';

// GET /api/cost-analysis/location-factors?zipCode=90210
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const zipCode = searchParams.get('zipCode');

    if (!zipCode) {
      return NextResponse.json({ error: 'Query parameter "zipCode" is required' }, { status: 400 });
    }

    const factors = await costAnalysisService.getLocationCostFactors(zipCode);

    return NextResponse.json(factors);
  } catch (error) {
    console.error('Location factors error:', error);
    return NextResponse.json({ error: 'Failed to fetch location cost factors' }, { status: 500 });
  }
}
