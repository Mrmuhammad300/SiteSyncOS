'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, Package, AlertTriangle, BarChart3 } from 'lucide-react';
import {
  calculateProjectCostSummary,
  type ProjectCostSummary,
} from '@/lib/materials/material-cost-calculator';

interface MaterialCostAnalyticsProps {
  projectMaterials: Array<{
    budgetedCost: number | null;
    actualCost: number | null;
    status: string;
    quantity: number;
    material: {
      unitCost: number | string | null;
      category: { name: string };
    };
  }>;
  totalBudget?: number;
}

const statusColors: Record<string, string> = {
  SPECIFIED: 'bg-gray-100 text-gray-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  ORDERED: 'bg-yellow-100 text-yellow-700',
  IN_TRANSIT: 'bg-orange-100 text-orange-700',
  DELIVERED: 'bg-green-100 text-green-700',
  INSTALLED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function MaterialCostAnalytics({
  projectMaterials,
  totalBudget,
}: MaterialCostAnalyticsProps) {
  const summary: ProjectCostSummary = useMemo(() => {
    const mapped = projectMaterials.map((pm) => ({
      budgetedCost: pm.budgetedCost,
      actualCost: pm.actualCost,
      status: pm.status,
      categoryName: pm.material.category.name,
      quantity: pm.quantity,
      unitCost: pm.material.unitCost ? Number(pm.material.unitCost) : 0,
    }));
    return calculateProjectCostSummary(mapped, totalBudget);
  }, [projectMaterials, totalBudget]);

  const variancePositive = summary.budgetVariance >= 0;

  return (
    <div className="space-y-4">
      {/* Top-level KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-500">Total Cost</span>
            </div>
            <p className="text-xl font-bold">
              ${summary.totalMaterialCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-500">Total Items</span>
            </div>
            <p className="text-xl font-bold">{summary.totalItems}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              {variancePositive ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className="text-xs text-gray-500">Budget Variance</span>
            </div>
            <p className={`text-xl font-bold ${variancePositive ? 'text-green-700' : 'text-red-700'}`}>
              {variancePositive ? '+' : ''}
              ${summary.budgetVariance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span className="text-xs text-gray-500">Budget Used</span>
            </div>
            <p className="text-xl font-bold">
              {summary.budgetUtilization > 0 ? `${summary.budgetUtilization}%` : 'N/A'}
            </p>
            {summary.budgetUtilization > 90 && (
              <div className="flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3 text-yellow-600" />
                <span className="text-[10px] text-yellow-700">Approaching budget limit</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost by Category */}
      {Object.keys(summary.costByCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cost by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(summary.costByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, cost]) => {
                  const pct =
                    summary.totalMaterialCost > 0
                      ? Math.round((cost / summary.totalMaterialCost) * 100)
                      : 0;
                  return (
                    <div key={category} className="flex items-center gap-3">
                      <span className="text-sm w-32 truncate">{category}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-24 text-right">
                        ${cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Breakdown */}
      {Object.keys(summary.costByStatus).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.costByStatus).map(([status, cost]) => (
                <Badge
                  key={status}
                  variant="outline"
                  className={`${statusColors[status] || ''} text-xs px-2 py-1`}
                >
                  {status.replace(/_/g, ' ')}: $
                  {cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
