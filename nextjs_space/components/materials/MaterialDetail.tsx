'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package, DollarSign, Clock, Shield, Leaf, FileText,
  Building2, Wrench, CheckCircle2, ExternalLink,
} from 'lucide-react';

interface MaterialDetailProps {
  material: {
    id: string;
    name: string;
    description?: string | null;
    manufacturer?: string | null;
    productLine?: string | null;
    modelNumber?: string | null;
    sku?: string | null;
    unitCost?: number | string | null;
    unitOfMeasure: string;
    currency: string;
    availabilityStatus: string;
    leadTimeDays?: number | null;
    buildingCodeCompliant: boolean;
    certifications: string[];
    tags: string[];
    expectedLifespan?: number | null;
    warrantyInfo?: string | null;
    maintenanceNotes?: string | null;
    dataSheetUrl?: string | null;
    installationGuideUrl?: string | null;
    structuralProperties?: any;
    thermalProperties?: any;
    acousticProperties?: any;
    fireRatings?: any;
    sustainabilityMetrics?: any;
    category: { id: string; name: string; parent?: { name: string } | null };
    primaryVendor?: {
      id: string;
      name: string;
      companyName?: string | null;
      email?: string | null;
      phone?: string | null;
      reliabilityScore?: number | string | null;
    } | null;
    priceHistory?: Array<{
      id: string;
      unitCost: number | string;
      effectiveDate: string;
      source?: string | null;
      vendor?: { name: string } | null;
    }>;
    _count?: {
      projectMaterials: number;
      specifications: number;
      priceHistory: number;
    };
  };
}

export default function MaterialDetail({ material }: MaterialDetailProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const cost = material.unitCost ? Number(material.unitCost) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            {material.category.parent && <span>{material.category.parent.name}</span>}
            {material.category.parent && <span>/</span>}
            <span>{material.category.name}</span>
          </div>
          <h1 className="text-2xl font-bold">{material.name}</h1>
          {material.manufacturer && (
            <p className="text-gray-600 mt-1">
              {material.manufacturer}
              {material.productLine && ` - ${material.productLine}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {cost !== null && (
            <div className="text-right">
              <p className="text-2xl font-bold text-green-700">
                ${cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500">per {material.unitOfMeasure}</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Lead Time</p>
              <p className="font-semibold text-sm">{material.leadTimeDays ?? 'N/A'} days</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <div>
              <p className="text-xs text-gray-500">Used in Projects</p>
              <p className="font-semibold text-sm">{material._count?.projectMaterials ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-600" />
            <div>
              <p className="text-xs text-gray-500">Lifespan</p>
              <p className="font-semibold text-sm">{material.expectedLifespan ?? 'N/A'} years</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-600" />
            <div>
              <p className="text-xs text-gray-500">Specifications</p>
              <p className="font-semibold text-sm">{material._count?.specifications ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="vendor">Vendor</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {material.description && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Description</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-gray-700">{material.description}</p></CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle className="text-sm">Identification</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {material.modelNumber && (
                  <><dt className="text-gray-500">Model</dt><dd>{material.modelNumber}</dd></>
                )}
                {material.sku && (
                  <><dt className="text-gray-500">SKU</dt><dd>{material.sku}</dd></>
                )}
                <dt className="text-gray-500">Unit</dt><dd>{material.unitOfMeasure}</dd>
                <dt className="text-gray-500">Category</dt><dd>{material.category.name}</dd>
              </dl>
            </CardContent>
          </Card>
          {material.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {material.tags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            {material.dataSheetUrl && (
              <a href={material.dataSheetUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                <FileText className="w-3 h-3" /> Data Sheet <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {material.installationGuideUrl && (
              <a href={material.installationGuideUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                <Wrench className="w-3 h-3" /> Installation Guide <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </TabsContent>

        <TabsContent value="properties" className="space-y-4">
          {material.structuralProperties && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Structural Properties</CardTitle></CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">
                  {JSON.stringify(material.structuralProperties, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
          {material.thermalProperties && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Thermal Properties</CardTitle></CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">
                  {JSON.stringify(material.thermalProperties, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
          {material.acousticProperties && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Acoustic Properties</CardTitle></CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">
                  {JSON.stringify(material.acousticProperties, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
          {material.fireRatings && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Fire Ratings</CardTitle></CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">
                  {JSON.stringify(material.fireRatings, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Compliance & Certifications</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                {material.buildingCodeCompliant ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Building Code Compliant
                  </Badge>
                ) : (
                  <Badge variant="outline">Not Verified</Badge>
                )}
              </div>
              {material.certifications.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Certifications</p>
                  <div className="flex flex-wrap gap-1">
                    {material.certifications.map((cert) => (
                      <Badge key={cert} variant="outline">{cert}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {material.warrantyInfo && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Warranty</p>
                  <p className="text-sm">{material.warrantyInfo}</p>
                </div>
              )}
              {material.sustainabilityMetrics && (
                <div>
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Leaf className="w-3 h-3" /> Sustainability
                  </p>
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">
                    {JSON.stringify(material.sustainabilityMetrics, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Price History</CardTitle></CardHeader>
            <CardContent>
              {material.priceHistory && material.priceHistory.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Price</th>
                      <th className="pb-2">Source</th>
                      <th className="pb-2">Vendor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {material.priceHistory.map((ph) => (
                      <tr key={ph.id} className="border-b last:border-0">
                        <td className="py-2">{new Date(ph.effectiveDate).toLocaleDateString()}</td>
                        <td className="py-2 font-medium">
                          ${Number(ph.unitCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 text-gray-500">{ph.source || '-'}</td>
                        <td className="py-2 text-gray-500">{ph.vendor?.name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-500">No price history available.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendor" className="space-y-4">
          {material.primaryVendor ? (
            <Card>
              <CardHeader><CardTitle className="text-sm">Primary Vendor</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-gray-500">Name</dt>
                  <dd>{material.primaryVendor.name}</dd>
                  {material.primaryVendor.companyName && (
                    <><dt className="text-gray-500">Company</dt><dd>{material.primaryVendor.companyName}</dd></>
                  )}
                  {material.primaryVendor.email && (
                    <><dt className="text-gray-500">Email</dt><dd>{material.primaryVendor.email}</dd></>
                  )}
                  {material.primaryVendor.phone && (
                    <><dt className="text-gray-500">Phone</dt><dd>{material.primaryVendor.phone}</dd></>
                  )}
                  {material.primaryVendor.reliabilityScore && (
                    <><dt className="text-gray-500">Rating</dt>
                    <dd>{Number(material.primaryVendor.reliabilityScore).toFixed(1)} / 5.0</dd></>
                  )}
                </dl>
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-gray-500">No vendor assigned.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
