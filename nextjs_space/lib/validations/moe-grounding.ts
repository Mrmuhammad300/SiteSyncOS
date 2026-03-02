import { z } from 'zod';

const ASSET_TYPES = [
  'building_exterior', 'building_interior', 'structural_element',
  'mep_component', 'site_element', 'furniture_fixture',
  'material_sample', 'equipment', 'landscape', 'facade_detail',
] as const;

const OUTPUT_FORMATS = ['mesh', 'gaussian', 'radiance_field'] as const;

const MODEL_VARIANTS = [
  'TRELLIS-image-large', 'TRELLIS-text-base', 'TRELLIS-text-large', 'TRELLIS-text-xlarge',
] as const;

const LOD_TARGETS = [100, 200, 300, 350, 400] as const;

export const MoEGroundingRequestSchema = z.object({
  mode: z.enum(['text-to-3d', 'image-to-3d'], {
    required_error: 'mode is required',
    invalid_type_error: 'mode must be "text-to-3d" or "image-to-3d"',
  }),
  prompt: z.string().max(2000).optional(),
  images: z.array(z.string()).max(8, 'Maximum 8 images allowed').optional(),
  model: z.enum(MODEL_VARIANTS).optional(),
  outputFormats: z
    .array(z.enum(OUTPUT_FORMATS))
    .min(1, 'At least one output format required')
    .max(3)
    .default(['mesh']),
  assetType: z.enum(ASSET_TYPES).default('building_exterior'),
  projectType: z.string().max(100).optional(),
  lodTarget: z.union([z.literal(100), z.literal(200), z.literal(300), z.literal(350), z.literal(400)]).optional(),
  topK: z.number().int().min(1).max(5).default(3),
  projectId: z.string().cuid('Invalid projectId').optional(),
  seed: z.number().int().min(0).optional(),
  expertOverrides: z.record(z.number().min(0).max(1)).optional(),
}).superRefine((data, ctx) => {
  if (data.mode === 'text-to-3d' && !data.prompt?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['prompt'], message: 'prompt is required for text-to-3d mode' });
  }
  if (data.mode === 'image-to-3d' && (!data.images || data.images.length === 0)) {
    ctx.addIssue({ code: 'custom', path: ['images'], message: 'images array is required for image-to-3d mode' });
  }
});

export const MoERoutingPreviewSchema = z.object({
  assetType: z.enum(ASSET_TYPES).default('building_exterior'),
  projectType: z.string().max(100).optional(),
  lodTarget: z.coerce.number().int().optional(),
  topK: z.coerce.number().int().min(1).max(5).default(3),
});

export type MoEGroundingRequestInput = z.infer<typeof MoEGroundingRequestSchema>;
export type MoERoutingPreviewInput = z.infer<typeof MoERoutingPreviewSchema>;
