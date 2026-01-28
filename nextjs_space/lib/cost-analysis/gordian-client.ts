/**
 * Gordian RSMeans Construction Cost Data API Client
 * Swagger: https://dataapi-sb.gordian.com/swagger/v1/swagger.json
 *
 * Provides access to the RSMeans cost database including unit costs,
 * assembly costs, square foot models, cost factors, and lifecycle costing.
 */

const GORDIAN_API_URL = process.env.GORDIAN_API_URL || 'https://dataapi-sb.gordian.com';
const GORDIAN_ACCESS_TOKEN = process.env.GORDIAN_ACCESS_TOKEN || '';

interface GordianRequestOptions {
  method?: 'GET' | 'POST';
  body?: Record<string, unknown>;
  params?: Record<string, string>;
}

async function gordianFetch<T>(endpoint: string, options: GordianRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options;

  const url = new URL(`${GORDIAN_API_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${GORDIAN_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Gordian RSMeans API error ${res.status}: ${errorText}`);
  }

  return res.json() as Promise<T>;
}

// ─── Type Definitions ────────────────────────────────────────────

export interface GordianPaginatedResponse<T> {
  offset: number;
  limit: number;
  recordCount: number;
  data: T[];
  pageNavigation?: {
    first?: string;
    previous?: string;
    next?: string;
    last?: string;
  };
}

export interface GordianCatalog {
  id: string;
  name: string;
  description?: string;
  releaseId?: string;
  locationId?: string;
  laborType?: string;
  measurementSystem?: string;
}

export interface GordianUnitCostLine {
  id: string;
  lineNumber: string;
  description: string;
  unit: string;
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  totalCost: number;
  dailyOutput?: number;
  laborHours?: number;
  divisionCode: string;
  costLineType?: string;
}

export interface GordianAssemblyCostLine {
  id: string;
  lineNumber: string;
  description: string;
  unit: string;
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  totalCost: number;
  divisionCode: string;
  components?: GordianAssemblyComponent[];
}

export interface GordianAssemblyComponent {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  totalCost: number;
}

export interface GordianDivision {
  id: string;
  code: string;
  name: string;
  description?: string;
  parentId?: string;
  children?: GordianDivision[];
}

export interface GordianCostFactor {
  id: string;
  locationId: string;
  locationName: string;
  materialFactor: number;
  laborFactor: number;
  equipmentFactor: number;
  totalFactor: number;
}

export interface GordianLocation {
  id: string;
  name: string;
  stateProvince?: string;
  country?: string;
  zipCode?: string;
}

export interface GordianSquareFootModel {
  id: string;
  name: string;
  buildingType: string;
  description?: string;
  wallCodes?: string[];
}

export interface GordianModelEstimate {
  modelId: string;
  wallCode: string;
  totalCost: number;
  costPerSqFt: number;
  area: number;
  perimeter: number;
  stories: number;
  breakdown: {
    category: string;
    cost: number;
    percentage: number;
  }[];
}

export interface GordianLifecycleCost {
  id: string;
  assemblyId: string;
  initialCost: number;
  annualMaintenance: number;
  replacementCost: number;
  expectedLifeYears: number;
  lifeCycleCost: number;
  annualizedCost: number;
}

export interface GordianEquipmentRentalLine {
  id: string;
  description: string;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  operatorCostPerDay?: number;
}

export interface GordianRelease {
  id: string;
  name: string;
  releaseDate: string;
  isAnnual: boolean;
}

// ─── Unit Cost Data ──────────────────────────────────────────────

/**
 * List available unit cost catalogs
 */
export async function listUnitCatalogs(params?: {
  releaseId?: string;
  locationId?: string;
  laborType?: string;
  measurementSystem?: string;
}): Promise<GordianCatalog[]> {
  const queryParams: Record<string, string> = {};
  if (params?.releaseId) queryParams.releaseId = params.releaseId;
  if (params?.locationId) queryParams.locationId = params.locationId;
  if (params?.laborType) queryParams.laborType = params.laborType;
  if (params?.measurementSystem) queryParams.measurementSystem = params.measurementSystem;

  return gordianFetch('/v1/costdata/unit/catalogs', { params: queryParams });
}

/**
 * Get a specific unit cost catalog
 */
export async function getUnitCatalog(catalogId: string): Promise<GordianCatalog> {
  return gordianFetch(`/v1/costdata/unit/catalogs/${catalogId}`);
}

/**
 * List unit cost lines within a catalog
 */
export async function listUnitCostLines(
  catalogId: string,
  params?: {
    divisionCode?: string;
    offset?: number;
    limit?: number;
    expand?: string;
  }
): Promise<GordianPaginatedResponse<GordianUnitCostLine>> {
  const queryParams: Record<string, string> = {};
  if (params?.divisionCode) queryParams.divisionCode = params.divisionCode;
  if (params?.offset !== undefined) queryParams.offset = String(params.offset);
  if (params?.limit !== undefined) queryParams.limit = String(params.limit);
  if (params?.expand) queryParams.expand = params.expand;

  return gordianFetch(`/v1/costdata/unit/catalogs/${catalogId}/costlines`, { params: queryParams });
}

