'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Layers,
  Play,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  Code,
  FileJson,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Eye,
  Copy,
  Info,
  History,
  Plus,
  Trash2,
} from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface RoomSpec {
  name: string;
  width: number;
  length: number;
  height?: number;
  position?: { x: number; y: number; z: number };
}

interface LevelSpec {
  name: string;
  elevation: number;
  rooms: RoomSpec[];
}

interface LayoutSpec {
  levels: LevelSpec[];
  globalDefaults: {
    wallThickness: number;
    ceilingHeight: number;
  };
}

interface SpatialModel {
  spatial_model_id: string;
  status: string;
  engine: string;
  warnings: string[];
  assumptions: string[];
  artifacts: Array<{
    artifact_type: string;
    uri: string;
    content_type: string;
    inline_content?: string;
  }>;
  audit: {
    trace_id: string;
    created_at: string;
  };
}

interface Project {
  id: string;
  name: string;
  projectNumber: string;
}

const DEFAULT_LAYOUT: LayoutSpec = {
  levels: [
    {
      name: 'Ground Floor',
      elevation: 0,
      rooms: [
        { name: 'Living Room', width: 6, length: 8, height: 3 },
        { name: 'Kitchen', width: 4, length: 5, height: 3 },
        { name: 'Bedroom 1', width: 4, length: 5, height: 3 },
      ],
    },
  ],
  globalDefaults: {
    wallThickness: 0.15,
    ceilingHeight: 2.7,
  },
};

export default function SpatialWorkbenchPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  
  // State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const [targetEngine, setTargetEngine] = useState<'threejs' | 'babylonjs' | 'unity_csharp'>('threejs');
  const [layoutSpec, setLayoutSpec] = useState<LayoutSpec>(DEFAULT_LAYOUT);
  const [layoutJson, setLayoutJson] = useState<string>(JSON.stringify(DEFAULT_LAYOUT, null, 2));
  const [iterationInstructions, setIterationInstructions] = useState<string>('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isIterating, setIsIterating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [currentModel, setCurrentModel] = useState<SpatialModel | null>(null);
  const [sceneCode, setSceneCode] = useState<string>('');
  const [showCode, setShowCode] = useState(false);
  const [modelHistory, setModelHistory] = useState<Array<{ id: string; version: number; createdAt: string }>>([]);
  
  const viewerRef = useRef<HTMLIFrameElement>(null);
  
  // Fetch projects
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/projects')
        .then(res => res.json())
        .then(data => {
          if (data.projects) {
            setProjects(data.projects);
          }
        })
        .catch(err => console.error('Failed to fetch projects:', err));
    }
  }, [status]);
  
  // Parse JSON when textarea changes
  const handleLayoutJsonChange = (value: string) => {
    setLayoutJson(value);
    try {
      const parsed = JSON.parse(value);
      setLayoutSpec(parsed);
    } catch {
      // Invalid JSON, don't update layoutSpec
    }
  };
  
  // Generate scene HTML for iframe
  const generateViewerHtml = useCallback((code: string) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; overflow: hidden; background: #1a1a2e; }
    canvas { display: block; }
    #info {
      position: absolute;
      top: 10px;
      left: 10px;
      color: #fff;
      font-family: system-ui, sans-serif;
      font-size: 12px;
      background: rgba(0,0,0,0.5);
      padding: 8px 12px;
      border-radius: 4px;
    }
    #disclaimer {
      position: absolute;
      bottom: 10px;
      left: 10px;
      right: 10px;
      color: #ff6b6b;
      font-family: system-ui, sans-serif;
      font-size: 10px;
      background: rgba(0,0,0,0.7);
      padding: 6px 10px;
      border-radius: 4px;
      text-align: center;
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
</head>
<body>
  <div id="info">Orbit: drag | Pan: right-click drag | Zoom: scroll</div>
  <div id="disclaimer">⚠️ AI-GENERATED PREVIEW | NOT FOR CONSTRUCTION | NON-AUTHORITATIVE</div>
  <script>
    try {
      ${code}
    } catch (e) {
      console.error('Scene error:', e);
      document.body.innerHTML = '<div style="color:#fff;padding:20px;font-family:system-ui;"><h3>Error rendering scene</h3><pre>' + e.message + '</pre></div>';
    }
  </script>
