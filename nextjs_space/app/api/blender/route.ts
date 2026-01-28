import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import {
  getBlenderClient,
  createSiteVisualization,
  generateBuildingModel,
  renderPropertyVisualization,
  applyParametricDetail,
  importAndEnhanceMassing,
} from '@/lib/blender-client';

interface SessionUser {
  id: string;
  email: string;
  role: string;
}

// GET: Check connection status or get scene info
export async function GET(request: Request) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (authError) {
      console.error('[BlenderAPI] Authentication service unavailable:', authError);
      return NextResponse.json(
        { error: 'Authentication service unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const client = getBlenderClient();

    switch (action) {
      case 'status': {
        const status = await client.checkConnection();
        return NextResponse.json(status);
      }

      case 'scene': {
        const scene = await client.getSceneInfo();
        return NextResponse.json({ scene });
      }

      case 'object': {
        const objectName = searchParams.get('name');
        if (!objectName) {
          return NextResponse.json({ error: 'Object name required' }, { status: 400 });
        }
        const object = await client.getObjectInfo(objectName);
        return NextResponse.json({ object });
      }

      case 'screenshot': {
        const maxSize = parseInt(searchParams.get('maxSize') || '800');
        const screenshot = await client.getViewportScreenshot(maxSize);
        return NextResponse.json({ screenshot: `data:image/png;base64,${screenshot}` });
      }

      default: {
        // Return general info
        const status = await client.checkConnection();
        return NextResponse.json({
          blenderMCP: {
            ...status,
            features: [
              'Scene manipulation',
              'Object creation & modification',
              'Material control',
              'Viewport screenshots',
              'Model import/export',
              'Poly Haven assets',
              'AI model generation',
            ],
          },
        });
      }
    }
  } catch (error) {
    console.error('[BlenderAPI] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to communicate with Blender';
    const isConnectionError = message.includes('connect') || message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT');
    return NextResponse.json(
      { error: isConnectionError ? 'Blender service is unreachable. Ensure the Blender MCP addon is running.' : message },
      { status: isConnectionError ? 503 : 500 }
    );
  }
}

// POST: Execute Blender commands
export async function POST(request: Request) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (authError) {
      console.error('[BlenderAPI] Authentication service unavailable:', authError);
      return NextResponse.json(
        { error: 'Authentication service unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const body = await request.json();
    const { action, params } = body;
    const client = getBlenderClient();

    switch (action) {
      // Object Operations
      case 'create_object': {
        const { type, name, location, rotation, scale, size } = params;
        const result = await client.createObject(type, { name, location, rotation, scale, size });
        return NextResponse.json({ success: true, object: result });
      }

      case 'modify_object': {
        const { name, ...modifications } = params;
        const result = await client.modifyObject(name, modifications);
        return NextResponse.json({ success: true, object: result });
      }

      case 'delete_object': {
        const { name } = params;
        const result = await client.deleteObject(name);
        return NextResponse.json({ success: true, deleted: result });
      }

      // Material Operations
      case 'set_material': {
        const { objectName, ...materialParams } = params;
        const result = await client.setMaterial(objectName, materialParams);
        return NextResponse.json({ success: true, material: result });
      }

      // Rendering
      case 'render': {
        const { resolution, samples, outputPath } = params;
        const result = await client.renderScene({ resolution, samples, outputPath });
        return NextResponse.json({ success: true, render: result });
      }

      // Import/Export
      case 'import_model': {
        const { filePath, location, scale } = params;
        const result = await client.importModel(filePath, { location, scale });
        return NextResponse.json({ success: true, objects: result });
      }

      case 'export_scene': {
        const { outputPath, format } = params;
        const result = await client.exportScene(outputPath, format);
        return NextResponse.json({ success: true, path: result });
      }

      // Poly Haven Assets
      case 'download_asset': {
        const { assetType, assetName, resolution } = params;
        const result = await client.downloadPolyHavenAsset(assetType, assetName, resolution);
        return NextResponse.json({ success: true, asset: result });
      }

      // AI Model Generation
      case 'generate_model': {
        const { prompt, style, quality } = params;
        const result = await client.generateModel(prompt, { style, quality });
        return NextResponse.json({ success: true, model: result });
      }

      // Construction-Specific Operations
      case 'create_site_visualization': {
        const { projectId, options } = params;
        const result = await createSiteVisualization(projectId, options);
        return NextResponse.json(result);
      }

      case 'generate_building_model': {
        const { designRequestId, specifications } = params;
        const result = await generateBuildingModel(designRequestId, specifications);
        return NextResponse.json(result);
      }

      case 'render_property': {
        const { propertyId, viewType } = params;
        const result = await renderPropertyVisualization(propertyId, viewType);
        return NextResponse.json(result);
      }

      // Parametric Detail Operations
      case 'apply_parametric_detail': {
        const { designRequestId, blenderScript, exportFormat, renderPreview, resolution } = params;
        const result = await applyParametricDetail(designRequestId, {
          blenderScript,
          exportFormat,
          renderPreview,
          resolution,
        });
        return NextResponse.json(result);
      }

      case 'import_enhance_massing': {
        const { glbFilePath, materialAssignments } = params;
        const result = await importAndEnhanceMassing(glbFilePath, materialAssignments);
        return NextResponse.json(result);
      }

      // Execute arbitrary code (admin only)
      case 'execute_code': {
        if (user.role !== 'SuperAdmin' && user.role !== 'Admin') {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }
        const { code } = params;
        const result = await client.executeCode(code);
        return NextResponse.json({ success: true, result });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[BlenderAPI] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to execute Blender command';
    const isConnectionError = message.includes('connect') || message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT');
    return NextResponse.json(
      { error: isConnectionError ? 'Blender service is unreachable. Ensure the Blender MCP addon is running.' : message },
      { status: isConnectionError ? 503 : 500 }
    );
  }
}
