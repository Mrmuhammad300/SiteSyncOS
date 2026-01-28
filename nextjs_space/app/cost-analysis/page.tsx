'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardNav } from '@/components/dashboard-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  Search,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Building2,
  MapPin,
  Calculator,
  FileText,
  Layers,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info,
  Plus,
  History,
  Database,
} from 'lucide-react';

interface CostEstimate {
  id: string;
  estimateName: string;
  projectType: string;
  squareFootage: number;
  zipCode: string;
  city?: string;
  state?: string;
  estimatedTotalCost: number;
  costPerSqFt: number;
  grandTotal: number;
  laborTotal: number;
  materialTotal: number;
  equipmentTotal: number;
  contingency: number;
  rsMeansLocalizedAvg?: number;
  benchmarkDeltaPercent?: number;
  isAboveBenchmark?: boolean;
  confidenceLevel?: string;
  recommendations: string[];
  dataSources: string[];
  createdAt: string;
  project?: { id: string; name: string; projectNumber: string };
}

export default function CostAnalysisPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('new-analysis');
  const [estimates, setEstimates] = useState<CostEstimate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    projectName: '',
    projectType: 'commercial',
    zipCode: '',
    city: '',
    state: '',
    address: '',
    squareFootage: '',
    stories: '1',
    description: '',
    includeRSMeansBenchmark: true,
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSource, setSearchSource] = useState<'both' | '1build' | 'rsmeans'>('both');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Location factors state
  const [locationFactors, setLocationFactors] = useState<any>(null);
  const [factorsLoading, setFactorsLoading] = useState(false);

  useEffect(() => {
    fetchEstimates();
  }, []);

  async function fetchEstimates() {
    try {
      const res = await fetch('/api/cost-analysis');
      if (res.ok) {
        const data = await res.json();
        setEstimates(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch estimates:', error);
    }
  }

  async function handleRunAnalysis(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setAnalysisResult(null);

    try {
      const res = await fetch('/api/cost-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: formData.projectName,
          projectType: formData.projectType,
          location: {
            address: formData.address,
            city: formData.city,
            state: formData.state,
            zipCode: formData.zipCode,
          },
          squareFootage: parseFloat(formData.squareFootage),
          stories: parseInt(formData.stories),
          description: formData.description,
          includeRSMeansBenchmark: formData.includeRSMeansBenchmark,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data);
        fetchEstimates();
        setActiveTab('results');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        source: searchSource,
        limit: '30',
      });
      if (formData.zipCode) params.set('zipCode', formData.zipCode);

      const res = await fetch(`/api/cost-analysis/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.data || []);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleFetchLocationFactors() {
    if (!formData.zipCode) return;
    setFactorsLoading(true);

    try {
      const res = await fetch(`/api/cost-analysis/location-factors?zipCode=${formData.zipCode}`);
      if (res.ok) {
        const data = await res.json();
        setLocationFactors(data);
      }
    } catch (error) {
      console.error('Location factors failed:', error);
    } finally {
      setFactorsLoading(false);
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  const formatCurrencyDecimal = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                  <Calculator className="w-7 h-7 text-white" />
                </div>
                Cost Analysis
              </h1>
              <p className="mt-2 text-gray-600">
                Construction cost estimation powered by 1build and RSMeans data
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Database className="w-3 h-3 mr-1" />
                1build
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                <Database className="w-3 h-3 mr-1" />
                RSMeans
              </Badge>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="new-analysis" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Analysis
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Results
            </TabsTrigger>
            <TabsTrigger value="cost-search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Cost Database
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History ({estimates.length})
            </TabsTrigger>
          </TabsList>

          {/* ─── New Analysis Tab ──────────────────────────── */}
          <TabsContent value="new-analysis">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-green-600" />
                      Project Cost Analysis
                    </CardTitle>
                    <CardDescription>
                      Enter project details to get cost estimates from 1build and RSMeans benchmarks
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleRunAnalysis} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                          <input
                            type="text"
                            required
                            value={formData.projectName}
                            onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                            placeholder="e.g. Oakwood Commercial Plaza"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Project Type *</label>
                          <select
                            value={formData.projectType}
                            onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                          >
                            <option value="residential">Residential</option>
                            <option value="commercial">Commercial</option>
                            <option value="industrial">Industrial</option>
                            <option value="mixed-use">Mixed-Use</option>
                            <option value="renovation">Renovation</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code *</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              required
                              value={formData.zipCode}
                              onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                              placeholder="e.g. 90210"
                              maxLength={5}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleFetchLocationFactors}
                              disabled={!formData.zipCode || factorsLoading}
                              className="whitespace-nowrap"
                            >
                              <MapPin className="w-4 h-4 mr-1" />
                              {factorsLoading ? 'Loading...' : 'Factors'}
                            </Button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                          <input
                            type="text"
                            value={formData.city}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                            placeholder="e.g. Beverly Hills"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                          <input
                            type="text"
                            value={formData.state}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                            placeholder="e.g. CA"
                            maxLength={2}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Square Footage *</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={formData.squareFootage}
                            onChange={(e) => setFormData({ ...formData, squareFootage: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                            placeholder="e.g. 25000"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Stories</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={formData.stories}
                            onChange={(e) => setFormData({ ...formData, stories: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                          placeholder="Describe scope, finishes, special requirements..."
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="includeBenchmark"
                          checked={formData.includeRSMeansBenchmark}
                          onChange={(e) => setFormData({ ...formData, includeRSMeansBenchmark: e.target.checked })}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <label htmlFor="includeBenchmark" className="text-sm text-gray-700">
                          Include RSMeans benchmark comparison
                        </label>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Running Cost Analysis...
                          </>
                        ) : (
                          <>
                            <Calculator className="w-4 h-4 mr-2" />
                            Run Cost Analysis
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Location Factors Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      Location Cost Factors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {locationFactors ? (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">{locationFactors.location || locationFactors.zipCode}</span>
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Labor Factor</span>
                            <span className="font-medium">{locationFactors.averageFactors.labor.toFixed(3)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Material Factor</span>
                            <span className="font-medium">{locationFactors.averageFactors.material.toFixed(3)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Equipment Factor</span>
                            <span className="font-medium">{locationFactors.averageFactors.equipment.toFixed(3)}</span>
                          </div>
                          <div className="border-t pt-2 flex justify-between text-sm font-semibold">
                            <span>Overall Factor</span>
                            <span>{locationFactors.averageFactors.overall.toFixed(3)}</span>
                          </div>
                        </div>
                        {locationFactors.gordianFactors && (
                          <Badge variant="outline" className="text-xs bg-purple-50">RSMeans Data</Badge>
                        )}
                        {locationFactors.oneBuildFactors && (
                          <Badge variant="outline" className="text-xs bg-blue-50 ml-1">1build Data</Badge>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Enter a ZIP code and click &quot;Factors&quot; to see location-based cost multipliers.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Info className="w-4 h-4 text-amber-600" />
                      Data Sources
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">1build</p>
                        <p className="text-xs text-gray-500">Project-level cost estimation with line-item detail</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Gordian RSMeans</p>
                        <p className="text-xs text-gray-500">Industry-standard cost data with location factors and benchmarks</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ─── Results Tab ───────────────────────────────── */}
          <TabsContent value="results">
            {analysisResult ? (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Grand Total</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(analysisResult.analysis.summary.grandTotal)}
                          </p>
                        </div>
                        <DollarSign className="w-8 h-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Cost / Sq Ft</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrencyDecimal(analysisResult.analysis.summary.costPerSqFt)}
                          </p>
                        </div>
                        <Layers className="w-8 h-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">RSMeans Benchmark</p>
                          <p className="text-2xl font-bold text-gray-900">
                            {analysisResult.analysis.rsMeansBenchmark
                              ? formatCurrencyDecimal(analysisResult.analysis.rsMeansBenchmark.localizedCostPerSqFt)
                              : 'N/A'}
                          </p>
                        </div>
                        <BarChart3 className="w-8 h-8 text-purple-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">vs Benchmark</p>
                          {analysisResult.analysis.comparison ? (
                            <p className={`text-2xl font-bold ${analysisResult.analysis.comparison.isAboveBenchmark ? 'text-red-600' : 'text-green-600'}`}>
                              {analysisResult.analysis.comparison.isAboveBenchmark ? '+' : ''}
                              {analysisResult.analysis.comparison.estimateVsBenchmarkPercent.toFixed(1)}%
                            </p>
                          ) : (
                            <p className="text-2xl font-bold text-gray-400">N/A</p>
                          )}
                        </div>
                        {analysisResult.analysis.comparison?.isAboveBenchmark ? (
                          <TrendingUp className="w-8 h-8 text-red-500" />
                        ) : (
                          <TrendingDown className="w-8 h-8 text-green-500" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Cost Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-green-600" />
                        Cost Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[
                          { label: 'Labor', value: analysisResult.analysis.summary.laborTotal, color: 'bg-blue-500' },
                          { label: 'Materials', value: analysisResult.analysis.summary.materialTotal, color: 'bg-green-500' },
                          { label: 'Equipment', value: analysisResult.analysis.summary.equipmentTotal, color: 'bg-amber-500' },
                          { label: 'Contingency (5%)', value: analysisResult.analysis.summary.contingency, color: 'bg-gray-400' },
                        ].map((item) => {
                          const total = analysisResult.analysis.summary.grandTotal;
                          const pct = total > 0 ? (item.value / total) * 100 : 0;
                          return (
                            <div key={item.label}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">{item.label}</span>
                                <span className="font-medium">{formatCurrency(item.value)} ({pct.toFixed(1)}%)</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className={`${item.color} h-2 rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* RSMeans Benchmark Range */}
                  {analysisResult.analysis.rsMeansBenchmark && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-purple-600" />
                          RSMeans Benchmark Range
                        </CardTitle>
                        <CardDescription>
                          Localized cost per square foot (factor: {analysisResult.analysis.rsMeansBenchmark.locationFactor.toFixed(3)})
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                            <span className="text-sm text-green-700">Low Range</span>
                            <span className="font-bold text-green-700">
                              {formatCurrencyDecimal(analysisResult.analysis.rsMeansBenchmark.costRange.low)} /sqft
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
                            <span className="text-sm text-blue-700 font-medium">Median</span>
                            <span className="font-bold text-blue-700">
                              {formatCurrencyDecimal(analysisResult.analysis.rsMeansBenchmark.costRange.median)} /sqft
                            </span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                            <span className="text-sm text-red-700">High Range</span>
                            <span className="font-bold text-red-700">
                              {formatCurrencyDecimal(analysisResult.analysis.rsMeansBenchmark.costRange.high)} /sqft
                            </span>
                          </div>

                          <div className="border-t pt-4 space-y-2">
                            <p className="text-xs font-medium text-gray-500 uppercase">Location Cost Factors</p>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div className="text-center p-2 bg-gray-50 rounded">
                                <p className="text-gray-500 text-xs">Material</p>
                                <p className="font-semibold">{analysisResult.analysis.rsMeansBenchmark.materialFactor.toFixed(3)}</p>
                              </div>
                              <div className="text-center p-2 bg-gray-50 rounded">
                                <p className="text-gray-500 text-xs">Labor</p>
                                <p className="font-semibold">{analysisResult.analysis.rsMeansBenchmark.laborFactor.toFixed(3)}</p>
                              </div>
                              <div className="text-center p-2 bg-gray-50 rounded">
                                <p className="text-gray-500 text-xs">Equipment</p>
                                <p className="font-semibold">{analysisResult.analysis.rsMeansBenchmark.equipmentFactor.toFixed(3)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Recommendations */}
                {analysisResult.analysis.comparison?.recommendations && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                        Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysisResult.analysis.comparison.recommendations.map((rec: string, i: number) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <ArrowRight className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                            <p className="text-sm text-gray-700">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Line Items */}
                {analysisResult.analysis.oneBuildEstimate?.lineItems?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Line Item Detail
                      </CardTitle>
                      <CardDescription>
                        {analysisResult.analysis.oneBuildEstimate.lineItems.length} items from 1build estimate
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left">
                              <th className="pb-2 font-medium text-gray-500">Description</th>
                              <th className="pb-2 font-medium text-gray-500">Category</th>
                              <th className="pb-2 font-medium text-gray-500 text-right">Qty</th>
                              <th className="pb-2 font-medium text-gray-500">Unit</th>
                              <th className="pb-2 font-medium text-gray-500 text-right">Unit Cost</th>
                              <th className="pb-2 font-medium text-gray-500 text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysisResult.analysis.oneBuildEstimate.lineItems.map((item: any, i: number) => (
                              <tr key={i} className="border-b last:border-0">
                                <td className="py-2 pr-4">{item.description}</td>
                                <td className="py-2 pr-4">
                                  <Badge variant="outline" className="text-xs">{item.category}</Badge>
                                </td>
                                <td className="py-2 text-right pr-4">{item.quantity}</td>
                                <td className="py-2 pr-4">{item.unit}</td>
                                <td className="py-2 text-right pr-4">{formatCurrencyDecimal(item.unitCost)}</td>
                                <td className="py-2 text-right font-medium">{formatCurrency(item.totalCost)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600">No Analysis Results Yet</h3>
                  <p className="text-gray-400 mt-2">Run a cost analysis from the &quot;New Analysis&quot; tab to see results here.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setActiveTab('new-analysis')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Start New Analysis
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ─── Cost Database Search Tab ──────────────────── */}
          <TabsContent value="cost-search">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-600" />
                  Cost Item Database Search
                </CardTitle>
                <CardDescription>
                  Search construction cost items across 1build and RSMeans databases
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="flex gap-3 mb-6">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search for cost items (e.g. concrete footing, steel beam, drywall)..."
                  />
                  <select
                    value={searchSource}
                    onChange={(e) => setSearchSource(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  >
                    <option value="both">Both Sources</option>
                    <option value="1build">1build Only</option>
                    <option value="rsmeans">RSMeans Only</option>
                  </select>
                  <Button type="submit" disabled={searchLoading}>
                    {searchLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span className="ml-2">Search</span>
                  </Button>
                </form>

                {searchResults.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 font-medium text-gray-500">Source</th>
                          <th className="pb-2 font-medium text-gray-500">Description</th>
                          <th className="pb-2 font-medium text-gray-500">Unit</th>
                          <th className="pb-2 font-medium text-gray-500 text-right">Labor</th>
                          <th className="pb-2 font-medium text-gray-500 text-right">Material</th>
                          <th className="pb-2 font-medium text-gray-500 text-right">Equipment</th>
                          <th className="pb-2 font-medium text-gray-500 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchResults.map((item, i) => (
                          <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="py-2 pr-3">
                              <Badge
                                variant="outline"
                                className={`text-xs ${item.source === '1build' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}
                              >
                                {item.source === '1build' ? '1build' : 'RSMeans'}
                              </Badge>
                            </td>
                            <td className="py-2 pr-3 max-w-xs truncate">{item.description}</td>
                            <td className="py-2 pr-3">{item.unit}</td>
                            <td className="py-2 text-right pr-3">{formatCurrencyDecimal(item.laborCost)}</td>
                            <td className="py-2 text-right pr-3">{formatCurrencyDecimal(item.materialCost)}</td>
                            <td className="py-2 text-right pr-3">{formatCurrencyDecimal(item.equipmentCost)}</td>
                            <td className="py-2 text-right font-medium">{formatCurrencyDecimal(item.unitCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Database className="w-10 h-10 mx-auto mb-3" />
                    <p>Search the cost database to find unit prices, labor rates, and material costs.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── History Tab ───────────────────────────────── */}
          <TabsContent value="history">
            {estimates.length > 0 ? (
              <div className="space-y-4">
                {estimates.map((est) => (
                  <Card key={est.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-gray-900">{est.estimateName}</h3>
                            <Badge variant="outline" className="text-xs capitalize">{est.projectType}</Badge>
                            {est.dataSources.map((s) => (
                              <Badge
                                key={s}
                                variant="outline"
                                className={`text-xs ${s === '1build' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}
                              >
                                {s === '1build' ? '1build' : 'RSMeans'}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {est.city && est.state ? `${est.city}, ${est.state}` : est.zipCode}
                            </span>
                            <span>{est.squareFootage.toLocaleString()} sqft</span>
                            <span>{new Date(est.createdAt).toLocaleDateString()}</span>
                            {est.project && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                {est.project.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900">{formatCurrency(est.grandTotal)}</p>
                          <p className="text-sm text-gray-500">{formatCurrencyDecimal(est.costPerSqFt)} /sqft</p>
                          {est.benchmarkDeltaPercent !== null && est.benchmarkDeltaPercent !== undefined && (
                            <Badge
                              className={`mt-1 text-xs ${est.isAboveBenchmark ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                            >
                              {est.isAboveBenchmark ? (
                                <TrendingUp className="w-3 h-3 mr-1" />
                              ) : (
                                <TrendingDown className="w-3 h-3 mr-1" />
                              )}
                              {est.isAboveBenchmark ? '+' : ''}{est.benchmarkDeltaPercent.toFixed(1)}% vs benchmark
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600">No Cost Estimates Yet</h3>
                  <p className="text-gray-400 mt-2">Run your first analysis to start building your estimate history.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setActiveTab('new-analysis')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Estimate
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
