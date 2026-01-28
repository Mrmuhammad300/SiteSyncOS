import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { costAnalysisService } from '@/lib/cost-analysis/cost-analysis-service';

// GET /api/cost-analysis/divisions - Get CSI division breakdown from RSMeans
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const catalogId = searchParams.get('catalogId') || undefined;

    const result = await costAnalysisService.getDivisionBreakdown(catalogId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Division breakdown error:', error);
    return NextResponse.json({ error: 'Failed to fetch division breakdown' }, { status: 500 });
  }
}
