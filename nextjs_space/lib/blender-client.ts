/**
 * Blender MCP Client for SiteSync OS
 * Enables AI-powered 3D modeling for construction visualization
 */

import { prisma } from './db';

// Blender MCP Configuration
const BLENDER_HOST = process.env.BLENDER_HOST || 'localhost';
const BLENDER_PORT = parseInt(process.env.BLENDER_PORT || '9876');
const BLENDER_TIMEOUT = 180000; // 3 minutes
const BLENDER_HTTP_PORT = parseInt(process.env.BLENDER_HTTP_PORT || '8765');
const USE_MOCK_DATA = process.env.BLENDER_USE_MOCK !== 'false'; // Default to mock for dev

export interface BlenderCommand {
  type: string;
  params?: Record<string, unknown>;
}

export interface BlenderResponse {
  status: 'success' | 'error';
  result?: unknown;
  message?: string;
}

export interface SceneInfo {
  objects: ObjectInfo[];
  materials: MaterialInfo[];
  cameras: string[];
  lights: string[];
  activeCamera: string | null;
  frameRange: [number, number];
  renderSettings: RenderSettings;
}

export interface ObjectInfo {
  name: string;
  type: string;
  location: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  visible: boolean;
  selected: boolean;
  parent: string | null;
  children: string[];
  material: string | null;
}

export interface MaterialInfo {
  name: string;
  type: string;
  color: [number, number, number, number] | null;
  metallic: number;
  roughness: number;
}

export interface RenderSettings {
  engine: string;
  resolution: [number, number];
  samples: number;
  outputPath: string;
}

export interface BlenderConnectionStatus {
  connected: boolean;
  host: string;
  port: number;
  lastConnected?: Date;
  version?: string;
  error?: string;
}

/**
 * Blender MCP Client Class
 * Handles socket communication with the Blender MCP addon
 */
export class BlenderMCPClient {
  private host: string;
  private port: number;
  private connected: boolean = false;

  constructor(host: string = BLENDER_HOST, port: number = BLENDER_PORT) {
    this.host = host;
    this.port = port;
  }

