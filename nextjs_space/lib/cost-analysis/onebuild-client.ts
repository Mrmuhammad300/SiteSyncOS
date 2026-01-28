/**
 * 1build Construction Cost Estimation API Client
 * Production Server: https://gateway-external.1build.com/
 *
 * Provides construction cost estimation, line-item pricing,
 * and project-level cost analysis via the 1build platform.
 */

const ONEBUILD_API_URL = process.env.ONEBUILD_API_URL || 'https://gateway-external.1build.com';
const ONEBUILD_API_KEY = process.env.ONEBUILD_API_KEY || '';

interface OneBuildRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  params?: Record<string, string>;
}

async function oneBuildFetch<T>(endpoint: string, options: OneBuildRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options;

  const url = new URL(`${ONEBUILD_API_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  }

  const headers: Record<string, string> = {
    '1build-api-key': ONEBUILD_API_KEY,
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
    throw new Error(`1build API error ${res.status}: ${errorText}`);
  }

  return res.json() as Promise<T>;
}

// ─── Type Definitions ────────────────────────────────────────────

export interface OneBuildEstimateRequest {
  projectName: string;
  projectType: string;
  location: {
    address?: string;
    city?: string;
    state?: string;
    zipCode: string;
  };
  squareFootage: number;
  stories?: number;
  description?: string;
  lineItems?: OneBuildLineItem[];
}

export interface OneBuildLineItem {
  description: string;
  quantity: number;
  unit: string;
  category?: string;
  csiDivision?: string;
}

export interface OneBuildEstimate {
  id: string;
  projectName: string;
  status: string;
  totalCost: number;
  costPerSqFt: number;
  lineItems: OneBuildEstimateLineItem[];
  location: {
    zipCode: string;
    city?: string;
    state?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OneBuildEstimateLineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  category: string;
  csiDivision?: string;
  laborCost?: number;
  materialCost?: number;
  equipmentCost?: number;
}

export interface OneBuildCostItem {
  id: string;
  description: string;
  unit: string;
  unitCost: number;
  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  category: string;
  csiDivision: string;
  region?: string;
}

// ─── API Methods ─────────────────────────────────────────────────

/**
 * Create a new cost estimate project on 1build
 */
export async function createEstimate(request: OneBuildEstimateRequest): Promise<OneBuildEstimate> {
  return oneBuildFetch<OneBuildEstimate>('/v1/estimates', {
    method: 'POST',
    body: request as unknown as Record<string, unknown>,
  });
}

/**
 * Get an existing estimate by ID
 */
export async function getEstimate(estimateId: string): Promise<OneBuildEstimate> {
  return oneBuildFetch<OneBuildEstimate>(`/v1/estimates/${estimateId}`);
}

/**
 * List all estimates with optional filtering
 */
export async function listEstimates(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{ data: OneBuildEstimate[]; total: number; page: number; limit: number }> {
  const queryParams: Record<string, string> = {};
  if (params?.page) queryParams.page = String(params.page);
  if (params?.limit) queryParams.limit = String(params.limit);
  if (params?.status) queryParams.status = params.status;

  return oneBuildFetch('/v1/estimates', { params: queryParams });
}

/**
 * Search the 1build cost database for items
 */
export async function searchCostItems(params: {
  query: string;
  zipCode?: string;
  category?: string;
  limit?: number;
}): Promise<{ data: OneBuildCostItem[]; total: number }> {
  const queryParams: Record<string, string> = { q: params.query };
  if (params.zipCode) queryParams.zipCode = params.zipCode;
  if (params.category) queryParams.category = params.category;
  if (params.limit) queryParams.limit = String(params.limit);

  return oneBuildFetch('/v1/cost-items/search', { params: queryParams });
}

/**
 * Get regional cost factors for a specific zip code
 */
export async function getRegionalCostFactors(zipCode: string): Promise<{
  zipCode: string;
  region: string;
  laborMultiplier: number;
  materialMultiplier: number;
  equipmentMultiplier: number;
  overallMultiplier: number;
}> {
  return oneBuildFetch(`/v1/cost-factors/${zipCode}`);
}

/**
 * Add line items to an existing estimate
 */
export async function addLineItems(
  estimateId: string,
  lineItems: OneBuildLineItem[]
): Promise<OneBuildEstimate> {
  return oneBuildFetch<OneBuildEstimate>(`/v1/estimates/${estimateId}/line-items`, {
    method: 'POST',
    body: { lineItems } as unknown as Record<string, unknown>,
  });
}

/**
 * Get cost breakdown summary for an estimate
 */
export async function getEstimateSummary(estimateId: string): Promise<{
  estimateId: string;
  totalCost: number;
  costPerSqFt: number;
  breakdown: {
    category: string;
    totalCost: number;
    percentage: number;
    lineItemCount: number;
  }[];
  laborTotal: number;
  materialTotal: number;
  equipmentTotal: number;
}> {
  return oneBuildFetch(`/v1/estimates/${estimateId}/summary`);
}

export const oneBuildClient = {
  createEstimate,
  getEstimate,
  listEstimates,
  searchCostItems,
  getRegionalCostFactors,
  addLineItems,
  getEstimateSummary,
};
