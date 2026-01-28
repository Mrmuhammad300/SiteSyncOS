/**
 * Material cost calculation utilities for SiteSync OS
 */

export interface MaterialCostInput {
  unitCost: number;
  quantity: number;
  unitOfMeasure: string;
  wasteFactor?: number; // e.g., 0.10 for 10% waste
  taxRate?: number; // e.g., 0.08 for 8%
  shippingCost?: number;
  installationCostPerUnit?: number;
}

export interface MaterialCostBreakdown {
  baseCost: number;
  wasteAllowance: number;
  subtotal: number;
  tax: number;
  shipping: number;
  installationCost: number;
  totalCost: number;
  costPerUnit: number;
  effectiveQuantity: number;
}

/**
 * Calculate total material cost with waste, tax, shipping, and installation
 */
export function calculateMaterialCost(input: MaterialCostInput): MaterialCostBreakdown {
  const wasteFactor = input.wasteFactor || 0;
  const taxRate = input.taxRate || 0;
  const shippingCost = input.shippingCost || 0;
  const installationCostPerUnit = input.installationCostPerUnit || 0;

  const effectiveQuantity = input.quantity * (1 + wasteFactor);
  const baseCost = input.unitCost * input.quantity;
  const wasteAllowance = input.unitCost * input.quantity * wasteFactor;
  const subtotal = baseCost + wasteAllowance;
  const tax = subtotal * taxRate;
  const installationCost = effectiveQuantity * installationCostPerUnit;
  const totalCost = subtotal + tax + shippingCost + installationCost;
  const costPerUnit = input.quantity > 0 ? totalCost / input.quantity : 0;

  return {
    baseCost: round(baseCost),
    wasteAllowance: round(wasteAllowance),
    subtotal: round(subtotal),
    tax: round(tax),
    shipping: round(shippingCost),
    installationCost: round(installationCost),
    totalCost: round(totalCost),
    costPerUnit: round(costPerUnit),
    effectiveQuantity: round(effectiveQuantity),
  };
}

export interface ProjectCostSummary {
  totalMaterialCost: number;
  totalItems: number;
  averageCostPerItem: number;
  costByCategory: Record<string, number>;
  costByStatus: Record<string, number>;
  budgetVariance: number;
  budgetUtilization: number;
}

/**
 * Calculate project-level material cost summary
 */
export function calculateProjectCostSummary(
  materials: Array<{
    budgetedCost: number | null;
    actualCost: number | null;
    status: string;
    categoryName: string;
    quantity: number;
    unitCost: number;
  }>,
  totalBudget?: number,
): ProjectCostSummary {
  const totalMaterialCost = materials.reduce(
    (sum, m) => sum + (m.actualCost ?? m.budgetedCost ?? m.quantity * m.unitCost),
    0,
  );

  const costByCategory: Record<string, number> = {};
  const costByStatus: Record<string, number> = {};

  for (const m of materials) {
    const cost = m.actualCost ?? m.budgetedCost ?? m.quantity * m.unitCost;
    costByCategory[m.categoryName] = (costByCategory[m.categoryName] || 0) + cost;
    costByStatus[m.status] = (costByStatus[m.status] || 0) + cost;
  }

  const totalBudgeted = materials.reduce((sum, m) => sum + (m.budgetedCost ?? 0), 0);
  const totalActual = materials.reduce((sum, m) => sum + (m.actualCost ?? 0), 0);

  return {
    totalMaterialCost: round(totalMaterialCost),
    totalItems: materials.length,
    averageCostPerItem: materials.length > 0 ? round(totalMaterialCost / materials.length) : 0,
    costByCategory,
    costByStatus,
    budgetVariance: round(totalBudgeted - totalActual),
    budgetUtilization: totalBudget && totalBudget > 0 ? round((totalMaterialCost / totalBudget) * 100) : 0,
  };
}

export interface PriceHistoryTrend {
  materialId: string;
  materialName: string;
  pricePoints: Array<{ date: string; unitCost: number }>;
  currentPrice: number;
  priceChange30d: number | null;
  priceChange90d: number | null;
  volatility: number;
}

/**
 * Analyze price trends from history
 */
export function analyzePriceTrend(
  materialName: string,
  materialId: string,
  history: Array<{ effectiveDate: Date | string; unitCost: number }>,
): PriceHistoryTrend {
  const sorted = [...history].sort(
    (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime(),
  );

  const pricePoints = sorted.map((h) => ({
    date: new Date(h.effectiveDate).toISOString().split('T')[0],
    unitCost: h.unitCost,
  }));

  const currentPrice = sorted.length > 0 ? sorted[sorted.length - 1].unitCost : 0;
  const now = Date.now();
  const d30 = now - 30 * 86400000;
  const d90 = now - 90 * 86400000;

  const price30dAgo = sorted.find((h) => new Date(h.effectiveDate).getTime() <= d30);
  const price90dAgo = sorted.find((h) => new Date(h.effectiveDate).getTime() <= d90);

  const priceChange30d =
    price30dAgo && currentPrice ? round(((currentPrice - price30dAgo.unitCost) / price30dAgo.unitCost) * 100) : null;
  const priceChange90d =
    price90dAgo && currentPrice ? round(((currentPrice - price90dAgo.unitCost) / price90dAgo.unitCost) * 100) : null;

  // Volatility: standard deviation of % changes
  const changes: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].unitCost > 0) {
      changes.push((sorted[i].unitCost - sorted[i - 1].unitCost) / sorted[i - 1].unitCost);
    }
  }
  const mean = changes.length > 0 ? changes.reduce((s, c) => s + c, 0) / changes.length : 0;
  const variance = changes.length > 0 ? changes.reduce((s, c) => s + (c - mean) ** 2, 0) / changes.length : 0;
  const volatility = round(Math.sqrt(variance) * 100);

  return {
    materialId,
    materialName,
    pricePoints,
    currentPrice,
    priceChange30d,
    priceChange90d,
    volatility,
  };
}

function round(n: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}
