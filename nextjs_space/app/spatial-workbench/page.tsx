'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { BackButton } from '@/components/ui/back-button';
import { FloorPlanViewer } from '@/components/ui/floor-plan-viewer';
import {
  Layers,
  Box,
  Grid3X3,
  Sun,
  Download,
  ArrowRight,
  Settings,
  Eye,
  FileText,
  Zap,
  Building2,
  LayoutGrid,
  Ruler,
  Palette,
  SunMedium,
  Home,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

type LODLevel = 100 | 200 | 300 | 350 | 400;

interface PipelineStage {
  stage: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  input: string;
  output: string;
}

interface FloorPlanRoom {
  id: string;
  name: string;
  type: string;
  bounds: { x: number; y: number; width: number; depth: number };
  area: number;
  adaAccessible: boolean;
}

interface FloorPlanData {
  floorNumber: number;
  height: number;
  sliceHeight: number;
  rooms: FloorPlanRoom[];
  grossArea: number;
  netArea: number;
}

interface GeneratedModel {
  id: string;
  name: string;
  lodLevel: LODLevel;
  totalArea: number;
  envelopeArea: number;
  glazingArea: number;
  solarArea: number;
  estimatedEnergyProduction: number;
  elementCount: number;
  floorPlanCount: number;
  floorPlans: FloorPlanData[];
}

const LOD_INFO: Record<number, { label: string; description: string }> = {
  100: { label: 'Conceptual', description: 'Gross area, height, volume, location' },
  200: { label: 'Schematic Design', description: 'Approximate geometry with generic materials' },
  300: { label: 'Design Development', description: 'Specific assemblies, materials, window types' },
  350: { label: 'Construction Docs', description: 'Coordination-level detail between disciplines' },
  400: { label: 'Fabrication', description: 'Shop drawing geometry and cut lists' },
};

export default function SpatialWorkbenchPage() {
  const [activeTab, setActiveTab] = useState('parametric');
  const [loading, setLoading] = useState(false);
  const [generatedModel, setGeneratedModel] = useState<GeneratedModel | null>(null);
  const [blenderScript, setBlenderScript] = useState<string | null>(null);
  const [visualizationPrompt, setVisualizationPrompt] = useState<string | null>(null);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([
    { stage: 'massing', label: 'Massing Tool', status: 'pending', input: 'Zoning / Area data', output: '3D GLB Blocks' },
    { stage: 'parametric', label: 'Parametric Engine', status: 'pending', input: 'GLB + Constraints', output: 'LOD 200-300 Model' },
    { stage: 'design-services', label: 'Design Services', status: 'pending', input: 'GLB + Aesthetic Prompts', output: 'Photorealistic Renderings' },
    { stage: 'spatial-workbench', label: 'Spatial Workbench', status: 'pending', input: 'Refined 3D Model', output: '2D Blueprints & Floor Plans' },
    { stage: 'sitesync-export', label: 'SiteSync OS Export', status: 'pending', input: 'All of the above', output: 'Construction-Ready Docs' },
  ]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    projectType: 'mixed-use' as string,
    totalFloors: 5,
    floorToFloorHeight: 3.5,
    footprintWidth: 30,
    footprintDepth: 20,
    windowToWallRatio: 0.35,
    solarCoverage: 0.3,
    facadeMaterial: 'concrete-precast',
    glazingMaterial: 'glass-curtainwall',
    roofMaterial: 'roof-tpo',
    structureMaterial: 'concrete-structural',
    sustainabilityTarget: 'LEED-Silver',
    targetLOD: 300 as LODLevel,
  });

  const handleGenerate = async () => {
    setLoading(true);
    setGeneratedModel(null);
    setBlenderScript(null);
    setVisualizationPrompt(null);

    // Animate pipeline stages
    const stagesCopy = [...pipelineStages];
    for (let i = 0; i < stagesCopy.length; i++) {
      stagesCopy[i] = { ...stagesCopy[i], status: 'in_progress' };
      setPipelineStages([...stagesCopy]);
      await new Promise((r) => setTimeout(r, 400));
      stagesCopy[i] = { ...stagesCopy[i], status: 'completed' };
      setPipelineStages([...stagesCopy]);
    }

    try {
      const res = await fetch('/api/parametric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          name: formData.name || `${formData.projectType} Building`,
          constraints: {
            projectType: formData.projectType,
            totalFloors: formData.totalFloors,
            floorToFloorHeight: formData.floorToFloorHeight,
            footprintWidth: formData.footprintWidth,
            footprintDepth: formData.footprintDepth,
            windowToWallRatio: formData.windowToWallRatio,
            solarCoverage: formData.solarCoverage,
            materials: {
              facade: formData.facadeMaterial,
              glazing: formData.glazingMaterial,
              roof: formData.roofMaterial,
              structure: formData.structureMaterial,
            },
            sustainabilityTarget: formData.sustainabilityTarget,
            accessibilityRequired: true,
            unitMix: formData.projectType !== 'commercial' ? [
              { type: 'Studio', count: 8, minArea: 400, maxArea: 500, adaAccessible: true },
              { type: '1BR', count: 12, minArea: 550, maxArea: 700 },
              { type: '2BR', count: 6, minArea: 800, maxArea: 1000 },
            ] : undefined,
          },
          targetLOD: formData.targetLOD,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedModel({
          id: data.model.id,
          name: data.model.name,
          lodLevel: data.model.lodLevel,
          totalArea: data.model.totalArea,
          envelopeArea: data.model.envelopeArea,
          glazingArea: data.model.glazingArea,
          solarArea: data.model.solarArea,
          estimatedEnergyProduction: data.model.estimatedEnergyProduction,
          elementCount: data.model.elements?.length || 0,
          floorPlanCount: data.model.floorPlans?.length || 0,
          floorPlans: data.model.floorPlans || [],
        });
        setBlenderScript(data.blenderScript);
        setVisualizationPrompt(data.visualizationPrompt);
      }
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (preset: string) => {
    const presets: Record<string, Partial<typeof formData>> = {
      'senior-living': {
        projectType: 'senior-living',
        floorToFloorHeight: 3.2,
        windowToWallRatio: 0.15,
        solarCoverage: 0.4,
        facadeMaterial: 'brick-red',
        glazingMaterial: 'glass-residential',
        sustainabilityTarget: 'LEED-Gold',
      },
      'veteran-housing': {
        projectType: 'veteran-housing',
        floorToFloorHeight: 3.0,
        windowToWallRatio: 0.2,
        solarCoverage: 0.35,
        facadeMaterial: 'cladding-fiber-cement',
        glazingMaterial: 'glass-residential',
        sustainabilityTarget: 'LEED-Silver',
      },
      'mixed-use': {
        projectType: 'mixed-use',
        floorToFloorHeight: 3.5,
        windowToWallRatio: 0.4,
        solarCoverage: 0.25,
        facadeMaterial: 'concrete-precast',
        glazingMaterial: 'glass-curtainwall',
        sustainabilityTarget: 'LEED-Silver',
      },
      commercial: {
        projectType: 'commercial',
        floorToFloorHeight: 4.0,
        windowToWallRatio: 0.55,
        solarCoverage: 0.2,
        facadeMaterial: 'metal-steel-dark',
        glazingMaterial: 'glass-curtainwall',
        sustainabilityTarget: 'LEED-Silver',
      },
    };
    if (presets[preset]) {
      setFormData((prev) => ({ ...prev, ...presets[preset] }));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <BackButton fallbackUrl="/dashboard" />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Layers className="w-8 h-8 text-indigo-600" />
            Spatial Workbench
          </h1>
          <p className="text-muted-foreground mt-1">
            Parametric building generation, 2D floor plans, and 3D deliverables
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/design-services">
            <Button variant="outline" size="sm">
              <Palette className="w-4 h-4 mr-2" />
              Design Services
            </Button>
          </Link>
          <Button variant="outline" size="sm" disabled>
            <Download className="w-4 h-4 mr-2" />
            Export GLB
          </Button>
        </div>
      </div>

      {/* Ecosystem Pipeline */}
      <Card className="mb-6 border-indigo-200 bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ecosystem Pipeline</CardTitle>
          <CardDescription>Massing to Construction-Ready Documentation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {pipelineStages.map((stage, idx) => (
              <div key={stage.stage} className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                    stage.status === 'completed'
                      ? 'bg-green-50 border-green-300 text-green-800'
                      : stage.status === 'in_progress'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-800 animate-pulse'
                      : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  {stage.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : stage.status === 'in_progress' ? (
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Box className="w-4 h-4" />
                  )}
                  <span className="font-medium">{stage.label}</span>
                </div>
                {idx < pipelineStages.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-400 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2 text-xs text-muted-foreground hidden lg:grid">
            {pipelineStages.map((stage) => (
              <div key={stage.stage}>
                <span className="font-medium">In:</span> {stage.input}
                <br />
                <span className="font-medium">Out:</span> {stage.output}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="parametric">
            <Settings className="w-4 h-4 mr-2" />
            Parametric Generator
          </TabsTrigger>
          <TabsTrigger value="floorplans">
            <LayoutGrid className="w-4 h-4 mr-2" />
            Floor Plans
          </TabsTrigger>
          <TabsTrigger value="deliverables">
            <FileText className="w-4 h-4 mr-2" />
            Deliverables
          </TabsTrigger>
        </TabsList>

        {/* PARAMETRIC GENERATOR TAB */}
        <TabsContent value="parametric">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Configuration Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Presets */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Project Type Presets</CardTitle>
                  <CardDescription>Apply pre-configured parametric constraints</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { key: 'senior-living', label: 'Senior Living', icon: Home },
                      { key: 'veteran-housing', label: 'Veteran Housing', icon: Building2 },
                      { key: 'mixed-use', label: 'Mixed-Use', icon: Layers },
                      { key: 'commercial', label: 'Commercial', icon: Building2 },
                    ].map((preset) => {
                      const Icon = preset.icon;
                      return (
                        <button
                          key={preset.key}
                          onClick={() => handleApplyPreset(preset.key)}
                          className={`p-3 rounded-lg border text-left hover:shadow-md transition-shadow ${
                            formData.projectType === preset.key
                              ? 'border-indigo-400 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon className="w-5 h-5 mb-1 text-indigo-600" />
                          <div className="text-sm font-medium">{preset.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Building Dimensions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Ruler className="w-4 h-4" />
                    Building Dimensions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Building Name</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Columbus Housing Project"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Target LOD</Label>
                      <Select
                        value={String(formData.targetLOD)}
                        onValueChange={(v) => setFormData({ ...formData, targetLOD: parseInt(v) as LODLevel })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(LOD_INFO).map(([level, info]) => (
                            <SelectItem key={level} value={level}>
                              LOD {level} - {info.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Floors</Label>
                      <Input
                        type="number"
                        value={formData.totalFloors}
                        onChange={(e) => setFormData({ ...formData, totalFloors: parseInt(e.target.value) || 1 })}
                        min={1}
                        max={80}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Floor Height (m)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.floorToFloorHeight}
                        onChange={(e) => setFormData({ ...formData, floorToFloorHeight: parseFloat(e.target.value) || 3 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Width (m)</Label>
                      <Input
                        type="number"
                        value={formData.footprintWidth}
                        onChange={(e) => setFormData({ ...formData, footprintWidth: parseInt(e.target.value) || 10 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Depth (m)</Label>
                      <Input
                        type="number"
                        value={formData.footprintDepth}
                        onChange={(e) => setFormData({ ...formData, footprintDepth: parseInt(e.target.value) || 10 })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Envelope & Sustainability */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <SunMedium className="w-4 h-4" />
                    Envelope & Sustainability
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center justify-between">
                      <span>Window-to-Wall Ratio</span>
                      <span className="font-mono text-sm text-muted-foreground">
                        {Math.round(formData.windowToWallRatio * 100)}%
                      </span>
                    </Label>
                    <Slider
                      value={[formData.windowToWallRatio * 100]}
                      onValueChange={([v]) => setFormData({ ...formData, windowToWallRatio: v / 100 })}
                      min={5}
                      max={80}
                      step={1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Senior living typically 15%; Commercial up to 60%
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center justify-between">
                      <span>Solar Panel Roof Coverage</span>
                      <span className="font-mono text-sm text-muted-foreground">
                        {Math.round(formData.solarCoverage * 100)}%
                      </span>
                    </Label>
                    <Slider
                      value={[formData.solarCoverage * 100]}
                      onValueChange={([v]) => setFormData({ ...formData, solarCoverage: v / 100 })}
                      min={0}
                      max={80}
                      step={1}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Sustainability Target</Label>
                      <Select
                        value={formData.sustainabilityTarget}
                        onValueChange={(v) => setFormData({ ...formData, sustainabilityTarget: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LEED-Silver">LEED Silver</SelectItem>
                          <SelectItem value="LEED-Gold">LEED Gold</SelectItem>
                          <SelectItem value="LEED-Platinum">LEED Platinum</SelectItem>
                          <SelectItem value="PassiveHouse">Passive House</SelectItem>
                          <SelectItem value="NetZero">Net Zero</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Materials */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Material Selection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Facade</Label>
                      <Select
                        value={formData.facadeMaterial}
                        onValueChange={(v) => setFormData({ ...formData, facadeMaterial: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="concrete-structural">Structural Concrete</SelectItem>
                          <SelectItem value="concrete-precast">Precast Concrete Panel</SelectItem>
                          <SelectItem value="brick-red">Red Brick</SelectItem>
                          <SelectItem value="metal-steel-dark">Dark Steel Cladding</SelectItem>
                          <SelectItem value="wood-clt">Cross-Laminated Timber</SelectItem>
                          <SelectItem value="cladding-fiber-cement">Fiber Cement Board</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Glazing</Label>
                      <Select
                        value={formData.glazingMaterial}
                        onValueChange={(v) => setFormData({ ...formData, glazingMaterial: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="glass-curtainwall">Curtain Wall Glass</SelectItem>
                          <SelectItem value="glass-residential">Residential Window Glass</SelectItem>
                          <SelectItem value="solar-bipv">Building-Integrated PV</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                size="lg"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Generating Parametric Model...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Generate Parametric Model
                  </>
                )}
              </Button>
            </div>

            {/* Results Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Quick Calculations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Height</span>
                    <span className="font-medium">
                      {(formData.totalFloors * formData.floorToFloorHeight).toFixed(1)} m
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross Floor Area</span>
                    <span className="font-medium">
                      {(formData.footprintWidth * formData.footprintDepth * formData.totalFloors).toLocaleString()} m²
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Facade Envelope</span>
                    <span className="font-medium">
                      {(
                        2 *
                        (formData.footprintWidth + formData.footprintDepth) *
                        formData.totalFloors *
                        formData.floorToFloorHeight
                      ).toLocaleString()}{' '}
                      m²
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Glazing Area</span>
                    <span className="font-medium">
                      {(
                        2 *
                        (formData.footprintWidth + formData.footprintDepth) *
                        formData.totalFloors *
                        formData.floorToFloorHeight *
                        formData.windowToWallRatio
                      ).toFixed(0)}{' '}
                      m²
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Solar Roof Area</span>
                    <span className="font-medium">
                      {(formData.footprintWidth * formData.footprintDepth * formData.solarCoverage * 0.8).toFixed(0)} m²
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Generated Model Results */}
              {generatedModel && (
                <Card className="border-green-200 bg-green-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      Model Generated
                    </CardTitle>
                    <CardDescription>{generatedModel.name}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <Badge className="bg-indigo-100 text-indigo-800">
                      LOD {generatedModel.lodLevel}
                    </Badge>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Elements</span>
                      <span className="font-bold">{generatedModel.elementCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Floor Plans</span>
                      <span className="font-bold">{generatedModel.floorPlanCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Area</span>
                      <span className="font-bold">{generatedModel.totalArea.toLocaleString()} m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Solar Area</span>
                      <span className="font-bold">{generatedModel.solarArea.toFixed(0)} m²</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Est. Energy</span>
                      <span className="font-bold text-green-700">
                        {(generatedModel.estimatedEnergyProduction / 1000).toFixed(0)} MWh/yr
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* LOD Reference */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">LOD Reference</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(LOD_INFO).map(([level, info]) => (
                    <div
                      key={level}
                      className={`p-2 rounded text-sm ${
                        formData.targetLOD === parseInt(level) ? 'bg-indigo-50 border border-indigo-200' : ''
                      }`}
                    >
                      <div className="font-medium">
                        LOD {level} - {info.label}
                      </div>
                      <div className="text-xs text-muted-foreground">{info.description}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* FLOOR PLANS TAB */}
        <TabsContent value="floorplans">
          <div className="space-y-6">
            {generatedModel && generatedModel.floorPlans.length > 0 ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {generatedModel.floorPlans.map((floorPlan) => (
                    <Card key={floorPlan.floorNumber}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span>Floor {floorPlan.floorNumber}</span>
                          <Badge variant="outline" className="font-normal">
                            {floorPlan.floorNumber === 1 && formData.projectType === 'mixed-use'
                              ? 'Lobby + Retail'
                              : `${floorPlan.rooms.length} rooms`}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {floorPlan.grossArea.toFixed(0)} m² gross | {floorPlan.netArea.toFixed(0)} m² net | Height: {floorPlan.height.toFixed(1)} m
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <FloorPlanViewer
                          floor={floorPlan}
                          buildingWidth={formData.footprintWidth}
                          buildingDepth={formData.footprintDepth}
                          floorHeight={formData.floorToFloorHeight}
                          projectType={formData.projectType}
                          buildingName={generatedModel.name}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <LayoutGrid className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-muted-foreground mb-4">
                    Generate a parametric model first to view floor plans
                  </p>
                  <Button variant="outline" onClick={() => setActiveTab('parametric')}>
                    Go to Parametric Generator
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* DELIVERABLES TAB */}
        <TabsContent value="deliverables">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Blender Script */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Box className="w-5 h-5 text-orange-600" />
                  Blender Python Script
                </CardTitle>
                <CardDescription>
                  Execute in Blender via MCP or paste into Blender scripting console
                </CardDescription>
              </CardHeader>
              <CardContent>
                {blenderScript ? (
                  <div className="space-y-3">
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-80 font-mono">
                      {blenderScript.slice(0, 2000)}
                      {blenderScript.length > 2000 && '\n\n... (truncated)'}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(blenderScript)}
                    >
                      Copy Full Script
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Box className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Generate a model to get Blender script</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Visualization Prompt */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-5 h-5 text-purple-600" />
                  AI Visualization Prompt
                </CardTitle>
                <CardDescription>
                  Use with image-to-image or geometry-to-render AI pipelines
                </CardDescription>
              </CardHeader>
              <CardContent>
                {visualizationPrompt ? (
                  <div className="space-y-3">
                    <div className="bg-purple-50 p-4 rounded-lg text-sm">
                      {visualizationPrompt}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(visualizationPrompt)}
                    >
                      Copy Prompt
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Generate a model to get visualization prompt</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Download className="w-5 h-5 text-blue-600" />
                  Export & Integration
                </CardTitle>
                <CardDescription>Push deliverables to other SiteSync OS modules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Link href="/design-services/new">
                    <div className="p-4 rounded-lg border hover:shadow-md transition-shadow">
                      <Palette className="w-6 h-6 text-purple-600 mb-2" />
                      <h4 className="font-semibold text-sm">Push to Design Services</h4>
                      <p className="text-xs text-muted-foreground">
                        Apply high-fidelity textures, lighting & landscaping
                      </p>
                    </div>
                  </Link>
                  <div className="p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer opacity-80">
                    <FileText className="w-6 h-6 text-blue-600 mb-2" />
                    <h4 className="font-semibold text-sm">Export 2D Permit Set</h4>
                    <p className="text-xs text-muted-foreground">
                      Floor plans, elevations & sections for permit review
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer opacity-80">
                    <Building2 className="w-6 h-6 text-green-600 mb-2" />
                    <h4 className="font-semibold text-sm">Export to Revit / Rhino</h4>
                    <p className="text-xs text-muted-foreground">
                      GLB / IFC compatible geometry for BIM tools
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