/**
 * Search unit cost lines with division aggregations
 */
export async function searchUnitCostLines(
  catalogId: string,
  params: {
    searchTerm: string;
    divisionCode?: string;
    costLineType?: string;
    offset?: number;
    limit?: number;
  }
): Promise<GordianPaginatedResponse<GordianUnitCostLine>> {
  const queryParams: Record<string, string> = { searchTerm: params.searchTerm };
  if (params.divisionCode) queryParams.divisionCode = params.divisionCode;
  if (params.costLineType) queryParams.costLineType = params.costLineType;
  if (params.offset !== undefined) queryParams.offset = String(params.offset);
  if (params.limit !== undefined) queryParams.limit = String(params.limit);

  return gordianFetch(`/v1/costdata/unit/catalogs/${catalogId}/costlines/_search`, { params: queryParams });
}

/**
 * Get a single unit cost line
 */
export async function getUnitCostLine(catalogId: string, lineId: string): Promise<GordianUnitCostLine> {
  return gordianFetch(`/v1/costdata/unit/catalogs/${catalogId}/costlines/${lineId}`);
}

// ─── Division Hierarchy ──────────────────────────────────────────

/**
 * Get top-level divisions for a unit catalog
 */
export async function getUnitDivisions(catalogId: string): Promise<GordianDivision[]> {
  return gordianFetch(`/v1/costdata/unit/catalogs/${catalogId}/divisions`);
}

/**
 * Get a specific division with its direct children
 */
export async function getUnitDivision(catalogId: string, divisionId: string): Promise<GordianDivision> {
  return gordianFetch(`/v1/costdata/unit/catalogs/${catalogId}/divisions/${divisionId}`);
}

/**
 * Get child divisions
 */
export async function getUnitDivisionChildren(catalogId: string, divisionId: string): Promise<GordianDivision[]> {
  return gordianFetch(`/v1/costdata/unit/catalogs/${catalogId}/divisions/${divisionId}/children`);
}

// ─── Assembly Cost Data ──────────────────────────────────────────

/**
 * List assembly catalogs
 */
export async function listAssemblyCatalogs(params?: {
  releaseId?: string;
  locationId?: string;
}): Promise<GordianCatalog[]> {
  const queryParams: Record<string, string> = {};
  if (params?.releaseId) queryParams.releaseId = params.releaseId;
  if (params?.locationId) queryParams.locationId = params.locationId;

  return gordianFetch('/v1/costdata/assembly/catalogs', { params: queryParams });
}

/**
 * List assembly cost lines
 */
export async function listAssemblyCostLines(
  catalogId: string,
  params?: {
    divisionCode?: string;
    offset?: number;
    limit?: number;
  }
): Promise<GordianPaginatedResponse<GordianAssemblyCostLine>> {
  const queryParams: Record<string, string> = {};
  if (params?.divisionCode) queryParams.divisionCode = params.divisionCode;
  if (params?.offset !== undefined) queryParams.offset = String(params.offset);
  if (params?.limit !== undefined) queryParams.limit = String(params.limit);

  return gordianFetch(`/v1/costdata/assembly/catalogs/${catalogId}/costlines`, { params: queryParams });
}

/**
 * Get assembly components breakdown
 */
export async function getAssemblyComponents(
  catalogId: string,
  lineId: string
): Promise<GordianPaginatedResponse<GordianAssemblyComponent>> {
  return gordianFetch(`/v1/costdata/assembly/catalogs/${catalogId}/costlines/${lineId}/components`);
}

// ─── Cost Factors (Location-Based) ──────────────────────────────

/**
 * Get unit cost factors for locations
 */
export async function getUnitCostFactors(params?: {
  locationId?: string;
}): Promise<GordianCostFactor[]> {
  const queryParams: Record<string, string> = {};
  if (params?.locationId) queryParams.locationId = params.locationId;

  return gordianFetch('/v1/costdata/unit/costfactors', { params: queryParams });
}

/**
 * Get cost factor for a specific location
 */
export async function getUnitCostFactor(factorId: string): Promise<GordianCostFactor> {
  return gordianFetch(`/v1/costdata/unit/costfactors/${factorId}`);
}

/**
 * Get assembly cost factors for locations
 */
export async function getAssemblyCostFactors(params?: {
  locationId?: string;
}): Promise<GordianCostFactor[]> {
  const queryParams: Record<string, string> = {};
  if (params?.locationId) queryParams.locationId = params.locationId;

  return gordianFetch('/v1/costdata/assembly/costfactors', { params: queryParams });
}

// ─── Square Foot Models ──────────────────────────────────────────

/**
 * List available commercial square foot models
 */
export async function listSquareFootModels(): Promise<GordianSquareFootModel[]> {
  return gordianFetch('/v1/squarefootmodel/commercial/models');
}

/**
 * Get a specific model's specifications
 */
export async function getSquareFootModel(modelId: string): Promise<GordianSquareFootModel> {
  return gordianFetch(`/v1/squarefootmodel/commercial/models/${modelId}`);
}

/**
 * Generate a square foot estimate for a commercial model
 */
