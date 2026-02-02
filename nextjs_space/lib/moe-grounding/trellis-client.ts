/**
 * TRELLIS 3D Asset Generation Client for SiteSync OS
 *
 * Interfaces with the TRELLIS model (https://github.com/Mrmuhammad300/TRELLIS)
 * to generate 3D assets (meshes, Gaussian splats, radiance fields) from
 * images or text prompts. These raw assets are then routed through the
 * MoE Grounding Engine for construction-domain validation.
 *
 * TRELLIS Architecture:
 *   Image/Text -> DINOv2 Encoder -> Sparse Structure Flow -> SLAT Flow
 *   -> VAE Decoders -> Mesh | 3D Gaussians | Radiance Fields
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TRELLIS_HOST = process.env.TRELLIS_HOST || 'localhost';
const TRELLIS_PORT = parseInt(process.env.TRELLIS_PORT || '7860');
const TRELLIS_BASE_URL = process.env.TRELLIS_URL || `http://${TRELLIS_HOST}:${TRELLIS_PORT}`;
const TRELLIS_TIMEOUT = 300000; // 5 minutes for 3D generation

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrellisOutputFormat = 'mesh' | 'gaussian' | 'radiance_field';

export type TrellisModelVariant =
  | 'TRELLIS-image-large'   // 1.2B params, image-to-3D
  | 'TRELLIS-text-base'     // 342M params, text-to-3D
  | 'TRELLIS-text-large'    // 1.1B params, text-to-3D
  | 'TRELLIS-text-xlarge';  // 2.0B params, text-to-3D

export interface TrellisGenerationRequest {
  /** The model variant to use */
  model: TrellisModelVariant;
  /** For image-to-3D: base64 encoded image(s) */
  images?: string[];
  /** For text-to-3D: text prompt describing the 3D asset */
  prompt?: string;
  /** Desired output formats */
  outputFormats: TrellisOutputFormat[];
  /** Sampling parameters for the sparse structure flow */
  sparseStructureSampling?: {
    steps?: number;        // default 12
    cfgStrength?: number;  // classifier-free guidance, default 7.5
  };
  /** Sampling parameters for the SLAT flow */
  slatSampling?: {
    steps?: number;        // default 12
    cfgStrength?: number;  // default 7.5
  };
  /** Seed for reproducibility */
  seed?: number;
  /** Construction-specific metadata for grounding */
  constructionContext?: {
    assetType: ConstructionAssetType;
    projectType?: string;
    lodTarget?: number;
    materialHints?: string[];
  };
}

export type ConstructionAssetType =
  | 'building_exterior'
  | 'building_interior'
  | 'structural_element'
  | 'mep_component'
  | 'site_element'
  | 'furniture_fixture'
  | 'material_sample'
  | 'equipment'
  | 'landscape'
  | 'facade_detail';

export interface TrellisGenerationResult {
  id: string;
  status: 'success' | 'error' | 'processing';
  model: TrellisModelVariant;
  outputs: TrellisOutput[];
  metadata: {
    generationTimeMs: number;
    sparseVoxelCount?: number;
    slatDimensions?: [number, number, number];
    seed: number;
  };
  error?: string;
}

export interface TrellisOutput {
  format: TrellisOutputFormat;
  /** URL or base64 data for the generated asset */
  data: string;
  /** File size in bytes */
  sizeBytes: number;
  /** For meshes: vertex/face count */
  meshStats?: {
    vertexCount: number;
    faceCount: number;
    hasUVs: boolean;
    hasNormals: boolean;
    boundingBox: {
      min: [number, number, number];
      max: [number, number, number];
    };
  };
  /** For Gaussians: splat count */
  gaussianStats?: {
    splatCount: number;
    meanScale: number;
  };
  /** For radiance fields: resolution */
  radianceFieldStats?: {
    resolution: [number, number, number];
    featureChannels: number;
  };
}

