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

type DesignPromptMode = 'conceptual' | 'technical' | 'materials' | 'sustainability' | 'layout';

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: DesignPromptMode;
  parametricSuggestions?: Record<string, unknown>;
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

const DESIGN_PROMPT_MODES: { key: DesignPromptMode; label: string; icon: React.ElementType; description: string }[] = [
  { key: 'conceptual', label: 'Conceptual', icon: Lightbulb, description: 'Vision & spatial relationships' },
  { key: 'technical', label: 'Technical', icon: Wrench, description: 'Dimensions & specifications' },
  { key: 'materials', label: 'Materials', icon: Palette, description: 'Finishes & assemblies' },
  { key: 'sustainability', label: 'Sustainability', icon: Leaf, description: 'Energy & certification' },
  { key: 'layout', label: 'Layout', icon: LayoutDashboard, description: 'Floor plans & circulation' },
];

const EXAMPLE_PROMPTS = [
  "Design a modern 8-story senior living facility with abundant natural light, communal spaces on each floor, and rooftop garden access.",
  "Create a sustainable mixed-use building with retail on ground floor, offices above, targeting LEED Platinum certification.",
  "I need a veteran housing project with 60 units, emphasizing accessibility, community gathering areas, and trauma-informed design principles.",
  "Propose facade materials for a coastal commercial building that can withstand salt air while maintaining a contemporary aesthetic.",
  "Optimize a 5-story residential floor plan for efficiency with double-loaded corridors and maximize natural ventilation.",
];

export default function SpatialWorkbenchPage() {
  const [activeTab, setActiveTab] = useState('ai-design');
  const [loading, setLoading] = useState(false);
  const [generatedModel, setGeneratedModel] = useState<GeneratedModel | null>(null);
  
  // AI Design Prompt state
  const [promptInput, setPromptInput] = useState('');
  const [promptMode, setPromptMode] = useState<DesignPromptMode>('conceptual');
  const [promptLoading, setPromptLoading] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [pendingSuggestions, setPendingSuggestions] = useState<ParametricSuggestions | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation]);

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

  // AI Design Prompt handlers
  const handleSendPrompt = async () => {
    if (!promptInput.trim() || promptLoading) return;

    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: promptInput.trim(),
      mode: promptMode,
      timestamp: new Date().toISOString(),
    };

    setConversation((prev) => [...prev, userMessage]);
    setPromptInput('');
    setPromptLoading(true);

    try {
      const response = await fetch('/api/ai/design-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage.content,
          mode: promptMode,
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
              facadeMaterial: formData.facadeMaterial,
              glazingMaterial: formData.glazingMaterial,
              sustainabilityTarget: formData.sustainabilityTarget,
            },
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: ConversationMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          mode: data.mode,
          parametricSuggestions: data.parametricSuggestions,
          timestamp: data.timestamp,
        };

        setConversation((prev) => [...prev, assistantMessage]);

        if (data.parametricSuggestions) {
          setPendingSuggestions(data.parametricSuggestions);
        }
      } else {
        const errorMessage: ConversationMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'I apologize, but I encountered an error processing your request. Please try again.',
          timestamp: new Date().toISOString(),
        };
        setConversation((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Prompt error:', error);
      const errorMessage: ConversationMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Unable to connect to the design AI. Please check your connection and try again.',
        timestamp: new Date().toISOString(),
      };
      setConversation((prev) => [...prev, errorMessage]);
    } finally {
      setPromptLoading(false);
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

  const handleClearConversation = () => {
    setConversation([]);
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

        {/* AI DESIGN PROMPT TAB */}
        <TabsContent value="ai-design">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Chat Interface */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        Design Intelligence
                      </CardTitle>
                      <CardDescription>
                        Describe your architectural vision and get AI-powered design guidance
                      </CardDescription>
                    </div>
                    {conversation.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={handleClearConversation}>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Clear
                      </Button>
                    )}
                  </div>
                </CardHeader>
                
                {/* Conversation Area */}
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                  {conversation.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center mb-4">
                        <Sparkles className="w-8 h-8 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">AI-Powered Architectural Design</h3>
                      <p className="text-muted-foreground text-sm mb-6 max-w-md">
                        Describe your ideal building, spatial requirements, or design preferences. 
                        The AI will provide expert guidance and can suggest parametric settings for generation.
                      </p>
                      <div className="space-y-2 w-full max-w-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Try an example</p>
                        <div className="space-y-2">
                          {EXAMPLE_PROMPTS.slice(0, 3).map((example, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleExamplePrompt(example)}
                              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-colors text-sm"
                            >
                              <ChevronRight className="w-4 h-4 inline mr-2 text-purple-500" />
                              {example.length > 90 ? example.substring(0, 90) + '...' : example}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {conversation.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-lg p-3 ${
                              message.role === 'user'
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            {message.role === 'user' && message.mode && (
                              <Badge variant="secondary" className="mb-2 bg-white/20 text-white text-xs">
                                {DESIGN_PROMPT_MODES.find(m => m.key === message.mode)?.label}
                              </Badge>
                            )}
                            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                            {message.parametricSuggestions && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <p className="text-xs font-medium mb-2 flex items-center gap-1">
                                  <Zap className="w-3 h-3" />
                                  Suggested Parameters Available
                                </p>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={handleApplySuggestions}
                                  className="w-full"
                                >
                                  Apply to Generator
                                  <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {promptLoading && (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Analyzing your design request...
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </>
                  )}
                </CardContent>

                {/* Input Area */}
                <div className="p-4 border-t bg-gray-50/50">
                  <div className="flex gap-2 mb-3">
                    {DESIGN_PROMPT_MODES.map((mode) => {
                      const Icon = mode.icon;
                      return (
                        <button
                          key={mode.key}
                          onClick={() => setPromptMode(mode.key)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            promptMode === mode.key
                              ? 'bg-purple-100 text-purple-700 border border-purple-300'
                              : 'bg-white border border-gray-200 hover:border-gray-300 text-gray-600'
                          }`}
                          title={mode.description}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {mode.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      placeholder="Describe your architectural vision, design requirements, or ask for guidance..."
                      className="min-h-[60px] max-h-[120px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendPrompt();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendPrompt}
                      disabled={!promptInput.trim() || promptLoading}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-4"
                    >
                      {promptLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Pending Suggestions */}
              {pendingSuggestions && (
                <Card className="border-purple-200 bg-purple-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="w-5 h-5 text-purple-600" />
                      AI Suggestions
                    </CardTitle>
                    <CardDescription>Ready to apply to the Parametric Generator</CardDescription>
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
                  <CardTitle className="text-base">Current Context</CardTitle>
                  <CardDescription>AI uses these settings as context</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Project Type</span>
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
                    <span className="text-muted-foreground">WWR</span>
                    <span className="font-medium">{Math.round(formData.windowToWallRatio * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target</span>
                    <Badge variant="outline">{formData.sustainabilityTarget}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* More Examples */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Example Prompts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {EXAMPLE_PROMPTS.map((example, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleExamplePrompt(example)}
                      className="w-full text-left p-2 rounded border border-gray-200 hover:border-purple-300 hover:bg-purple-50/30 transition-colors text-xs text-muted-foreground"
                    >
                      {example.length > 60 ? example.substring(0, 60) + '...' : example}
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
