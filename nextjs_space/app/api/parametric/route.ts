import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import {
  generateParametricModel,
  generateBlenderScript,
  generateVisualizationPrompt,
  createPipelineStatus,
  MATERIAL_LIBRARY,
  LOD_DEFINITIONS,
  DEFAULT_CONSTRAINTS,
  getMaterialById,
  getMaterialsByCategory,
  type BuildingConstraints,
  type LODLevel,
} from '@/lib/parametric-engine';

// GET: Retrieve material library, LOD definitions, or pipeline status
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'materials': {
        const category = searchParams.get('category');
        const materials = category
          ? getMaterialsByCategory(category as any)
          : MATERIAL_LIBRARY;
        return NextResponse.json({ materials });
      }

      case 'material': {
        const id = searchParams.get('id');
        if (!id) {
          return NextResponse.json({ error: 'Material id required' }, { status: 400 });
        }
        const material = getMaterialById(id);
        if (!material) {
          return NextResponse.json({ error: 'Material not found' }, { status: 404 });
        }
        return NextResponse.json({ material });
      }

      case 'lod-definitions': {
        return NextResponse.json({ definitions: LOD_DEFINITIONS });
      }

      case 'presets': {
        return NextResponse.json({ presets: DEFAULT_CONSTRAINTS });
      }

      case 'pipeline-status': {
        return NextResponse.json(createPipelineStatus());
      }

      default: {
        return NextResponse.json({
          parametricEngine: {
            version: '1.0.0',
            availableActions: [
              'GET ?action=materials - List material library',
              'GET ?action=material&id=X - Get material by id',
              'GET ?action=lod-definitions - LOD level definitions',
              'GET ?action=presets - Default building constraint presets',
              'GET ?action=pipeline-status - Ecosystem pipeline status',
              'POST action=generate - Generate parametric model',
              'POST action=blender-script - Generate Blender Python script',
              'POST action=visualization-prompt - Generate AI rendering prompt',
            ],
          },
        });
      }
    }
  } catch (error) {
    console.error('[Parametric API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Generate parametric models, scripts, and prompts
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, name, constraints, targetLOD } = body;

    switch (action) {
      case 'generate': {
        if (!constraints) {
          return NextResponse.json({ error: 'Building constraints required' }, { status: 400 });
        }

        const buildingConstraints: BuildingConstraints = {
          projectType: constraints.projectType || 'custom',
          totalFloors: constraints.totalFloors || 5,
          floorToFloorHeight: constraints.floorToFloorHeight || 3.5,
          footprintWidth: constraints.footprintWidth || 30,
          footprintDepth: constraints.footprintDepth || 20,
          windowToWallRatio: constraints.windowToWallRatio || 0.35,
          solarCoverage: constraints.solarCoverage || 0.3,
          materials: constraints.materials || {
            facade: 'concrete-precast',
            glazing: 'glass-curtainwall',
            roof: 'roof-tpo',
            structure: 'concrete-structural',
          },
          sustainabilityTarget: constraints.sustainabilityTarget,
          accessibilityRequired: constraints.accessibilityRequired,
          unitMix: constraints.unitMix,
        };

        const model = generateParametricModel(
          name || 'Parametric Building',
          buildingConstraints,
          (targetLOD as LODLevel) || 300
        );

        const blenderScript = generateBlenderScript(model);
        const visualizationPrompt = generateVisualizationPrompt(model);

        console.log(
          `[Parametric API] Generated model "${model.name}" with ${model.elements.length} elements, ${model.floorPlans.length} floor plans`
        );

        return NextResponse.json({
          success: true,
          model,
          blenderScript,
          visualizationPrompt,
          summary: {
            elementCount: model.elements.length,
            floorPlanCount: model.floorPlans.length,
            totalArea: model.totalArea,
            envelopeArea: model.envelopeArea,
            glazingArea: model.glazingArea,
            solarArea: model.solarArea,
            estimatedEnergyProduction: model.estimatedEnergyProduction,
          },
        });
      }

      case 'blender-script': {
        if (!constraints) {
          return NextResponse.json({ error: 'Building constraints required' }, { status: 400 });
        }

        const model = generateParametricModel(
          name || 'Building',
          constraints,
          (targetLOD as LODLevel) || 300
        );
        const script = generateBlenderScript(model);

        return NextResponse.json({ success: true, script });
      }

      case 'visualization-prompt': {
        if (!constraints) {
          return NextResponse.json({ error: 'Building constraints required' }, { status: 400 });
        }

        const model = generateParametricModel(
          name || 'Building',
          constraints,
          (targetLOD as LODLevel) || 200
        );
        const prompt = generateVisualizationPrompt(model);

        return NextResponse.json({ success: true, prompt });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Parametric API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process parametric request' },
      { status: 500 }
    );
  }
}
