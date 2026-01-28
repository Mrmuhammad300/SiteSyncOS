'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, SlidersHorizontal } from 'lucide-react';

export interface MaterialFilterValues {
  query?: string;
  categoryId?: string;
  manufacturer?: string;
  availabilityStatus?: string;
  minCost?: number;
  maxCost?: number;
  buildingCodeCompliant?: boolean;
  sortBy: string;
  sortOrder: string;
}

interface MaterialFiltersProps {
  categories: Array<{ id: string; name: string; count: number }>;
  manufacturers: Array<{ name: string; count: number }>;
  values: MaterialFilterValues;
  onChange: (values: MaterialFilterValues) => void;
  onReset: () => void;
}

export default function MaterialFilters({
  categories,
  manufacturers,
  values,
  onChange,
  onReset,
}: MaterialFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const activeFilters = [
    values.categoryId,
    values.manufacturer,
    values.availabilityStatus,
    values.minCost !== undefined ? 'minCost' : null,
    values.maxCost !== undefined ? 'maxCost' : null,
    values.buildingCodeCompliant ? 'compliant' : null,
  ].filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search materials..."
          value={values.query || ''}
          onChange={(e) => onChange({ ...values, query: e.target.value || undefined })}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="gap-1"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilters > 0 && (
            <span className="bg-indigo-100 text-indigo-700 rounded-full px-1.5 text-xs font-medium">
              {activeFilters}
            </span>
          )}
        </Button>
        {activeFilters > 0 && (
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1 text-gray-500">
            <X className="w-3 h-3" /> Clear
          </Button>
        )}
      </div>

      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 border rounded-lg bg-gray-50">
          <div>
            <Label className="text-xs">Category</Label>
            <Select
              value={values.categoryId || ''}
              onValueChange={(v) => onChange({ ...values, categoryId: v || undefined })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Manufacturer</Label>
            <Select
              value={values.manufacturer || ''}
              onValueChange={(v) => onChange({ ...values, manufacturer: v || undefined })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All manufacturers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All manufacturers</SelectItem>
                {manufacturers.map((m) => (
                  <SelectItem key={m.name} value={m.name}>
                    {m.name} ({m.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Availability</Label>
            <Select
              value={values.availabilityStatus || ''}
              onValueChange={(v) => onChange({ ...values, availabilityStatus: v || undefined })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any status</SelectItem>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="LIMITED_STOCK">Limited Stock</SelectItem>
                <SelectItem value="SPECIAL_ORDER">Special Order</SelectItem>
                <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Sort by</Label>
            <Select
              value={values.sortBy}
              onValueChange={(v) => onChange({ ...values, sortBy: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="unitCost">Price</SelectItem>
                <SelectItem value="manufacturer">Manufacturer</SelectItem>
                <SelectItem value="leadTimeDays">Lead Time</SelectItem>
                <SelectItem value="createdAt">Date Added</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Min Cost ($)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              className="mt-1"
              value={values.minCost ?? ''}
              onChange={(e) =>
                onChange({ ...values, minCost: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </div>

          <div>
            <Label className="text-xs">Max Cost ($)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              className="mt-1"
              value={values.maxCost ?? ''}
              onChange={(e) =>
                onChange({ ...values, maxCost: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={values.buildingCodeCompliant || false}
                onChange={(e) =>
                  onChange({ ...values, buildingCodeCompliant: e.target.checked || undefined })
                }
                className="rounded border-gray-300"
              />
              <span className="text-xs">Code Compliant Only</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
