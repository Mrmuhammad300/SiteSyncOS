import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { costAnalysisService } from '@/lib/cost-analysis/cost-analysis-service';

// GET /api/cost-analysis/search - Search cost items across 1build and RSMeans
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const zipCode = searchParams.get('zipCode') || undefined;
    const source = (searchParams.get('source') as '1build' | 'rsmeans' | 'both') || 'both';
    const limit = parseInt(searchParams.get('limit') || '25');

    if (!query) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    const results = await costAnalysisService.searchCostItems({
      query,
      zipCode,
      source,
      limit,
    });

    return NextResponse.json({
      data: results,
      total: results.length,
      query,
      source,
    });
  } catch (error) {
    console.error('Cost item search error:', error);
    return NextResponse.json({ error: 'Failed to search cost items' }, { status: 500 });
  }
}
