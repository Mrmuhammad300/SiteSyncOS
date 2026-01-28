import { z } from 'zod';

// Material Category
export const materialCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().max(500).optional(),
  parentId: z.string().optional(),
  csiDivision: z.string().max(10).optional(),
  csiSection: z.string().max(20).optional(),
  displayOrder: z.number().int().min(0).default(0),
  iconName: z.string().max(50).optional(),
});

// Material
export const materialCreateSchema = z.object({
  name: z.string().min(1, 'Material name is required').max(200),
  description: z.string().max(5000).optional(),
  manufacturer: z.string().max(200).optional(),
  productLine: z.string().max(200).optional(),
  modelNumber: z.string().max(100).optional(),
  sku: z.string().max(100).optional(),
  categoryId: z.string().min(1, 'Category is required'),
  csiDivision: z.string().max(10).optional(),
  csiSection: z.string().max(20).optional(),
  unitCost: z.number().min(0).optional(),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required').max(20),
  currency: z.string().default('USD'),
  priceDate: z.string().datetime().optional(),
  priceSource: z.string().max(200).optional(),
  leadTimeDays: z.number().int().min(0).optional(),
  availabilityStatus: z.enum(['AVAILABLE', 'LIMITED_STOCK', 'SPECIAL_ORDER', 'DISCONTINUED', 'OBSOLETE']).default('AVAILABLE'),
  minimumOrderQuantity: z.number().min(0).optional(),
  structuralProperties: z.record(z.any()).optional(),
  thermalProperties: z.record(z.any()).optional(),
  acousticProperties: z.record(z.any()).optional(),
  fireRatings: z.record(z.any()).optional(),
  sustainabilityMetrics: z.record(z.any()).optional(),
  buildingCodeCompliant: z.boolean().default(false),
  certifications: z.array(z.string()).default([]),
  approvalRegions: z.array(z.string()).default([]),
  dataSheetUrl: z.string().url().optional().or(z.literal('')),
  installationGuideUrl: z.string().url().optional().or(z.literal('')),
  warrantyInfo: z.string().max(2000).optional(),
  expectedLifespan: z.number().int().min(0).optional(),
  maintenanceNotes: z.string().max(2000).optional(),
  primaryVendorId: z.string().optional(),
  alternativeVendorIds: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

export const materialUpdateSchema = materialCreateSchema.partial();

// Vendor
export const vendorCreateSchema = z.object({
  name: z.string().min(1, 'Vendor name is required').max(200),
  companyName: z.string().max(200).optional(),
  contactName: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  zipCode: z.string().max(20).optional(),
  country: z.string().default('USA'),
  website: z.string().url().optional().or(z.literal('')),
  vendorType: z.enum(['MANUFACTURER', 'DISTRIBUTOR', 'SUPPLIER', 'FABRICATOR', 'SPECIALTY']),
  specialties: z.array(z.string()).default([]),
  serviceRegions: z.array(z.string()).default([]),
  paymentTerms: z.string().max(500).optional(),
  shippingPolicy: z.string().max(2000).optional(),
  returnPolicy: z.string().max(2000).optional(),
  reliabilityScore: z.number().min(0).max(5).optional(),
  averageLeadTime: z.number().int().min(0).optional(),
  onTimeDeliveryRate: z.number().min(0).max(100).optional(),
  isPreferred: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
});

export const vendorUpdateSchema = vendorCreateSchema.partial();

// Project Material
export const projectMaterialCreateSchema = z.object({
  materialId: z.string().min(1, 'Material is required'),
  quantity: z.number().min(0, 'Quantity must be positive'),
  location: z.string().max(200).optional(),
  specSection: z.string().max(50).optional(),
  budgetedCost: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
});

// Material Specification
export const materialSpecCreateSchema = z.object({
  materialId: z.string().min(1),
  projectId: z.string().optional(),
  specSection: z.string().min(1, 'Spec section is required'),
  specTitle: z.string().min(1, 'Spec title is required'),
  requirements: z.string().min(1, 'Requirements are required'),
  performanceCriteria: z.string().optional(),
  testingRequired: z.boolean().default(false),
  testingStandards: z.array(z.string()).default([]),
  qualityControlNotes: z.string().optional(),
  submittalRequired: z.boolean().default(true),
  sampleRequired: z.boolean().default(false),
  mockupRequired: z.boolean().default(false),
  installationMethod: z.string().optional(),
  specialInstructions: z.string().optional(),
  warrantyPeriod: z.number().int().min(0).optional(),
  warrantyType: z.string().optional(),
});

// Material Substitution
export const materialSubstitutionCreateSchema = z.object({
  projectId: z.string().min(1),
  originalMaterialId: z.string().min(1),
  substituteMaterialId: z.string().min(1),
  reason: z.string().min(1, 'Reason is required'),
  requestedBy: z.string().min(1),
  costDifference: z.number().optional(),
  impactsSchedule: z.boolean().default(false),
  scheduleDays: z.number().int().optional(),
});

// Search/filter params
export const materialSearchSchema = z.object({
  query: z.string().optional(),
  categoryId: z.string().optional(),
  manufacturer: z.string().optional(),
  csiDivision: z.string().optional(),
  availabilityStatus: z.enum(['AVAILABLE', 'LIMITED_STOCK', 'SPECIAL_ORDER', 'DISCONTINUED', 'OBSOLETE']).optional(),
  minCost: z.number().min(0).optional(),
  maxCost: z.number().min(0).optional(),
  tags: z.array(z.string()).optional(),
  buildingCodeCompliant: z.boolean().optional(),
  sortBy: z.enum(['name', 'unitCost', 'manufacturer', 'leadTimeDays', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export type MaterialCreate = z.infer<typeof materialCreateSchema>;
export type MaterialUpdate = z.infer<typeof materialUpdateSchema>;
export type VendorCreate = z.infer<typeof vendorCreateSchema>;
export type VendorUpdate = z.infer<typeof vendorUpdateSchema>;
export type ProjectMaterialCreate = z.infer<typeof projectMaterialCreateSchema>;
export type MaterialSearch = z.infer<typeof materialSearchSchema>;
export type MaterialCategoryCreate = z.infer<typeof materialCategorySchema>;
