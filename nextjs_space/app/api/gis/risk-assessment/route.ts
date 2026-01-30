import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// Risk assessment based on location data
// In a production environment, this would integrate with external APIs like FEMA, USGS, etc.

interface RiskFactors {
  floodRisk: number;
  earthquakeRisk: number;
  wildfireRisk: number;
  hurricaneRisk: number;
  tornadoRisk: number;
}

function calculateRiskScore(factors: RiskFactors): number {
  // Weighted average of risk factors
  const weights = {
    floodRisk: 0.3,
    earthquakeRisk: 0.2,
    wildfireRisk: 0.2,
    hurricaneRisk: 0.15,
    tornadoRisk: 0.15,
  };

  let score = 0;
  score += factors.floodRisk * weights.floodRisk;
  score += factors.earthquakeRisk * weights.earthquakeRisk;
  score += factors.wildfireRisk * weights.wildfireRisk;
  score += factors.hurricaneRisk * weights.hurricaneRisk;
  score += factors.tornadoRisk * weights.tornadoRisk;

  return Math.round(score);
}

function getRiskZone(score: number): 'Low' | 'Moderate' | 'High' | 'Severe' {
  if (score < 25) return 'Low';
  if (score < 50) return 'Moderate';
  if (score < 75) return 'High';
  return 'Severe';
}

function getHazardTypes(factors: RiskFactors): string[] {
  const hazards: string[] = [];
  if (factors.floodRisk > 40) hazards.push('Flood');
  if (factors.earthquakeRisk > 40) hazards.push('Earthquake');
  if (factors.wildfireRisk > 40) hazards.push('Wildfire');
  if (factors.hurricaneRisk > 40) hazards.push('Hurricane');
  if (factors.tornadoRisk > 40) hazards.push('Tornado');
  if (hazards.length === 0) hazards.push('None');
  return hazards;
}

// Simulated risk data based on US regions
// In production, this would come from external APIs
function getRegionalRiskFactors(lat: number, lng: number, state?: string): RiskFactors {
  const stateUpper = state?.toUpperCase() || '';
  
  // Default low risk
  let factors: RiskFactors = {
    floodRisk: 15,
    earthquakeRisk: 10,
    wildfireRisk: 10,
    hurricaneRisk: 10,
    tornadoRisk: 10,
  };

  // Gulf Coast states - Hurricane & Flood risk
  if (['FL', 'LA', 'TX', 'MS', 'AL'].includes(stateUpper) || (lng > -100 && lng < -80 && lat < 32)) {
    factors.hurricaneRisk = 70;
    factors.floodRisk = 60;
  }

  // Tornado Alley
  if (['OK', 'KS', 'NE', 'SD', 'TX', 'IA', 'MO'].includes(stateUpper) || (lng > -105 && lng < -90 && lat > 30 && lat < 45)) {
    factors.tornadoRisk = 65;
  }

  // California - Earthquake & Wildfire
  if (stateUpper === 'CA' || (lng > -125 && lng < -114 && lat > 32 && lat < 42)) {
    factors.earthquakeRisk = 75;
    factors.wildfireRisk = 65;
  }

  // Pacific Northwest - Earthquake
  if (['WA', 'OR'].includes(stateUpper) || (lng > -125 && lng < -116 && lat > 42 && lat < 49)) {
    factors.earthquakeRisk = 55;
  }

  // Southwest - Wildfire
  if (['AZ', 'NM', 'NV', 'UT', 'CO'].includes(stateUpper)) {
    factors.wildfireRisk = 50;
  }

  // Flood-prone river areas
  if (['WV', 'KY', 'TN', 'AR'].includes(stateUpper)) {
    factors.floodRisk = 50;
  }

  return factors;
}

