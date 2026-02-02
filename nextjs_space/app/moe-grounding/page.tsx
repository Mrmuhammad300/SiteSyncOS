'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { DashboardNav } from '@/components/dashboard-nav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Box,
  Cpu,
  Layers,
  Shield,
  DollarSign,
  Building2,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  Zap,
  Network,
  Wrench,
  BarChart3,
  FileText,
  Upload,
  X,
  Image as ImageIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExpertWeight {
  expertId: string;
  weight: number;
  reason: string;
}

interface GroundingResult {
  id: string;
  trellisResult: {
    id: string;
    status: string;
    model: string;
    outputs: Array<{
      format: string;
      sizeBytes: number;
      meshStats?: {
        vertexCount: number;
        faceCount: number;
      };
    }>;
    metadata: {
      generationTimeMs: number;
      seed: number;
    };
  };
  expertWeights: ExpertWeight[];
  expertResults: Array<{
    expertId: string;
    result: Record<string, unknown>;
  }>;
  summary: {
    overallConfidence: number;
    structurallyFeasible: boolean | null;
    materialsGrounded: boolean;
    codeCompliant: boolean | null;
    estimatedCost: number | null;
    lodStatus: { current: number; target: number } | null;
    criticalIssues: string[];
    recommendations: string[];
    agentEscalation?: {
      required: boolean;
      targetAgent: string;
      reason: string;
    };
  };
  metadata: {
    totalPipelineTimeMs: number;
    trellisGenerationTimeMs: number;
    groundingTimeMs: number;
    expertsActivated: number;
    topKUsed: number;
  };
}

interface MoEStatus {
  trellis: {
    connected: boolean;
    url: string;
    error?: string;
  };
  moeEngine: {
    version: string;
    experts: number;
    expertIds: string[];
  };
}

