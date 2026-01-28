'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Plus, Grid3X3, List } from 'lucide-react';
import MaterialCard from '@/components/materials/MaterialCard';
import MaterialFilters, { type MaterialFilterValues } from '@/components/materials/MaterialFilters';

const defaultFilters: MaterialFilterValues = {
  sortBy: 'name',
  sortOrder: 'asc',
};

export default function MaterialLibraryPage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [facets, setFacets] = useState<any>({ categories: [], manufacturers: [], availability: [] });
  const [filters, setFilters] = useState<MaterialFilterValues>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.query) params.set('query', filters.query);
      if (filters.categoryId) params.set('categoryId', filters.categoryId);
      if (filters.manufacturer) params.set('manufacturer', filters.manufacturer);
      if (filters.availabilityStatus) params.set('availabilityStatus', filters.availabilityStatus);
      if (filters.minCost !== undefined) params.set('minCost', String(filters.minCost));
      if (filters.maxCost !== undefined) params.set('maxCost', String(filters.maxCost));
      if (filters.buildingCodeCompliant) params.set('buildingCodeCompliant', 'true');
      params.set('sortBy', filters.sortBy);
      params.set('sortOrder', filters.sortOrder);
      params.set('page', String(pagination.page));
      params.set('pageSize', String(pagination.pageSize));

      const res = await fetch(`/api/materials/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.materials || []);
        setPagination(data.pagination || pagination);
        setFacets(data.facets || facets);
      }
    } catch (err) {
      console.error('Failed to fetch materials:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6" />
            Material Library
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse and manage construction materials with CSI classification
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          <Button className="gap-1">
            <Plus className="w-4 h-4" /> Add Material
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <MaterialFilters
          categories={facets.categories}
          manufacturers={facets.manufacturers}
          values={filters}
          onChange={(v) => {
            setFilters(v);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          onReset={() => {
            setFilters(defaultFilters);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
        />
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : materials.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-700">No materials found</h3>
            <p className="text-sm text-gray-500 mt-1">
              Try adjusting your filters or add new materials to the library.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-3">
            Showing {materials.length} of {pagination.total} materials
          </p>
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                : 'space-y-2'
            }
          >
            {materials.map((m: any) => (
              <MaterialCard
                key={m.id}
                material={m}
                onClick={(id) => router.push(`/materials/${id}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
