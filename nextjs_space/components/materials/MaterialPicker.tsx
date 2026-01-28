'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Package, X, Check } from 'lucide-react';

interface PickerMaterial {
  id: string;
  name: string;
  manufacturer?: string | null;
  modelNumber?: string | null;
  unitCost?: number | string | null;
  unitOfMeasure: string;
  availabilityStatus: string;
  category: { name: string };
}

interface MaterialPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (material: PickerMaterial) => void;
  selectedIds?: string[];
  multiple?: boolean;
}

export default function MaterialPicker({
  isOpen,
  onClose,
  onSelect,
  selectedIds = [],
  multiple = false,
}: MaterialPickerProps) {
  const [query, setQuery] = useState('');
  const [materials, setMaterials] = useState<PickerMaterial[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('query', q);
      params.set('pageSize', '20');
      const res = await fetch(`/api/materials/library?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.materials || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      search(query);
    }
  }, [isOpen, query, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col m-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Select Material</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search materials..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
              Loading...
            </div>
          ) : materials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <Package className="w-8 h-8 mb-2" />
              <p className="text-sm">No materials found</p>
            </div>
          ) : (
            <div className="space-y-1">
              {materials.map((m) => {
                const isSelected = selectedIds.includes(m.id);
                const cost = m.unitCost ? Number(m.unitCost) : null;
                return (
                  <button
                    key={m.id}
                    onClick={() => onSelect(m)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 border border-indigo-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{m.name}</span>
                          {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {m.manufacturer || 'Unknown'} | {m.category.name}
                          {m.modelNumber ? ` | ${m.modelNumber}` : ''}
                        </p>
                      </div>
                      <div className="text-right ml-2">
                        {cost !== null && (
                          <p className="text-sm font-medium">
                            ${cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {m.unitOfMeasure}
                        </Badge>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
