'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Package, Clock, DollarSign, CheckCircle2, AlertTriangle } from 'lucide-react';

interface MaterialCardProps {
  material: {
    id: string;
    name: string;
    manufacturer?: string | null;
    modelNumber?: string | null;
    unitCost?: number | string | null;
    unitOfMeasure: string;
    availabilityStatus: string;
    leadTimeDays?: number | null;
    buildingCodeCompliant: boolean;
    tags: string[];
    category: { id: string; name: string };
    primaryVendor?: { id: string; name: string; isPreferred: boolean } | null;
    _count?: { projectMaterials: number };
  };
  onClick?: (id: string) => void;
}

const availabilityColors: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  LIMITED_STOCK: 'bg-yellow-100 text-yellow-800',
  SPECIAL_ORDER: 'bg-blue-100 text-blue-800',
  DISCONTINUED: 'bg-red-100 text-red-800',
  OBSOLETE: 'bg-gray-100 text-gray-800',
};

const availabilityLabels: Record<string, string> = {
  AVAILABLE: 'Available',
  LIMITED_STOCK: 'Limited Stock',
  SPECIAL_ORDER: 'Special Order',
  DISCONTINUED: 'Discontinued',
  OBSOLETE: 'Obsolete',
};

export default function MaterialCard({ material, onClick }: MaterialCardProps) {
  const cost = material.unitCost ? Number(material.unitCost) : null;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(material.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{material.name}</h3>
            {material.manufacturer && (
              <p className="text-xs text-gray-500 truncate">{material.manufacturer}</p>
            )}
          </div>
          <Badge variant="outline" className={availabilityColors[material.availabilityStatus] || ''}>
            {availabilityLabels[material.availabilityStatus] || material.availabilityStatus}
          </Badge>
        </div>

        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <Package className="w-3 h-3" />
          <span>{material.category.name}</span>
          {material.modelNumber && (
            <>
              <span className="mx-1">|</span>
              <span>{material.modelNumber}</span>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {cost !== null && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-green-600" />
              <span className="font-medium">
                ${cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-gray-400">/{material.unitOfMeasure}</span>
            </div>
          )}
          {material.leadTimeDays != null && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-600" />
              <span>{material.leadTimeDays} days</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 mt-2 flex-wrap">
          {material.buildingCodeCompliant && (
            <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
              Code Compliant
            </Badge>
          )}
          {material.primaryVendor?.isPreferred && (
            <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
              Preferred Vendor
            </Badge>
          )}
          {material.availabilityStatus === 'LIMITED_STOCK' && (
            <Badge variant="outline" className="text-[10px] bg-yellow-50 text-yellow-700 border-yellow-200">
              <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
              Low Stock
            </Badge>
          )}
        </div>

        {material.tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {material.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                {tag}
              </span>
            ))}
            {material.tags.length > 3 && (
              <span className="text-[10px] text-gray-400">+{material.tags.length - 3}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