// POST /api/gis/risk-assessment - Run risk assessment for a location
export async function POST(req: NextRequest) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (authError) {
      console.error('[GIS Risk API] Authentication service unavailable:', authError);
      return NextResponse.json(
        { error: 'Authentication service unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { latitude, longitude, state, type, id } = body;

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Calculate risk factors based on location
    const riskFactors = getRegionalRiskFactors(latitude, longitude, state);
    const riskScore = calculateRiskScore(riskFactors);
    const riskZone = getRiskZone(riskScore);
    const hazardTypes = getHazardTypes(riskFactors);

    // Determine flood zone (simplified - in production use FEMA API)
    let floodZone = 'X'; // Minimal flood hazard
    if (riskFactors.floodRisk > 60) floodZone = 'AE'; // High risk
    else if (riskFactors.floodRisk > 40) floodZone = 'X500'; // Moderate risk

    const assessment = {
      latitude,
      longitude,
      riskScore,
      riskZone,
      floodZone,
      hazardTypes,
      riskFactors,
      recommendations: generateRecommendations(riskFactors, riskScore),
      assessmentDate: new Date().toISOString(),
    };

    // If type and id provided, update the record
    if (type && id) {
      const updateData = {
        latitude,
        longitude,
        riskZone,
        floodZone,
        hazardTypes: hazardTypes.join(','),
        riskScore,
        lastRiskAssessment: new Date(),
      };

      if (type === 'property') {
        await prisma.property.update({
          where: { id },
          data: updateData,
        });
      } else if (type === 'project') {
        await prisma.project.update({
          where: { id },
          data: updateData,
        });
      }
    }

    return NextResponse.json(assessment);
  } catch (error) {
    console.error('Risk assessment error:', error);
    return NextResponse.json(
      { error: 'Failed to perform risk assessment' },
      { status: 500 }
    );
  }
}

function generateRecommendations(
  factors: RiskFactors,
  score: number
): string[] {
  const recommendations: string[] = [];

  if (factors.floodRisk > 50) {
    recommendations.push(
      'Consider flood insurance and elevate critical infrastructure above base flood elevation.'
    );
  }
  if (factors.earthquakeRisk > 50) {
    recommendations.push(
      'Implement seismic-resistant design standards and anchor heavy equipment.'
    );
  }
  if (factors.wildfireRisk > 50) {
    recommendations.push(
      'Create defensible space around structures and use fire-resistant building materials.'
    );
  }
  if (factors.hurricaneRisk > 50) {
    recommendations.push(
      'Install impact-resistant windows and reinforce roof connections.'
    );
  }
  if (factors.tornadoRisk > 50) {
    recommendations.push(
      'Include a safe room in the building design and secure outdoor equipment.'
    );
  }

  if (score > 75) {
    recommendations.push(
      'High-risk location: Consider comprehensive catastrophe insurance coverage.'
    );
  } else if (score > 50) {
    recommendations.push(
      'Moderate-risk location: Regular risk assessments recommended every 6 months.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'Low-risk location: Standard safety measures are sufficient.'
    );
  }

  return recommendations;
}

// GET /api/gis/risk-assessment - Get risk assessment summary
export async function GET(req: NextRequest) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (authError) {
      console.error('[GIS Risk API] Authentication service unavailable:', authError);
      return NextResponse.json(
        { error: 'Authentication service unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all properties and projects with risk data
    const [properties, projects] = await Promise.all([
      prisma.property.findMany({
        where: { riskScore: { not: null } },
        select: {
          id: true,
          name: true,
          riskZone: true,
          riskScore: true,
          hazardTypes: true,
          lastRiskAssessment: true,
        },
      }),
      prisma.project.findMany({
        where: { riskScore: { not: null } },
        select: {
          id: true,
          name: true,
          riskZone: true,
          riskScore: true,
          hazardTypes: true,
          lastRiskAssessment: true,
        },
      }),
    ]);

    const allItems = [
      ...properties.map((p: typeof properties[number]) => ({ ...p, type: 'property' as const })),
      ...projects.map((p: typeof projects[number]) => ({ ...p, type: 'project' as const })),
    ];

    const summary = {
      totalAssessed: allItems.length,
      byRiskZone: {
        Severe: allItems.filter((i) => i.riskZone === 'Severe').length,
        High: allItems.filter((i) => i.riskZone === 'High').length,
        Moderate: allItems.filter((i) => i.riskZone === 'Moderate').length,
        Low: allItems.filter((i) => i.riskZone === 'Low').length,
      },
      averageRiskScore:
        allItems.length > 0
          ? Math.round(
              allItems.reduce((sum, i) => sum + (i.riskScore || 0), 0) /
                allItems.length
            )
          : 0,
      recentAssessments: allItems
        .sort(
          (a, b) =>
            new Date(b.lastRiskAssessment || 0).getTime() -
            new Date(a.lastRiskAssessment || 0).getTime()
        )
        .slice(0, 5),
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Risk summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch risk summary' },
      { status: 500 }
    );
  }
}
