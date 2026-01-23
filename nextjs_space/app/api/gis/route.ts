import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// GET /api/gis - Fetch all geo-located properties and projects
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all'; // 'properties', 'projects', or 'all'
    const includeRisk = searchParams.get('includeRisk') === 'true';

    const results: {
      properties: any[];
      projects: any[];
      summary: {
        totalLocations: number;
        highRiskCount: number;
        moderateRiskCount: number;
        lowRiskCount: number;
      };
    } = {
      properties: [],
      projects: [],
      summary: {
        totalLocations: 0,
        highRiskCount: 0,
        moderateRiskCount: 0,
        lowRiskCount: 0,
      },
    };

    // Fetch properties with geo data
    if (type === 'all' || type === 'properties') {
      const properties = await prisma.property.findMany({
        select: {
          id: true,
          name: true,
          street: true,
          city: true,
          state: true,
          zip: true,
          latitude: true,
          longitude: true,
          riskZone: true,
          floodZone: true,
          hazardTypes: true,
          riskScore: true,
          lastRiskAssessment: true,
          assetType: true,
          developmentStage: true,
          totalProjectCost: true,
          statusIndicator: true,
        },
      });

      results.properties = properties.map((p: typeof properties[number]) => ({
        ...p,
        type: 'property',
        address: `${p.street}, ${p.city}, ${p.state} ${p.zip}`,
        coordinates: p.latitude && p.longitude ? [p.longitude, p.latitude] : null,
      }));
    }

    // Fetch projects with geo data
    if (type === 'all' || type === 'projects') {
      const projects = await prisma.project.findMany({
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          latitude: true,
          longitude: true,
          riskZone: true,
          floodZone: true,
          hazardTypes: true,
          riskScore: true,
          lastRiskAssessment: true,
          status: true,
          phase: true,
          budget: true,
          startDate: true,
          estimatedCompletion: true,
        },
      });

      results.projects = projects.map((p: typeof projects[number]) => ({
        ...p,
        type: 'project',
        fullAddress: `${p.address}${p.city ? ', ' + p.city : ''}${p.state ? ', ' + p.state : ''} ${p.zipCode || ''}`.trim(),
        coordinates: p.latitude && p.longitude ? [p.longitude, p.latitude] : null,
      }));
    }

    // Calculate risk summary
    const allItems = [...results.properties, ...results.projects];
    results.summary.totalLocations = allItems.filter((i) => i.coordinates).length;
    results.summary.highRiskCount = allItems.filter(
      (i) => i.riskZone === 'High' || i.riskZone === 'Severe'
    ).length;
    results.summary.moderateRiskCount = allItems.filter(
      (i) => i.riskZone === 'Moderate'
    ).length;
    results.summary.lowRiskCount = allItems.filter(
      (i) => i.riskZone === 'Low' || !i.riskZone
    ).length;

    return NextResponse.json(results);
  } catch (error) {
    console.error('GIS API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GIS data' },
      { status: 500 }
    );
  }
}

// POST /api/gis - Update coordinates for a property or project
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, id, latitude, longitude, riskZone, floodZone, hazardTypes, riskScore } = body;

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Type and ID are required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (riskZone !== undefined) updateData.riskZone = riskZone;
    if (floodZone !== undefined) updateData.floodZone = floodZone;
    if (hazardTypes !== undefined) updateData.hazardTypes = hazardTypes;
    if (riskScore !== undefined) updateData.riskScore = riskScore;
    if (Object.keys(updateData).length > 0) {
      updateData.lastRiskAssessment = new Date();
    }

    let result;
    if (type === 'property') {
      result = await prisma.property.update({
        where: { id },
        data: updateData,
      });
    } else if (type === 'project') {
      result = await prisma.project.update({
        where: { id },
        data: updateData,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "property" or "project"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('GIS update error:', error);
    return NextResponse.json(
      { error: 'Failed to update GIS data' },
      { status: 500 }
    );
  }
}
