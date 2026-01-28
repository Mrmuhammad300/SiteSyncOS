'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Building2, Search, Star, Package, Clock, TrendingUp, Plus, Phone, Mail, Globe,
} from 'lucide-react';

const vendorTypeLabels: Record<string, string> = {
  MANUFACTURER: 'Manufacturer',
  DISTRIBUTOR: 'Distributor',
  SUPPLIER: 'Supplier',
  FABRICATOR: 'Fabricator',
  SPECIALTY: 'Specialty',
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [preferredOnly, setPreferredOnly] = useState(false);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (typeFilter) params.set('type', typeFilter);
      if (preferredOnly) params.set('preferred', 'true');

      const res = await fetch(`/api/vendors?${params}`);
      if (res.ok) {
        const data = await res.json();
        setVendors(data.vendors || []);
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
    } finally {
      setLoading(false);
    }
  }, [query, typeFilter, preferredOnly]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Vendor Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage material suppliers, manufacturers, and distributors
          </p>
        </div>
        <Button className="gap-1">
          <Plus className="w-4 h-4" /> Add Vendor
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search vendors..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All types</SelectItem>
            {Object.entries(vendorTypeLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={preferredOnly}
            onChange={(e) => setPreferredOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          Preferred only
        </label>
      </div>

      {/* Vendor List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 space-y-3">
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-700">No vendors found</h3>
            <p className="text-sm text-gray-500 mt-1">Add vendors to manage your supply chain.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((vendor: any) => (
            <Card key={vendor.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{vendor.name}</CardTitle>
                    {vendor.companyName && vendor.companyName !== vendor.name && (
                      <p className="text-xs text-gray-500">{vendor.companyName}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {vendor.isPreferred && (
                      <Badge className="bg-yellow-100 text-yellow-800 gap-1">
                        <Star className="w-3 h-3" /> Preferred
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant="outline">
                  {vendorTypeLabels[vendor.vendorType] || vendor.vendorType}
                </Badge>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <Package className="w-3 h-3 text-blue-600" />
                    <span>{vendor._count?.materials ?? 0} materials</span>
                  </div>
                  {vendor.averageLeadTime && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-orange-600" />
                      <span>{vendor.averageLeadTime}d lead</span>
                    </div>
                  )}
                  {vendor.reliabilityScore && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-green-600" />
                      <span>{Number(vendor.reliabilityScore).toFixed(1)}/5</span>
                    </div>
                  )}
                </div>

                {vendor.specialties?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {vendor.specialties.slice(0, 3).map((s: string) => (
                      <span key={s} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-gray-500 pt-1 border-t">
                  {vendor.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {vendor.email}
                    </span>
                  )}
                  {vendor.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {vendor.phone}
                    </span>
                  )}
                  {vendor.website && (
                    <a
                      href={vendor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <Globe className="w-3 h-3" /> Website
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