export async function getSquareFootEstimate(
  modelId: string,
  wallCode: string,
  params?: {
    area?: number;
    perimeter?: number;
    stories?: number;
    storyHeight?: number;
    includeBasement?: boolean;
    contractorFees?: number;
    architecturalFees?: number;
    userFees?: number;
    constructionStartDate?: string;
    locationId?: string;
  }
): Promise<GordianModelEstimate> {
  const queryParams: Record<string, string> = {};
  if (params?.area) queryParams.area = String(params.area);
  if (params?.perimeter) queryParams.perimeter = String(params.perimeter);
  if (params?.stories) queryParams.stories = String(params.stories);
  if (params?.storyHeight) queryParams.storyHeight = String(params.storyHeight);
  if (params?.includeBasement !== undefined) queryParams.includeBasement = String(params.includeBasement);
  if (params?.contractorFees) queryParams.contractorFees = String(params.contractorFees);
  if (params?.architecturalFees) queryParams.architecturalFees = String(params.architecturalFees);
  if (params?.userFees) queryParams.userFees = String(params.userFees);
  if (params?.constructionStartDate) queryParams.constructionStartDate = params.constructionStartDate;
  if (params?.locationId) queryParams.locationId = params.locationId;

  return gordianFetch(`/v1/squarefootmodel/commercial/modelestimates/${modelId}-${wallCode}`, { params: queryParams });
}

/**
 * Generate a customized square foot estimate with component swaps
 */
export async function createCustomSquareFootEstimate(
  modelId: string,
  wallCode: string,
  body: {
    swaps?: { componentId: string; replacementId: string }[];
    area?: number;
    perimeter?: number;
    stories?: number;
    locationId?: string;
  }
): Promise<GordianModelEstimate> {
  return gordianFetch(`/v1/squarefootmodel/commercial/modelestimates/${modelId}-${wallCode}`, {
    method: 'POST',
    body: body as unknown as Record<string, unknown>,
  });
}

// ─── Equipment Rental ────────────────────────────────────────────

/**
 * List equipment rental cost lines
 */
export async function listEquipmentRentalLines(
  catalogId: string,
  params?: { offset?: number; limit?: number }
): Promise<GordianPaginatedResponse<GordianEquipmentRentalLine>> {
  const queryParams: Record<string, string> = {};
  if (params?.offset !== undefined) queryParams.offset = String(params.offset);
  if (params?.limit !== undefined) queryParams.limit = String(params.limit);

  return gordianFetch(`/v1/costdata/unit/catalogs/${catalogId}/equipmentrentalcostlines`, { params: queryParams });
}

// ─── Lifecycle Costing ───────────────────────────────────────────

/**
 * Get lifecycle cost analysis for an assembly
 */
export async function getLifecycleCosts(
  assemblyId: string,
  params?: {
    quantity?: number;
    releaseId?: string;
    locationId?: string;
  }
): Promise<GordianLifecycleCost> {
  const queryParams: Record<string, string> = {};
  if (params?.quantity) queryParams.quantity = String(params.quantity);
  if (params?.releaseId) queryParams.releaseId = params.releaseId;
  if (params?.locationId) queryParams.locationId = params.locationId;

  return gordianFetch(`/v1/lifecycle/assembly/lifecyclecosts/${assemblyId}`, { params: queryParams });
}

// ─── Reference Data ──────────────────────────────────────────────

/**
 * Search locations (supports zip codes, city names)
 */
export async function searchLocations(params?: {
  searchTerm?: string;
}): Promise<GordianLocation[]> {
  const queryParams: Record<string, string> = {};
  if (params?.searchTerm) queryParams.searchTerm = params.searchTerm;

  return gordianFetch('/v1/costdata/locations', { params: queryParams });
}

/**
 * Get a specific location by ID or 3-digit zip
 */
export async function getLocation(locationId: string): Promise<GordianLocation> {
  return gordianFetch(`/v1/costdata/locations/${locationId}`);
}

/**
 * List all available data releases
 */
export async function listReleases(): Promise<GordianRelease[]> {
  return gordianFetch('/v1/costdata/releases');
}

/**
 * Get API health status
 */
export async function getStatus(): Promise<{ status: string; version?: string }> {
  return gordianFetch('/v1/status');
}

export const gordianClient = {
  // Unit costs
  listUnitCatalogs,
  getUnitCatalog,
  listUnitCostLines,
  searchUnitCostLines,
  getUnitCostLine,
  // Divisions
  getUnitDivisions,
  getUnitDivision,
  getUnitDivisionChildren,
  // Assembly costs
  listAssemblyCatalogs,
  listAssemblyCostLines,
  getAssemblyComponents,
  // Cost factors
  getUnitCostFactors,
  getUnitCostFactor,
  getAssemblyCostFactors,
  // Square foot models
  listSquareFootModels,
  getSquareFootModel,
  getSquareFootEstimate,
  createCustomSquareFootEstimate,
  // Equipment rental
  listEquipmentRentalLines,
  // Lifecycle costing
  getLifecycleCosts,
  // Reference
  searchLocations,
  getLocation,
  listReleases,
  getStatus,
};