</body>
</html>
`;
  }, []);
  
  // Update viewer
  const updateViewer = useCallback((code: string) => {
    if (viewerRef.current) {
      const html = generateViewerHtml(code);
      viewerRef.current.srcdoc = html;
    }
  }, [generateViewerHtml]);
  
  // Generate scene
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/integrations/kimi/v1/scene/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProjectId || undefined,
          units,
          target_engine: targetEngine,
          layout_spec: layoutSpec,
          generation_constraints: {
            maxPolygonsHint: 200000,
            materialsSimple: true,
            requireCompleteRunnableCode: true,
          },
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Generation failed');
      }
      
      setCurrentModel(data);
      
      // Extract scene code
      const codeArtifact = data.artifacts?.find((a: { artifact_type: string }) => a.artifact_type === 'scene_code');
      if (codeArtifact?.inline_content) {
        setSceneCode(codeArtifact.inline_content);
        updateViewer(codeArtifact.inline_content);
      }
      
      toast.success('Scene generated successfully!', {
        description: `Model ID: ${data.spatial_model_id}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Generation failed', { description: message });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Iterate scene
  const handleIterate = async () => {
    if (!currentModel || !iterationInstructions.trim()) {
      toast.error('Please enter iteration instructions');
      return;
    }
    
    setIsIterating(true);
    try {
      const response = await fetch('/api/integrations/kimi/v1/scene/iterate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProjectId || undefined,
          spatial_model_id: currentModel.spatial_model_id,
          iteration_instructions: iterationInstructions,
          target_engine: targetEngine,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Iteration failed');
      }
      
      // Save previous model to history
      setModelHistory(prev => [
        { id: currentModel.spatial_model_id, version: prev.length + 1, createdAt: currentModel.audit.created_at },
        ...prev,
      ]);
      
      setCurrentModel(data);
      setIterationInstructions('');
      
      // Extract scene code
      const codeArtifact = data.artifacts?.find((a: { artifact_type: string }) => a.artifact_type === 'scene_code');
      if (codeArtifact?.inline_content) {
        setSceneCode(codeArtifact.inline_content);
        updateViewer(codeArtifact.inline_content);
      }
      
      toast.success('Scene updated successfully!', {
        description: `New version created`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Iteration failed', { description: message });
    } finally {
      setIsIterating(false);
    }
  };
  
  // Export scene
  const handleExport = async (format: 'glb' | 'obj') => {
    if (!currentModel) {
      toast.error('No model to export');
      return;
    }
    
    setIsExporting(true);
    try {
      const response = await fetch('/api/integrations/kimi/v1/scene/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProjectId || undefined,
          spatial_model_id: currentModel.spatial_model_id,
          format,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Export failed');
      }
      
      // Download the export script
      const script = data.artifact?.inline_content;
      if (script) {
        const blob = new Blob([script], { type: 'text/x-python' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `export_${format}_${currentModel.spatial_model_id}.py`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast.success('Export script downloaded!', {
          description: `Run with: blender --background --python script.py`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Export failed', { description: message });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Copy code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(sceneCode);
    toast.success('Code copied to clipboard');
  };
  
  // Add room
  const addRoom = (levelIndex: number) => {
    const newLayout = { ...layoutSpec };
    newLayout.levels[levelIndex].rooms.push({
      name: `Room ${newLayout.levels[levelIndex].rooms.length + 1}`,
      width: 4,
      length: 4,
      height: newLayout.globalDefaults.ceilingHeight,
    });
    setLayoutSpec(newLayout);
    setLayoutJson(JSON.stringify(newLayout, null, 2));
  };
  
  // Remove room
  const removeRoom = (levelIndex: number, roomIndex: number) => {
    const newLayout = { ...layoutSpec };
    newLayout.levels[levelIndex].rooms.splice(roomIndex, 1);
    setLayoutSpec(newLayout);
    setLayoutJson(JSON.stringify(newLayout, null, 2));
  };
  
  // Update room
  const updateRoom = (levelIndex: number, roomIndex: number, field: 'name' | 'width' | 'length' | 'height', value: string | number) => {
    const newLayout = { ...layoutSpec };
    const room = newLayout.levels[levelIndex].rooms[roomIndex];
    if (field === 'name') {
      room.name = value as string;
    } else if (field === 'width') {
      room.width = Number(value);
    } else if (field === 'length') {
      room.length = Number(value);
    } else if (field === 'height') {
      room.height = Number(value);
    }
    setLayoutSpec(newLayout);
    setLayoutJson(JSON.stringify(newLayout, null, 2));
  };
  
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (status === 'unauthenticated') {
    router.push('/auth/login');
    return null;
  }
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <BackButton fallbackUrl="/dashboard" />
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Box className="h-8 w-8 text-primary" />
                Spatial Workbench
              </h1>
              <p className="text-muted-foreground">
                Generate 3D scenes from layout specifications using Kimi K2.5 AI
              </p>
            </div>
          </div>
          {currentModel && (
            <Badge variant="outline" className="text-sm">
              Model: {currentModel.spatial_model_id.slice(0, 8)}...
            </Badge>
          )}
        </div>
        
        {/* Disclaimer Banner */}
        <Alert variant="destructive" className="bg-amber-500/10 border-amber-500/50">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-600">Non-Authoritative Preview</AlertTitle>
          <AlertDescription className="text-amber-600/80">
            AI-generated visualizations are for preview purposes only. Not valid for construction documents,
            permit submissions, or engineering signoff. Human licensure review required for any regulated use.
          </AlertDescription>
        </Alert>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Configuration */}
          <div className="space-y-6">
            <Tabs defaultValue="visual" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="visual">
                  <Layers className="h-4 w-4 mr-2" />
                  Visual Editor
                </TabsTrigger>
                <TabsTrigger value="json">
                  <FileJson className="h-4 w-4 mr-2" />
                  JSON Editor
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="visual" className="space-y-4 mt-4">
                {/* Settings */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Generation Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Project (Optional)</Label>
                        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Project</SelectItem>
                            {projects.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.projectNumber} - {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Units</Label>
                        <Select value={units} onValueChange={(v) => setUnits(v as 'metric' | 'imperial')}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="metric">Metric (meters)</SelectItem>
                            <SelectItem value="imperial">Imperial (feet)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Target Engine</Label>
                      <Select value={targetEngine} onValueChange={(v) => setTargetEngine(v as typeof targetEngine)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="threejs">Three.js (Web)</SelectItem>
                          <SelectItem value="babylonjs">Babylon.js (Web)</SelectItem>
                          <SelectItem value="unity_csharp">Unity C# (Game Engine)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Room Editor */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Layout Specification</CardTitle>
                    <CardDescription>
                      Define rooms with dimensions in {units === 'metric' ? 'meters' : 'feet'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px] pr-4">
                      {layoutSpec.levels.map((level, levelIndex) => (
                        <div key={levelIndex} className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{level.name}</h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addRoom(levelIndex)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Room
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {level.rooms.map((room, roomIndex) => (
                              <div key={roomIndex} className="grid grid-cols-5 gap-2 items-center p-2 bg-muted/50 rounded">
                                <Input
                                  value={room.name}
                                  onChange={(e) => updateRoom(levelIndex, roomIndex, 'name', e.target.value)}
                                  placeholder="Room name"
                                  className="col-span-2"
                                />
                                <Input
                                  type="number"
                                  value={room.width}
                                  onChange={(e) => updateRoom(levelIndex, roomIndex, 'width', e.target.value)}
                                  placeholder="W"
                                  className="text-center"
                                />
                                <Input
                                  type="number"
                                  value={room.length}
                                  onChange={(e) => updateRoom(levelIndex, roomIndex, 'length', e.target.value)}
                                  placeholder="L"
                                  className="text-center"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeRoom(levelIndex, roomIndex)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="json" className="mt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Layout JSON</CardTitle>
                    <CardDescription>
                      Edit the full layout specification in JSON format
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={layoutJson}
                      onChange={(e) => handleLayoutJsonChange(e.target.value)}
                      className="font-mono text-sm h-[400px]"
                      placeholder="Enter layout JSON..."
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5 mr-2" />
              )}
              {isGenerating ? 'Generating Scene...' : 'Generate 3D Scene'}
            </Button>
            
            {/* Iteration Panel */}
            {currentModel && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <RefreshCw className="h-5 w-5" />
                    Iterate on Scene
                  </CardTitle>
                  <CardDescription>
                    Describe changes you want to make to the current scene
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={iterationInstructions}
                    onChange={(e) => setIterationInstructions(e.target.value)}
                    placeholder="e.g., 'Increase wall thickness to 0.2m' or 'Move the kitchen 2m to the east'"
                    className="h-[100px]"
                  />
                  <Button
                    onClick={handleIterate}
                    disabled={isIterating || !iterationInstructions.trim()}
                    className="w-full"
                  >
                    {isIterating ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    {isIterating ? 'Applying Changes...' : 'Apply Changes'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Right Panel - Viewer */}
          <div className="space-y-4">
            {/* 3D Viewer */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    3D Preview
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {currentModel && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCode(!showCode)}
                        >
                          <Code className="h-4 w-4 mr-1" />
                          {showCode ? 'Hide Code' : 'Show Code'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExport('glb')}
                          disabled={isExporting}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Export GLB
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative bg-[#1a1a2e] aspect-video">
                  {!currentModel ? (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Box className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p>Configure layout and click Generate</p>
                      </div>
                    </div>
                  ) : (
                    <iframe
                      ref={viewerRef}
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-same-origin"
                      title="3D Scene Viewer"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Code Panel */}
            {showCode && sceneCode && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Generated Code</CardTitle>
                    <Button variant="ghost" size="sm" onClick={handleCopyCode}>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <pre className="text-xs font-mono bg-muted p-4 rounded overflow-x-auto">
                      {sceneCode}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
            
            {/* Warnings & Assumptions */}
            {currentModel && (currentModel.warnings.length > 0 || currentModel.assumptions.length > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Generation Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentModel.warnings.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-amber-600 mb-2 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        Warnings
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {currentModel.warnings.map((w, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-amber-500">•</span>
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {currentModel.assumptions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-blue-600 mb-2 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        Assumptions Made
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {currentModel.assumptions.map((a, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-blue-500">•</span>
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Version History */}
            {modelHistory.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Version History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[150px]">
                    <div className="space-y-2">
                      {modelHistory.map((m, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                          <span>Version {modelHistory.length - i}</span>
                          <Badge variant="outline">{m.id.slice(0, 8)}...</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