interface ExpertDef {
  id: string;
  name: string;
  description: string;
  relevantAssetTypes: string[];
  baseWeight: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ASSET_TYPES = [
  { value: 'building_exterior', label: 'Building Exterior', icon: Building2 },
  { value: 'building_interior', label: 'Building Interior', icon: Layers },
  { value: 'structural_element', label: 'Structural Element', icon: Wrench },
  { value: 'mep_component', label: 'MEP Component', icon: Cpu },
  { value: 'site_element', label: 'Site Element', icon: Box },
  { value: 'facade_detail', label: 'Facade Detail', icon: FileText },
  { value: 'material_sample', label: 'Material Sample', icon: Box },
  { value: 'equipment', label: 'Equipment', icon: Wrench },
  { value: 'furniture_fixture', label: 'Furniture/Fixture', icon: Box },
  { value: 'landscape', label: 'Landscape', icon: Box },
];

const PROJECT_TYPES = [
  'senior-living',
  'veteran-housing',
  'affordable',
  'mixed-use',
  'commercial',
];

const EXPERT_ICONS: Record<string, typeof Shield> = {
  structural_grounding: Shield,
  material_grounding: Box,
  code_compliance: FileText,
  cost_grounding: DollarSign,
  lod_refinement: Layers,
};

const EXPERT_COLORS: Record<string, string> = {
  structural_grounding: 'text-blue-600 bg-blue-50 border-blue-200',
  material_grounding: 'text-green-600 bg-green-50 border-green-200',
  code_compliance: 'text-purple-600 bg-purple-50 border-purple-200',
  cost_grounding: 'text-amber-600 bg-amber-50 border-amber-200',
  lod_refinement: 'text-cyan-600 bg-cyan-50 border-cyan-200',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MoEGroundingPage() {
  const { data: session } = useSession();

  // State
  const [activeTab, setActiveTab] = useState('generate');
  const [status, setStatus] = useState<MoEStatus | null>(null);
  const [experts, setExperts] = useState<ExpertDef[]>([]);
  const [routingPreview, setRoutingPreview] = useState<ExpertWeight[] | null>(null);
  const [result, setResult] = useState<GroundingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [history, setHistory] = useState<GroundingResult[]>([]);

  // Form state
  const [mode, setMode] = useState<'text-to-3d' | 'image-to-3d'>('text-to-3d');
  const [prompt, setPrompt] = useState('');
  const [assetType, setAssetType] = useState('building_exterior');
  const [projectType, setProjectType] = useState('mixed-use');
  const [lodTarget, setLodTarget] = useState(300);
  const [topK, setTopK] = useState(3);

  // Image upload state
  const [uploadedImages, setUploadedImages] = useState<{ name: string; base64: string; preview: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Image processing helpers
  const processFiles = useCallback((files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
    );
    if (validFiles.length === 0) {
      setError('Please upload JPG, PNG, or WebP images.');
      return;
    }
    setError(null);
    for (const file of validFiles) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Extract the base64 part after the data URI prefix
        const base64 = result.split(',')[1];
        setUploadedImages((prev) => [
          ...prev,
          { name: file.name, base64, preview: result },
        ]);
      };
      reader.onerror = () => {
        setError(`Failed to read file: ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeImage = useCallback((index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Load status and experts on mount
  useEffect(() => {
    loadStatus();
    loadExperts();
  }, []);

  // Preview routing when form changes
  useEffect(() => {
    previewRouting();
  }, [assetType, projectType, lodTarget, topK]);

  async function loadStatus() {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/moe-grounding?action=status');
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch (err) {
      console.error('Failed to load MoE status:', err);
    } finally {
      setStatusLoading(false);
    }
  }

  async function loadExperts() {
    try {
      const res = await fetch('/api/moe-grounding?action=experts');
      if (res.ok) {
        const data = await res.json();
        setExperts(data.experts);
      }
    } catch (err) {
      console.error('Failed to load experts:', err);
    }
  }

  async function previewRouting() {
    try {
      const params = new URLSearchParams({
        action: 'preview-routing',
        assetType,
        projectType,
        lodTarget: String(lodTarget),
        topK: String(topK),
      });
      const res = await fetch(`/api/moe-grounding?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRoutingPreview(data.routing);
      }
    } catch (err) {
      console.error('Failed to preview routing:', err);
    }
  }

  async function runPipeline() {
    setError(null);

    if (mode === 'text-to-3d' && !prompt.trim()) {
      setError('Please enter a text prompt describing the construction asset.');
      return;
    }
    if (mode === 'image-to-3d' && uploadedImages.length === 0) {
      setError('Please upload at least one image to generate a 3D asset.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/moe-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          prompt: mode === 'text-to-3d' ? prompt : undefined,
          images: mode === 'image-to-3d' ? uploadedImages.map((img) => img.base64) : undefined,
          assetType,
          projectType,
          lodTarget,
          topK,
          outputFormats: ['mesh', 'gaussian'],
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Server error (${res.status}). Please try again.`);
        return;
      }

      if (data.trellisResult?.status === 'error') {
        setError(`3D generation failed: ${data.trellisResult.error || 'Unknown TRELLIS error'}`);
      }

      setResult(data);
      setHistory((prev) => [data, ...prev].slice(0, 10));
      setActiveTab('results');
    } catch (err) {
      console.error('Pipeline error:', err);
      setError('Network error: Could not reach the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardNav />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg">
              <Network className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">MoE Grounding Engine</h1>
              <p className="text-sm text-gray-500">
                Mixture of Experts pipeline: TRELLIS 3D generation grounded in construction reality
              </p>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${status?.trellis?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-gray-600">
                TRELLIS {status?.trellis?.connected ? 'Connected' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs text-gray-600">
                MoE Engine v{status?.moeEngine?.version || '1.0.0'} ({status?.moeEngine?.experts || 5} experts)
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="generate">Generate & Ground</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="experts">Expert Network</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Generate Tab */}
          <TabsContent value="generate">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Generation Config */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-violet-600" />
                      TRELLIS 3D Generation
                    </CardTitle>
                    <CardDescription>
                      Generate construction-relevant 3D assets from text or images via the TRELLIS model
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Mode Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Generation Mode</label>
                      <div className="flex gap-2">
                        <Button
                          variant={mode === 'text-to-3d' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setMode('text-to-3d')}
                        >
                          Text to 3D
                        </Button>
                        <Button
                          variant={mode === 'image-to-3d' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setMode('image-to-3d')}
                        >
                          Image to 3D
                        </Button>
                      </div>
                    </div>

                    {/* Prompt */}
                    {mode === 'text-to-3d' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Construction Asset Description
                        </label>
                        <textarea
                          className="w-full rounded-md border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                          rows={4}
                          placeholder="e.g., A 5-story mixed-use building with glass curtain wall facade, ground floor retail, concrete structure, and rooftop solar panels..."
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                        />
                      </div>
                    )}

                    {mode === 'image-to-3d' && (
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              processFiles(e.target.files);
                              e.target.value = '';
                            }
                          }}
                        />
                        <div
                          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                            isDragging
                              ? 'border-violet-500 bg-violet-50'
                              : 'border-gray-300 hover:border-violet-400 hover:bg-gray-50'
                          }`}
                          onClick={() => fileInputRef.current?.click()}
                          onDrop={handleDrop}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                        >
                          <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">
                            {isDragging ? 'Drop images here' : 'Click to browse or drag & drop construction photos'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Supports: JPG, PNG, WebP (multiple images for multi-view)
                          </p>
                        </div>
                        {uploadedImages.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs font-medium text-gray-700">
                              {uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''} selected
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {uploadedImages.map((img, idx) => (
                                <div key={idx} className="relative group">
                                  <img
                                    src={img.preview}
                                    alt={img.name}
                                    className="h-20 w-20 object-cover rounded-md border border-gray-200"
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeImage(idx);
                                    }}
                                    className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                  <div className="text-xs text-gray-400 mt-0.5 truncate w-20">{img.name}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Asset Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Construction Asset Type</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ASSET_TYPES.map((at) => {
                          const Icon = at.icon;
                          return (
                            <button
                              key={at.value}
                              onClick={() => setAssetType(at.value)}
                              className={`flex items-center gap-2 p-2 rounded-md border text-sm transition-colors ${
                                assetType === at.value
                                  ? 'border-violet-500 bg-violet-50 text-violet-700'
                                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              {at.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Project Type & LOD */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Project Type</label>
                        <select
                          className="w-full rounded-md border border-gray-300 p-2 text-sm"
                          value={projectType}
                          onChange={(e) => setProjectType(e.target.value)}
                        >
                          {PROJECT_TYPES.map((pt) => (
                            <option key={pt} value={pt}>
                              {pt.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Target LOD</label>
                        <select
                          className="w-full rounded-md border border-gray-300 p-2 text-sm"
                          value={lodTarget}
                          onChange={(e) => setLodTarget(Number(e.target.value))}
                        >
                          <option value={100}>LOD 100 - Conceptual</option>
                          <option value={200}>LOD 200 - Schematic Design</option>
                          <option value={300}>LOD 300 - Design Development</option>
                          <option value={350}>LOD 350 - Construction Docs</option>
                          <option value={400}>LOD 400 - Fabrication</option>
                        </select>
                      </div>
                    </div>

                    {/* Top-K */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Active Experts (top-K): {topK}
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        value={topK}
                        onChange={(e) => setTopK(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>1 (fastest)</span>
                        <span>5 (most thorough)</span>
                      </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                      <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">{error}</div>
                        <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {/* Run Button */}
                    <Button
                      className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                      onClick={runPipeline}
                      disabled={
                        loading ||
                        (mode === 'text-to-3d' && !prompt.trim()) ||
                        (mode === 'image-to-3d' && uploadedImages.length === 0)
                      }
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Running MoE Pipeline...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Generate & Ground 3D Asset
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Routing Preview Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Network className="h-4 w-4 text-indigo-600" />
                      Gating Network Preview
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Expert routing weights for current configuration
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {routingPreview ? (
                      <div className="space-y-3">
                        {routingPreview.map((ew) => {
                          const Icon = EXPERT_ICONS[ew.expertId] || Cpu;
                          const colors = EXPERT_COLORS[ew.expertId] || 'text-gray-600 bg-gray-50 border-gray-200';
                          return (
                            <div key={ew.expertId} className={`p-3 rounded-lg border ${colors}`}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  <span className="text-xs font-medium">
                                    {ew.expertId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                                  </span>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {(ew.weight * 100).toFixed(0)}%
                                </Badge>
                              </div>
                              <div className="w-full bg-white/50 rounded-full h-1.5">
                                <div
                                  className="h-1.5 rounded-full bg-current opacity-60"
                                  style={{ width: `${ew.weight * 100}%` }}
                                />
                              </div>
                              <p className="text-xs mt-1 opacity-75">{ew.reason}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Loading routing preview...</p>
                    )}
                  </CardContent>
                </Card>

                {/* Pipeline Flow */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Pipeline Flow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      {[
                        { label: 'TRELLIS Generation', desc: 'Image/Text to 3D' },
                        { label: 'Gating Network', desc: 'Expert selection (top-K)' },
                        { label: 'Expert Execution', desc: `${topK} experts in parallel` },
                        { label: 'Aggregation', desc: 'Weighted combination' },
                        { label: 'Grounded Output', desc: 'Construction-ready asset' },
                      ].map((step, i) => (
                        <div key={i}>
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">
                              {i + 1}
                            </div>
                            <div>
                              <div className="font-medium text-gray-700">{step.label}</div>
                              <div className="text-gray-400">{step.desc}</div>
                            </div>
                          </div>
                          {i < 4 && (
                            <div className="ml-3 h-3 border-l border-dashed border-violet-200" />
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results">
            {result ? (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart3 className="h-4 w-4 text-violet-600" />
                        <span className="text-xs text-gray-500">Confidence</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {(result.summary.overallConfidence * 100).toFixed(0)}%
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="h-4 w-4 text-blue-600" />
                        <span className="text-xs text-gray-500">Structural</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {result.summary.structurallyFeasible === true && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {result.summary.structurallyFeasible === false && <XCircle className="h-5 w-5 text-red-500" />}
                        {result.summary.structurallyFeasible === null && <Info className="h-5 w-5 text-gray-400" />}
                        <span className="text-sm font-medium">
                          {result.summary.structurallyFeasible === true ? 'Feasible' : result.summary.structurallyFeasible === false ? 'Failed' : 'N/A'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-purple-600" />
                        <span className="text-xs text-gray-500">Code Compliance</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {result.summary.codeCompliant === true && <CheckCircle className="h-5 w-5 text-green-500" />}
                        {result.summary.codeCompliant === false && <XCircle className="h-5 w-5 text-red-500" />}
                        {result.summary.codeCompliant === null && <Info className="h-5 w-5 text-gray-400" />}
                        <span className="text-sm font-medium">
                          {result.summary.codeCompliant === true ? 'Compliant' : result.summary.codeCompliant === false ? 'Issues' : 'N/A'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-amber-600" />
                        <span className="text-xs text-gray-500">Est. Cost</span>
                      </div>
                      <div className="text-lg font-bold">
                        {result.summary.estimatedCost
                          ? `$${(result.summary.estimatedCost / 1000).toFixed(0)}K`
                          : 'N/A'}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Layers className="h-4 w-4 text-cyan-600" />
                        <span className="text-xs text-gray-500">LOD</span>
                      </div>
                      <div className="text-lg font-bold">
                        {result.summary.lodStatus
                          ? `${result.summary.lodStatus.current} -> ${result.summary.lodStatus.target}`
                          : 'N/A'}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Expert Results Detail */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* TRELLIS Output */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">TRELLIS Generation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Model</span>
                        <Badge variant="outline">{result.trellisResult.model}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Generation Time</span>
                        <span>{result.trellisResult.metadata.generationTimeMs}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Outputs</span>
                        <span>{result.trellisResult.outputs.length} format(s)</span>
                      </div>
                      {result.trellisResult.outputs.map((out, i) => (
                        <div key={i} className="bg-gray-50 rounded p-2">
                          <div className="flex justify-between text-xs">
                            <Badge>{out.format}</Badge>
                            <span>{(out.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
                          </div>
                          {out.meshStats && (
                            <div className="text-xs text-gray-500 mt-1">
                              {out.meshStats.vertexCount.toLocaleString()} vertices, {out.meshStats.faceCount.toLocaleString()} faces
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Expert Routing */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Expert Routing</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {result.expertWeights.map((ew) => {
                        const Icon = EXPERT_ICONS[ew.expertId] || Cpu;
                        return (
                          <div key={ew.expertId} className="flex items-center gap-3">
                            <Icon className="h-4 w-4 text-gray-500" />
                            <div className="flex-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-medium">
                                  {ew.expertId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                                </span>
                                <span>{(ew.weight * 100).toFixed(0)}%</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                                <div
                                  className="h-1.5 rounded-full bg-violet-500"
                                  style={{ width: `${ew.weight * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div className="text-xs text-gray-400 mt-2">
                        {result.metadata.expertsActivated} experts activated, top-{result.metadata.topKUsed} routing
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Issues & Recommendations */}
                {(result.summary.criticalIssues.length > 0 || result.summary.recommendations.length > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {result.summary.criticalIssues.length > 0 && (
                      <Card className="border-red-200">
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                            <AlertTriangle className="h-4 w-4" />
                            Critical Issues ({result.summary.criticalIssues.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {result.summary.criticalIssues.map((issue, i) => (
                              <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                                <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                {issue}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                    {result.summary.recommendations.length > 0 && (
                      <Card className="border-amber-200">
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
                            <Info className="h-4 w-4" />
                            Recommendations ({result.summary.recommendations.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {result.summary.recommendations.map((rec, i) => (
                              <li key={i} className="text-sm text-amber-600 flex items-start gap-2">
                                <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Agent Escalation */}
                {result.summary.agentEscalation?.required && (
                  <Card className="border-violet-300 bg-violet-50">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Network className="h-8 w-8 text-violet-600" />
                      <div>
                        <div className="font-medium text-violet-800">Agent Escalation Required</div>
                        <div className="text-sm text-violet-600">
                          Routing to <span className="font-mono">{result.summary.agentEscalation.targetAgent}</span>: {result.summary.agentEscalation.reason}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Pipeline Metadata */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-6 text-xs text-gray-500">
                      <span>Total: {result.metadata.totalPipelineTimeMs}ms</span>
                      <span>TRELLIS: {result.metadata.trellisGenerationTimeMs}ms</span>
                      <span>Grounding: {result.metadata.groundingTimeMs}ms</span>
                      <span>ID: {result.id}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Network className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-500">No Results Yet</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Run the MoE pipeline to see grounded 3D generation results
                  </p>
                  <Button variant="outline" className="mt-4" onClick={() => setActiveTab('generate')}>
                    Go to Generate
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Experts Tab */}
          <TabsContent value="experts">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {experts.map((expert) => {
                const Icon = EXPERT_ICONS[expert.id] || Cpu;
                const colors = EXPERT_COLORS[expert.id] || 'text-gray-600 bg-gray-50 border-gray-200';
                return (
                  <Card key={expert.id} className={`border ${colors.split(' ').pop()}`}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${colors.split(' ').slice(1, 3).join(' ')}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-sm">{expert.name}</CardTitle>
                          <Badge variant="outline" className="text-xs mt-1">
                            Weight: {expert.baseWeight}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-gray-600">{expert.description}</p>
                      <div>
                        <span className="text-xs font-medium text-gray-500">Relevant Asset Types:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {expert.relevantAssetTypes.map((at) => (
                            <Badge key={at} variant="secondary" className="text-xs">
                              {at.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Architecture Diagram */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm">MoE Architecture: TRELLIS + SiteSync OS</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs text-gray-600 font-mono whitespace-pre overflow-x-auto">
{`  Input (Image/Text)
        |
  [TRELLIS Model]  ── DINOv2 → Sparse Structure Flow → SLAT Flow → VAE Decoders
        |
  Raw 3D Asset (Mesh / Gaussians / Radiance Field)
        |
  [Gating Network]  ── Analyzes: asset type, project phase, LOD, constraints
        |
  ┌─────────┬─────────┬─────────┬─────────┬─────────┐
  │Structural│ Material │  Code   │  Cost   │   LOD   │
  │Grounding │Grounding │Compliance│Grounding│Refinement│
  │ Expert   │ Expert   │ Expert  │ Expert  │ Expert  │
  └────┬────┴────┬────┴────┬────┴────┬────┴────┬────┘
       │         │         │         │         │
  [Weighted Aggregator]  ── Combines expert outputs by gating weights
        |
  Grounded 3D Asset + Construction Metadata
        |
  ┌─────────────────────────────────────────────┐
  │ SiteSync OS Agent System Integration        │
  │ ├─ Agent Ecosystem Orchestrator (MoE router)│
  │ ├─ Meta-Reasoning Agent (quality check)     │
  │ ├─ Truth & Evidence Validator               │
  │ └─ Human Oversight Liaison (escalation)     │
  └─────────────────────────────────────────────┘
        |
  ┌─────────────────────────────────────────────┐
  │ Downstream Pipeline                         │
  │ ├─ Parametric Engine (LOD 100-400)          │
  │ ├─ Blender MCP (3D visualization)           │
  │ ├─ Cost Analysis (1build / Gordian)         │
  │ └─ Spatial Workbench (2D/3D plans)          │
  └─────────────────────────────────────────────┘`}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            {history.length > 0 ? (
              <div className="space-y-4">
                {history.map((h) => (
                  <Card key={h.id} className="cursor-pointer hover:border-violet-300 transition-colors"
                    onClick={() => { setResult(h); setActiveTab('results'); }}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          h.summary.overallConfidence >= 0.7 ? 'bg-green-100 text-green-600' :
                          h.summary.overallConfidence >= 0.5 ? 'bg-amber-100 text-amber-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {(h.summary.overallConfidence * 100).toFixed(0)}%
                        </div>
                        <div>
                          <div className="text-sm font-medium">{h.id}</div>
                          <div className="text-xs text-gray-500">
                            {h.trellisResult.model} | {h.metadata.expertsActivated} experts | {h.metadata.totalPipelineTimeMs}ms
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {h.summary.structurallyFeasible === true && <Badge className="bg-green-100 text-green-700">Structural OK</Badge>}
                        {h.summary.codeCompliant === true && <Badge className="bg-purple-100 text-purple-700">Code OK</Badge>}
                        {h.summary.estimatedCost && <Badge className="bg-amber-100 text-amber-700">${(h.summary.estimatedCost / 1000).toFixed(0)}K</Badge>}
                        {h.summary.criticalIssues.length > 0 && (
                          <Badge className="bg-red-100 text-red-700">{h.summary.criticalIssues.length} issues</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-500">No History</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Pipeline results will appear here after running generations
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
