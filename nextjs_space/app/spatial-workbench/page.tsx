'use client';

import { useState, useRef, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { BackButton } from '@/components/ui/back-button';
import { FloorPlanViewer } from '@/components/ui/floor-plan-viewer';
import {
  Layers,
  Download,
  Settings,
  Zap,
  Building2,
  LayoutGrid,
  Ruler,
  Palette,
  SunMedium,
  Home,
  CheckCircle2,
  Sparkles,
  Send,
  Loader2,
  RefreshCw,
  ChevronRight,
  Lightbulb,
  Leaf,
  Wrench,
  LayoutDashboard,
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

type DesignStyle = 'photorealistic' | 'architectural-render' | 'sketch' | 'blueprint' | '3d-visualization';

interface GeneratedDesign {
  id: string;
  prompt: string;
  analysis: string;
  keyElements: string[];
  imageUrl: string | null;
  imageError?: string;
  style: DesignStyle;
  parametricSuggestions?: ParametricSuggestions | null;
  timestamp: string;
}

interface ParametricSuggestions {
  projectType?: string;
  totalFloors?: number;
  floorToFloorHeight?: number;
  footprintWidth?: number;
  footprintDepth?: number;
  windowToWallRatio?: number;
  solarCoverage?: number;
  facadeMaterial?: string;
  glazingMaterial?: string;
  sustainabilityTarget?: string;
}

const LOD_INFO: Record<number, { label: string; description: string }> = {
  100: { label: 'Conceptual', description: 'Gross area, height, volume, location' },
  200: { label: 'Schematic Design', description: 'Approximate geometry with generic materials' },
  300: { label: 'Design Development', description: 'Specific assemblies, materials, window types' },
  350: { label: 'Construction Docs', description: 'Coordination-level detail between disciplines' },
  400: { label: 'Fabrication', description: 'Shop drawing geometry and cut lists' },
};

const DESIGN_STYLES: { key: DesignStyle; label: string; icon: React.ElementType; description: string }[] = [
  { key: 'photorealistic', label: 'Photorealistic', icon: SunMedium, description: 'Photo-quality renders' },
  { key: 'architectural-render', label: 'Render', icon: Building2, description: 'Professional visualization' },
  { key: 'sketch', label: 'Sketch', icon: Lightbulb, description: 'Concept drawings' },
  { key: 'blueprint', label: 'Blueprint', icon: LayoutDashboard, description: 'Technical drawings' },
  { key: '3d-visualization', label: '3D Model', icon: Layers, description: 'Isometric view' },
];

const EXAMPLE_PROMPTS = [
  "A modern 8-story senior living facility with floor-to-ceiling windows, rooftop gardens, and warm brick facade with contemporary metal accents",
  "Sustainable mixed-use building with green roof, solar panels, glass curtain wall ground floor retail, and residential units above",
  "Contemporary veteran housing complex featuring accessible ramps, community courtyard, memorial garden, and welcoming entrance canopy",
  "Luxury coastal commercial tower with hurricane-resistant glass, white concrete facade, oceanfront terraces, and yacht club at base",
  "Urban residential tower with stacked balconies, vertical gardens, rooftop pool, and modern minimalist concrete and glass design",
];

export default function SpatialWorkbenchPage() {
  const [activeTab, setActiveTab] = useState('ai-design');
  const [loading, setLoading] = useState(false);
  const [generatedModel, setGeneratedModel] = useState<GeneratedModel | null>(null);
  
  // AI Design Image Generation state
  const [promptInput, setPromptInput] = useState('');
  const [designStyle, setDesignStyle] = useState<DesignStyle>('architectural-render');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDesigns, setGeneratedDesigns] = useState<GeneratedDesign[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<GeneratedDesign | null>(null);
  const [pendingSuggestions, setPendingSuggestions] = useState<ParametricSuggestions | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest design
  useEffect(() => {
    if (galleryRef.current && generatedDesigns.length > 0) {
      galleryRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [generatedDesigns.length]);

  // Pipeline stages run as backdrop function during generation
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

    // Animate pipeline stages (backdrop function)
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

  // AI Design Image Generation handlers
  const handleGenerateDesign = async () => {
    if (!promptInput.trim() || isGenerating) return;

    const currentPrompt = promptInput.trim();
    setPromptInput('');
    setIsGenerating(true);

    try {
      const response = await fetch('/api/ai/design-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentPrompt,
          style: designStyle,
          generateImage: true,
          context: {
            projectType: formData.projectType,
            buildingName: formData.name,
            constraints: {
              totalFloors: formData.totalFloors,
              floorToFloorHeight: formData.floorToFloorHeight,
              footprintWidth: formData.footprintWidth,
              footprintDepth: formData.footprintDepth,
              windowToWallRatio: formData.windowToWallRatio,
              solarCoverage: formData.solarCoverage,
              sustainabilityTarget: formData.sustainabilityTarget,
            },
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newDesign: GeneratedDesign = {
          id: `design-${Date.now()}`,
          prompt: currentPrompt,
          analysis: data.analysis || '',
          keyElements: data.keyElements || [],
          imageUrl: data.imageUrl,
          imageError: data.imageError,
          style: data.style || designStyle,
          parametricSuggestions: data.parametricSuggestions,
          timestamp: data.timestamp || new Date().toISOString(),
        };

        setGeneratedDesigns((prev) => [newDesign, ...prev]);
        setSelectedDesign(newDesign);

        if (data.parametricSuggestions) {
          setPendingSuggestions(data.parametricSuggestions);
        }
      } else {
        const errorDesign: GeneratedDesign = {
          id: `error-${Date.now()}`,
          prompt: currentPrompt,
          analysis: 'Failed to generate design. Please try again.',
          keyElements: [],
          imageUrl: null,
          imageError: 'Generation failed',
          style: designStyle,
          timestamp: new Date().toISOString(),
        };
        setGeneratedDesigns((prev) => [errorDesign, ...prev]);
      }
    } catch (error) {
      console.error('Design generation error:', error);
      const errorDesign: GeneratedDesign = {
        id: `error-${Date.now()}`,
        prompt: currentPrompt,
        analysis: 'Unable to connect to the design AI. Please check your connection.',
        keyElements: [],
        imageUrl: null,
        imageError: 'Connection error',
        style: designStyle,
        timestamp: new Date().toISOString(),
      };
      setGeneratedDesigns((prev) => [errorDesign, ...prev]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplySuggestions = () => {
    if (!pendingSuggestions) return;

    const updates: Partial<typeof formData> = {};
    
    if (pendingSuggestions.projectType) updates.projectType = pendingSuggestions.projectType;
    if (pendingSuggestions.totalFloors) updates.totalFloors = pendingSuggestions.totalFloors;
    if (pendingSuggestions.floorToFloorHeight) updates.floorToFloorHeight = pendingSuggestions.floorToFloorHeight;
    if (pendingSuggestions.footprintWidth) updates.footprintWidth = pendingSuggestions.footprintWidth;
    if (pendingSuggestions.footprintDepth) updates.footprintDepth = pendingSuggestions.footprintDepth;
    if (pendingSuggestions.windowToWallRatio) updates.windowToWallRatio = pendingSuggestions.windowToWallRatio;
    if (pendingSuggestions.solarCoverage) updates.solarCoverage = pendingSuggestions.solarCoverage;
    if (pendingSuggestions.facadeMaterial) updates.facadeMaterial = pendingSuggestions.facadeMaterial;
    if (pendingSuggestions.glazingMaterial) updates.glazingMaterial = pendingSuggestions.glazingMaterial;
    if (pendingSuggestions.sustainabilityTarget) updates.sustainabilityTarget = pendingSuggestions.sustainabilityTarget;

    setFormData((prev) => ({ ...prev, ...updates }));
    setPendingSuggestions(null);
    setActiveTab('parametric');
  };

  const handleClearDesigns = () => {
    setGeneratedDesigns([]);
    setSelectedDesign(null);
    setPendingSuggestions(null);
  };

  const handleExamplePrompt = (example: string) => {
    setPromptInput(example);
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

      {/* Ecosystem Pipeline - Hidden (runs as backdrop function) */}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="ai-design">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Design Prompt
          </TabsTrigger>
          <TabsTrigger value="parametric">
            <Settings className="w-4 h-4 mr-2" />
            Parametric Generator
          </TabsTrigger>
          <TabsTrigger value="floorplans">
            <LayoutGrid className="w-4 h-4 mr-2" />
            Floor Plans
          </TabsTrigger>
        </TabsList>

        {/* AI DESIGN IMAGE GENERATION TAB */}
        <TabsContent value="ai-design">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Design Generator */}
            <div className="lg:col-span-2 space-y-4">
              {/* Input Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        Design Intelligence
                      </CardTitle>
                      <CardDescription>
                        Describe your architectural vision and generate design imagery
                      </CardDescription>
                    </div>
                    {generatedDesigns.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={handleClearDesigns}>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Clear All
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Style Selector */}
                  <div>
                    <Label className="text-sm mb-2 block">Visualization Style</Label>
                    <div className="flex flex-wrap gap-2">
                      {DESIGN_STYLES.map((style) => {
                        const Icon = style.icon;
                        return (
                          <button
                            key={style.key}
                            onClick={() => setDesignStyle(style.key)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              designStyle === style.key
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                            title={style.description}
                          >
                            <Icon className="w-4 h-4" />
                            {style.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Prompt Input */}
                  <div>
                    <Label className="text-sm mb-2 block">Design Description</Label>
                    <Textarea
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      placeholder="Describe the building you want to visualize... e.g., 'A modern 10-story residential tower with glass curtain walls, green terraces on every third floor, and a rooftop garden with solar panels'"
                      className="min-h-[100px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          e.preventDefault();
                          handleGenerateDesign();
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Press Ctrl+Enter to generate</p>
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerateDesign}
                    disabled={!promptInput.trim() || isGenerating}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating Design...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Design
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Generated Designs Gallery */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Generated Designs</CardTitle>
                  <CardDescription>
                    {generatedDesigns.length === 0
                      ? 'Your generated designs will appear here'
                      : `${generatedDesigns.length} design${generatedDesigns.length > 1 ? 's' : ''} generated`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {generatedDesigns.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-10 h-10 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No Designs Yet</h3>
                      <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                        Describe your architectural vision above and click Generate to create design visualizations.
                      </p>
                      <div className="space-y-2 max-w-lg mx-auto">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Quick Start Examples</p>
                        {EXAMPLE_PROMPTS.slice(0, 3).map((example, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleExamplePrompt(example)}
                            className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-colors text-sm"
                          >
                            <ChevronRight className="w-4 h-4 inline mr-2 text-purple-500" />
                            {example.length > 80 ? example.substring(0, 80) + '...' : example}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div ref={galleryRef} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
                      {generatedDesigns.map((design) => (
                        <div
                          key={design.id}
                          className={`relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                            selectedDesign?.id === design.id
                              ? 'border-purple-500 shadow-lg'
                              : 'border-gray-200 hover:border-purple-300'
                          }`}
                          onClick={() => setSelectedDesign(design)}
                        >
                          {/* Image or Placeholder */}
                          <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 relative">
                            {design.imageUrl ? (
                              <img
                                src={design.imageUrl}
                                alt={design.prompt}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                {design.imageError ? (
                                  <>
                                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
                                      <Sparkles className="w-6 h-6 text-red-500" />
                                    </div>
                                    <p className="text-sm text-red-600 text-center">{design.imageError}</p>
                                  </>
                                ) : (
                                  <>
                                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-2" />
                                    <p className="text-sm text-muted-foreground">Generating...</p>
                                  </>
                                )}
                              </div>
                            )}
                            {/* Style Badge */}
                            <Badge className="absolute top-2 right-2 bg-black/60 text-white text-xs">
                              {DESIGN_STYLES.find(s => s.key === design.style)?.label || design.style}
                            </Badge>
                          </div>
                          {/* Info */}
                          <div className="p-3 bg-white">
                            <p className="text-sm font-medium line-clamp-2 mb-1">{design.prompt}</p>
                            {design.analysis && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{design.analysis}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Selected Design Details */}
              {selectedDesign && (
                <Card className="border-purple-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-purple-600" />
                      Selected Design
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedDesign.imageUrl && (
                      <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={selectedDesign.imageUrl}
                          alt={selectedDesign.prompt}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-muted-foreground">Prompt</Label>
                      <p className="text-sm">{selectedDesign.prompt}</p>
                    </div>
                    {selectedDesign.analysis && (
                      <div>
                        <Label className="text-xs text-muted-foreground">AI Analysis</Label>
                        <p className="text-sm">{selectedDesign.analysis}</p>
                      </div>
                    )}
                    {selectedDesign.keyElements.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Key Elements</Label>
                        <div className="flex flex-wrap gap-1">
                          {selectedDesign.keyElements.map((el, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {el}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedDesign.imageUrl && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(selectedDesign.imageUrl!, '_blank')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Image
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Pending Suggestions */}
              {pendingSuggestions && (
                <Card className="border-purple-200 bg-purple-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="w-5 h-5 text-purple-600" />
                      AI Suggestions
                    </CardTitle>
                    <CardDescription>Apply to Parametric Generator</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {Object.entries(pendingSuggestions).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <span className="font-medium">
                          {typeof value === 'number' && value < 1 && value > 0
                            ? `${Math.round(value * 100)}%`
                            : String(value)}
                        </span>
                      </div>
                    ))}
                    <Button
                      onClick={handleApplySuggestions}
                      className="w-full mt-4 bg-gradient-to-r from-purple-600 to-indigo-600"
                    >
                      Apply & Go to Generator
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Current Context */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Project Context</CardTitle>
                  <CardDescription>Used for design context</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant="outline" className="capitalize">
                      {formData.projectType.replace(/-/g, ' ')}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Floors</span>
                    <span className="font-medium">{formData.totalFloors}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Footprint</span>
                    <span className="font-medium">{formData.footprintWidth}m × {formData.footprintDepth}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Certification</span>
                    <Badge variant="outline">{formData.sustainabilityTarget}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Example Prompts */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Design Ideas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {EXAMPLE_PROMPTS.map((example, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleExamplePrompt(example)}
                      className="w-full text-left p-2 rounded border border-gray-200 hover:border-purple-300 hover:bg-purple-50/30 transition-colors text-xs text-muted-foreground"
                    >
                      {example.length > 55 ? example.substring(0, 55) + '...' : example}
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

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

      </Tabs>
    </div>
  );
}