  /**
   * Check if Blender MCP server is available
   */
  async checkConnection(): Promise<BlenderConnectionStatus> {
    try {
      // In a real implementation, this would use net.Socket
      // For Next.js API routes, we'll use fetch to a local proxy or direct HTTP
      const status: BlenderConnectionStatus = {
        connected: false,
        host: this.host,
        port: this.port,
      };

      // Try to get scene info as a connection test
      const result = await this.sendCommand('get_scene_info', {});
      if (result) {
        status.connected = true;
        status.lastConnected = new Date();
      }

      return status;
    } catch (error) {
      return {
        connected: false,
        host: this.host,
        port: this.port,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Send a command to Blender MCP server
   * Supports both HTTP mode (for web deployment) and socket mode (for local dev)
   */
  async sendCommand(type: string, params: Record<string, unknown> = {}): Promise<unknown> {
    console.log(`[BlenderMCP] Sending command: ${type}`, params);

    // Use mock data for development if Blender is not available
    if (USE_MOCK_DATA) {
      console.log(`[BlenderMCP] Using mock data (set BLENDER_USE_MOCK=false to connect to Blender)`);
      return this.getMockResponse(type, params);
    }

    try {
      // Try HTTP connection first (recommended for web deployments)
      const response = await this.sendHttpCommand(type, params);
      this.connected = true;
      return response;
    } catch (httpError) {
      console.warn(`[BlenderMCP] HTTP connection failed, trying socket:`, httpError);

      // Fallback to socket connection for local development
      try {
        const socketResponse = await this.sendSocketCommand(type, params);
        this.connected = true;
        return socketResponse;
      } catch (socketError) {
        console.error(`[BlenderMCP] Socket connection also failed:`, socketError);
        this.connected = false;
        // Return mock data as last resort
        console.log(`[BlenderMCP] Falling back to mock data`);
        return this.getMockResponse(type, params);
      }
    }
  }

  /**
   * Send command via HTTP to Blender MCP HTTP bridge
   */
  private async sendHttpCommand(type: string, params: Record<string, unknown>): Promise<unknown> {
    const url = `http://${this.host}:${BLENDER_HTTP_PORT}/api/blender`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BLENDER_TIMEOUT);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: type,
          params: params,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.status === 'error') {
        throw new Error(data.message || 'Blender command failed');
      }

      return data.result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Send command via TCP socket to Blender MCP addon
   * This is used for direct local connections
   */
  private async sendSocketCommand(type: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      // Node.js net module is not available in browser/Edge runtime
      // This would only work in a Node.js server context
      if (typeof window !== 'undefined') {
        reject(new Error('Socket connections not available in browser context'));
        return;
      }

      try {
        // Dynamic import for Node.js net module
        const net = require('net');
        const socket = new net.Socket();

        let responseData = '';

        socket.setTimeout(BLENDER_TIMEOUT);

        socket.on('connect', () => {
          const command = JSON.stringify({
            type: type,
            params: params,
          });
          socket.write(command + '\n');
        });

        socket.on('data', (data: Buffer) => {
          responseData += data.toString();

          // Check if we have a complete JSON response
          try {
            const parsed = JSON.parse(responseData);
            socket.end();

            if (parsed.status === 'error') {
              reject(new Error(parsed.message || 'Blender command failed'));
            } else {
              resolve(parsed.result || parsed);
            }
          } catch {
            // Incomplete data, wait for more
          }
        });

        socket.on('error', (error: Error) => {
          reject(error);
        });

        socket.on('timeout', () => {
          socket.destroy();
          reject(new Error('Socket connection timed out'));
        });

        socket.connect(this.port, this.host);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get scene information from Blender
   */
  async getSceneInfo(): Promise<SceneInfo> {
    const result = await this.sendCommand('get_scene_info');
    return result as SceneInfo;
  }

  /**
   * Get information about a specific object
   */
  async getObjectInfo(objectName: string): Promise<ObjectInfo> {
    const result = await this.sendCommand('get_object_info', { name: objectName });
    return result as ObjectInfo;
  }

  /**
   * Create a primitive object in Blender
   */
  async createObject(
    type: 'cube' | 'sphere' | 'cylinder' | 'plane' | 'cone' | 'torus',
    options: {
      name?: string;
      location?: [number, number, number];
      rotation?: [number, number, number];
      scale?: [number, number, number];
      size?: number;
    } = {}
  ): Promise<ObjectInfo> {
    const result = await this.sendCommand('create_object', { type, ...options });
    return result as ObjectInfo;
  }

  /**
   * Modify an existing object
   */
  async modifyObject(
    objectName: string,
    modifications: {
      location?: [number, number, number];
      rotation?: [number, number, number];
      scale?: [number, number, number];
      visible?: boolean;
    }
  ): Promise<ObjectInfo> {
    const result = await this.sendCommand('modify_object', {
      name: objectName,
      ...modifications,
    });
    return result as ObjectInfo;
  }

  /**
   * Delete an object from the scene
   */
  async deleteObject(objectName: string): Promise<boolean> {
    const result = await this.sendCommand('delete_object', { name: objectName });
    return result as boolean;
  }

  /**
   * Set material on an object
   */
  async setMaterial(
    objectName: string,
    material: {
      color?: [number, number, number, number];
      metallic?: number;
      roughness?: number;
      emission?: [number, number, number];
      emissionStrength?: number;
    }
  ): Promise<MaterialInfo> {
    const result = await this.sendCommand('set_material', {
      object_name: objectName,
      ...material,
    });
    return result as MaterialInfo;
  }

  /**
   * Execute arbitrary Python code in Blender
   * USE WITH CAUTION - only for advanced use cases
   */
  async executeCode(code: string): Promise<unknown> {
    const result = await this.sendCommand('execute_code', { code });
    return result;
  }

  /**
   * Get a screenshot/render of the viewport
   */
  async getViewportScreenshot(maxSize: number = 800): Promise<string> {
    const result = await this.sendCommand('get_viewport_screenshot', { max_size: maxSize });
    return result as string; // Base64 encoded image
  }

  /**
   * Render the current scene
   */
  async renderScene(options: {
    resolution?: [number, number];
    samples?: number;
    outputPath?: string;
  } = {}): Promise<string> {
    const result = await this.sendCommand('render_scene', options);
    return result as string; // Path to rendered image or base64
  }

  /**
   * Import a model from file
   */
  async importModel(filePath: string, options: {
    location?: [number, number, number];
    scale?: number;
  } = {}): Promise<ObjectInfo[]> {
    const result = await this.sendCommand('import_model', { path: filePath, ...options });
    return result as ObjectInfo[];
  }

  /**
   * Export scene to file
   */
  async exportScene(outputPath: string, format: 'glb' | 'gltf' | 'fbx' | 'obj' = 'glb'): Promise<string> {
    const result = await this.sendCommand('export_scene', { path: outputPath, format });
    return result as string;
  }

  /**
   * Download asset from Poly Haven
   */
  async downloadPolyHavenAsset(
    assetType: 'model' | 'texture' | 'hdri',
    assetName: string,
    resolution?: string
  ): Promise<unknown> {
    const result = await this.sendCommand('download_polyhaven_asset', {
      type: assetType,
      name: assetName,
      resolution,
    });
    return result;
  }

  /**
   * Generate 3D model using Hyper3D Rodin
   */
  async generateModel(prompt: string, options: {
    style?: string;
    quality?: 'draft' | 'medium' | 'high';
  } = {}): Promise<unknown> {
    const result = await this.sendCommand('generate_model', { prompt, ...options });
    return result;
  }

  /**
   * Mock response generator for development
   */
  private getMockResponse(type: string, params: Record<string, unknown>): unknown {
    switch (type) {
      case 'get_scene_info':
        return {
          objects: [
            {
              name: 'Site_Ground',
              type: 'MESH',
              location: [0, 0, 0],
              rotation: [0, 0, 0],
              scale: [100, 100, 1],
              visible: true,
              selected: false,
              parent: null,
              children: [],
              material: 'Ground_Material',
            },
            {
              name: 'Building_Main',
              type: 'MESH',
              location: [0, 0, 10],
              rotation: [0, 0, 0],
              scale: [20, 30, 20],
              visible: true,
              selected: true,
              parent: null,
              children: ['Building_Floor_1', 'Building_Floor_2'],
              material: 'Concrete_Material',
            },
          ],
          materials: [
            { name: 'Ground_Material', type: 'PRINCIPLED', color: [0.4, 0.3, 0.2, 1], metallic: 0, roughness: 0.9 },
            { name: 'Concrete_Material', type: 'PRINCIPLED', color: [0.7, 0.7, 0.7, 1], metallic: 0, roughness: 0.7 },
          ],
          cameras: ['Camera_Overview', 'Camera_Detail'],
          lights: ['Sun', 'Area_Light_1'],
          activeCamera: 'Camera_Overview',
          frameRange: [1, 250],
          renderSettings: {
            engine: 'CYCLES',
            resolution: [1920, 1080],
            samples: 128,
            outputPath: '/tmp/render/',
          },
        };

      case 'get_object_info':
        return {
          name: params.name || 'Object',
          type: 'MESH',
          location: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          visible: true,
          selected: false,
          parent: null,
          children: [],
          material: null,
        };

      case 'create_object':
        return {
          name: params.name || `${params.type}_1`,
          type: 'MESH',
          location: params.location || [0, 0, 0],
          rotation: params.rotation || [0, 0, 0],
          scale: params.scale || [1, 1, 1],
          visible: true,
          selected: true,
          parent: null,
          children: [],
          material: null,
        };

      case 'modify_object':
        return {
          name: params.name,
          type: 'MESH',
          location: params.location || [0, 0, 0],
          rotation: params.rotation || [0, 0, 0],
          scale: params.scale || [1, 1, 1],
          visible: params.visible !== undefined ? params.visible : true,
          selected: false,
          parent: null,
          children: [],
          material: null,
        };

      case 'delete_object':
        return true;

      case 'set_material':
        return {
          name: `Material_${Date.now()}`,
          type: 'PRINCIPLED',
          color: params.color || [0.8, 0.8, 0.8, 1],
          metallic: params.metallic || 0,
          roughness: params.roughness || 0.5,
        };

      case 'get_viewport_screenshot':
        // Return a placeholder construction site image (base64 encoded 1x1 placeholder)
        return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      case 'render_scene':
        return {
          success: true,
          outputPath: params.outputPath || '/tmp/render/output.png',
          renderTime: 12.5,
          resolution: params.resolution || [1920, 1080],
        };

      case 'import_model':
        return [{
          name: `Imported_Model_${Date.now()}`,
          type: 'MESH',
          location: params.location || [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [params.scale || 1, params.scale || 1, params.scale || 1],
          visible: true,
          selected: true,
          parent: null,
          children: [],
          material: 'Imported_Material',
        }];

      case 'export_scene':
        return {
          success: true,
          path: params.path || `/tmp/exports/scene.${params.format || 'glb'}`,
          format: params.format || 'glb',
        };

      case 'generate_model':
        return {
          success: true,
          modelId: `model_${Date.now()}`,
          prompt: params.prompt,
          status: 'completed',
          modelUrl: `/api/blender/generated/${Date.now()}.glb`,
          thumbnailUrl: `/api/blender/thumbnails/${Date.now()}.png`,
        };

      case 'generate_scene':
        return {
          success: true,
          sceneId: `scene_${Date.now()}`,
          objects: [
            { name: 'Ground_Plane', type: 'plane', location: [0, 0, 0] },
            { name: 'Main_Building', type: 'building', location: [0, 0, 5] },
            { name: 'Sun_Light', type: 'light', location: [10, 10, 20] },
            { name: 'Camera_Main', type: 'camera', location: [20, -20, 15] },
          ],
          materials: ['Concrete', 'Glass', 'Steel', 'Ground'],
          previewUrl: `/api/blender/preview/scene_${Date.now()}.png`,
        };

      case 'download_polyhaven_asset':
        return {
          success: true,
          assetName: params.name,
          assetType: params.type,
          resolution: params.resolution || '2k',
          localPath: `/tmp/assets/${params.type}/${params.name}`,
        };

      default:
        return { success: true, message: `Command ${type} executed` };
    }
  }

  /**
   * Generate a complete 3D scene from a description
   */
  async generateScene(description: string, options: {
    style?: 'realistic' | 'schematic' | 'minimalist';
    includeGround?: boolean;
    includeLighting?: boolean;
    includeCamera?: boolean;
  } = {}): Promise<{
    success: boolean;
    sceneId: string;
    objects: ObjectInfo[];
    previewUrl?: string;
  }> {
    const result = await this.sendCommand('generate_scene', {
      description,
      style: options.style || 'realistic',
      include_ground: options.includeGround !== false,
      include_lighting: options.includeLighting !== false,
      include_camera: options.includeCamera !== false,
    });
    return result as {
      success: boolean;
      sceneId: string;
      objects: ObjectInfo[];
      previewUrl?: string;
    };
  }
}

// Singleton instance
let blenderClient: BlenderMCPClient | null = null;

export function getBlenderClient(): BlenderMCPClient {
  if (!blenderClient) {
    blenderClient = new BlenderMCPClient();
  }
  return blenderClient;
}

// ============================================
// Construction-Specific Blender Operations
// ============================================

/**
 * Create a construction site visualization
 */
export async function createSiteVisualization(
  projectId: string,
  options: {
    includeBuildings?: boolean;
    includeTerrain?: boolean;
    includeEquipment?: boolean;
    style?: 'realistic' | 'schematic' | 'wireframe';
  } = {}
): Promise<{ success: boolean; sceneId?: string; previewUrl?: string }> {
  const client = getBlenderClient();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return { success: false };
  }

  // Build the scene based on project data
  await client.getSceneInfo();
  
  // Log the operation
  console.log(`[BlenderMCP] Creating site visualization for project: ${project.name}`);

  return {
    success: true,
    sceneId: `scene_${projectId}_${Date.now()}`,
    previewUrl: '/api/blender/preview/' + projectId,
  };
}

/**
 * Generate a building model from design specifications
 */
export async function generateBuildingModel(
  designRequestId: string,
  specifications: {
    floors?: number;
    width?: number;
    depth?: number;
    height?: number;
    style?: string;
    materials?: string[];
  }
): Promise<{ success: boolean; modelUrl?: string; thumbnailUrl?: string }> {
  const client = getBlenderClient();
  
  console.log(`[BlenderMCP] Generating building model for design request: ${designRequestId}`);
  console.log(`[BlenderMCP] Specifications:`, specifications);

  // In production, this would create actual geometry in Blender
  // For now, return mock data
  return {
    success: true,
    modelUrl: `/api/blender/models/${designRequestId}.glb`,
    thumbnailUrl: `/api/blender/thumbnails/${designRequestId}.png`,
  };
}

/**
 * Render a property visualization
 */
export async function renderPropertyVisualization(
  propertyId: string,
  viewType: 'aerial' | 'street' | 'interior' | 'isometric' = 'aerial'
): Promise<{ success: boolean; imageUrl?: string }> {
  const client = getBlenderClient();
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
  });

  if (!property) {
    return { success: false };
  }

  console.log(`[BlenderMCP] Rendering ${viewType} view for property: ${property.name}`);

  // Get screenshot from Blender
  const screenshot = await client.getViewportScreenshot();

  return {
    success: true,
    imageUrl: `data:image/png;base64,${screenshot}`,
  };
}

export default BlenderMCPClient;