export interface TrellisConnectionStatus {
  connected: boolean;
  url: string;
  modelLoaded?: TrellisModelVariant;
  gpuMemoryUsageMB?: number;
  availableModels?: TrellisModelVariant[];
  error?: string;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class TrellisClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = TRELLIS_BASE_URL, timeout: number = TRELLIS_TIMEOUT) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * Check connection to the TRELLIS server
   */
  async checkConnection(): Promise<TrellisConnectionStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${this.baseUrl}/api/status`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return {
          connected: true,
          url: this.baseUrl,
          modelLoaded: data.model_loaded,
          gpuMemoryUsageMB: data.gpu_memory_mb,
          availableModels: data.available_models,
        };
      }

      return {
        connected: false,
        url: this.baseUrl,
        error: `Server returned ${response.status}`,
      };
    } catch (error) {
      return {
        connected: false,
        url: this.baseUrl,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Generate a 3D asset from an image using TRELLIS image-to-3D pipeline
   */
  async generateFromImage(
    imageBase64: string,
    options: Omit<TrellisGenerationRequest, 'model' | 'images' | 'prompt'> & {
      model?: TrellisModelVariant;
    } = { outputFormats: ['mesh'] }
  ): Promise<TrellisGenerationResult> {
    return this.generate({
      model: options.model || 'TRELLIS-image-large',
      images: [imageBase64],
      outputFormats: options.outputFormats,
      sparseStructureSampling: options.sparseStructureSampling,
      slatSampling: options.slatSampling,
      seed: options.seed,
      constructionContext: options.constructionContext,
    });
  }

  /**
   * Generate a 3D asset from multiple images (multi-view conditioning)
   */
  async generateFromMultiImage(
    imagesBase64: string[],
    options: Omit<TrellisGenerationRequest, 'model' | 'images' | 'prompt'> & {
      model?: TrellisModelVariant;
    } = { outputFormats: ['mesh'] }
  ): Promise<TrellisGenerationResult> {
    return this.generate({
      model: options.model || 'TRELLIS-image-large',
      images: imagesBase64,
      outputFormats: options.outputFormats,
      sparseStructureSampling: options.sparseStructureSampling,
      slatSampling: options.slatSampling,
      seed: options.seed,
      constructionContext: options.constructionContext,
    });
  }

  /**
   * Generate a 3D asset from a text prompt using TRELLIS text-to-3D pipeline
   */
  async generateFromText(
    prompt: string,
    options: Omit<TrellisGenerationRequest, 'model' | 'images' | 'prompt'> & {
      model?: TrellisModelVariant;
    } = { outputFormats: ['mesh'] }
  ): Promise<TrellisGenerationResult> {
    return this.generate({
      model: options.model || 'TRELLIS-text-large',
      prompt,
      outputFormats: options.outputFormats,
      sparseStructureSampling: options.sparseStructureSampling,
      slatSampling: options.slatSampling,
      seed: options.seed,
      constructionContext: options.constructionContext,
    });
  }

  /**
   * Core generation method
   */
  private async generate(request: TrellisGenerationRequest): Promise<TrellisGenerationResult> {
    const startTime = Date.now();
    const seed = request.seed ?? Math.floor(Math.random() * 2147483647);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: request.model,
          images: request.images,
          prompt: request.prompt,
          output_formats: request.outputFormats,
          sparse_structure_sampling: request.sparseStructureSampling
            ? {
                steps: request.sparseStructureSampling.steps ?? 12,
                cfg_strength: request.sparseStructureSampling.cfgStrength ?? 7.5,
              }
            : undefined,
          slat_sampling: request.slatSampling
            ? {
                steps: request.slatSampling.steps ?? 12,
                cfg_strength: request.slatSampling.cfgStrength ?? 7.5,
              }
            : undefined,
          seed,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          id: `trellis-err-${Date.now()}`,
          status: 'error',
          model: request.model,
          outputs: [],
          metadata: { generationTimeMs: Date.now() - startTime, seed },
          error: `TRELLIS API error ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json();

      return {
        id: data.id || `trellis-${Date.now()}`,
        status: 'success',
        model: request.model,
        outputs: (data.outputs || []).map((output: Record<string, unknown>) => ({
          format: output.format as TrellisOutputFormat,
          data: output.data as string,
          sizeBytes: output.size_bytes as number,
          meshStats: output.mesh_stats
            ? {
                vertexCount: (output.mesh_stats as Record<string, unknown>).vertex_count as number,
                faceCount: (output.mesh_stats as Record<string, unknown>).face_count as number,
                hasUVs: (output.mesh_stats as Record<string, unknown>).has_uvs as boolean,
                hasNormals: (output.mesh_stats as Record<string, unknown>).has_normals as boolean,
                boundingBox: (output.mesh_stats as Record<string, unknown>).bounding_box as {
                  min: [number, number, number];
                  max: [number, number, number];
                },
              }
            : undefined,
          gaussianStats: output.gaussian_stats
            ? {
                splatCount: (output.gaussian_stats as Record<string, unknown>).splat_count as number,
                meanScale: (output.gaussian_stats as Record<string, unknown>).mean_scale as number,
              }
            : undefined,
          radianceFieldStats: output.radiance_field_stats
            ? {
                resolution: (output.radiance_field_stats as Record<string, unknown>).resolution as [number, number, number],
                featureChannels: (output.radiance_field_stats as Record<string, unknown>).feature_channels as number,
              }
            : undefined,
        })),
        metadata: {
          generationTimeMs: Date.now() - startTime,
          sparseVoxelCount: data.sparse_voxel_count,
          slatDimensions: data.slat_dimensions,
          seed,
        },
      };
    } catch (error) {
      // If server is unavailable, return mock data for development
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('fetch'))) {
        console.warn('[TrellisClient] Server unavailable, returning mock generation result');
        return this.getMockResult(request, seed, startTime);
      }

      return {
        id: `trellis-err-${Date.now()}`,
        status: 'error',
        model: request.model,
        outputs: [],
        metadata: { generationTimeMs: Date.now() - startTime, seed },
        error: error instanceof Error ? error.message : 'Unknown generation error',
      };
    }
  }

  /**
   * Mock result for development when TRELLIS server is not available
   */
  private getMockResult(
    request: TrellisGenerationRequest,
    seed: number,
    startTime: number
  ): TrellisGenerationResult {
    const outputs: TrellisOutput[] = request.outputFormats.map((format) => {
      const base: TrellisOutput = {
        format,
        data: `mock://${format}/${Date.now()}`,
        sizeBytes: format === 'mesh' ? 2500000 : format === 'gaussian' ? 8000000 : 15000000,
      };

      if (format === 'mesh') {
        base.meshStats = {
          vertexCount: 45000,
          faceCount: 90000,
          hasUVs: true,
          hasNormals: true,
          boundingBox: {
            min: [-1, -1, -1],
            max: [1, 1, 1],
          },
        };
      } else if (format === 'gaussian') {
        base.gaussianStats = {
          splatCount: 150000,
          meanScale: 0.008,
        };
      } else if (format === 'radiance_field') {
        base.radianceFieldStats = {
          resolution: [128, 128, 128],
          featureChannels: 32,
        };
      }

      return base;
    });

    return {
      id: `trellis-mock-${Date.now()}`,
      status: 'success',
      model: request.model,
      outputs,
      metadata: {
        generationTimeMs: Date.now() - startTime,
        sparseVoxelCount: 8192,
        slatDimensions: [64, 64, 64],
        seed,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let trellisClient: TrellisClient | null = null;

export function getTrellisClient(): TrellisClient {
  if (!trellisClient) {
    trellisClient = new TrellisClient();
  }
  return trellisClient;
}
