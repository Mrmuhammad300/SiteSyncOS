'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Box,
  Cuboid,
  Eye,
  EyeOff,
  Grid3X3,
  Layers,
  Loader2,
  Move3D,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  Trash2,
  Upload,
  Download,
  Wand2,
  Camera,
  Sun,
  Building2,
  Car,
  Trees,
  Wrench,
  ChevronRight,
  ChevronDown,
  Maximize2,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BackButton } from '@/components/ui/back-button';
import { toast } from 'sonner';
import type { SceneObject } from '@/components/ui/scene-viewer-3d';

// Dynamic import for 3D component (client-side only)
const SceneViewer3D = dynamic(
  () => import('@/components/ui/scene-viewer-3d').then((mod) => mod.SceneViewer3D),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto mb-2 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">Loading 3D engine...</p>
        </div>
      </div>
    ),
  }
);

// Import default scene
const getDefaultConstructionScene = async () => {
  const mod = await import('@/components/ui/scene-viewer-3d');
  return mod.getDefaultConstructionScene();
};

const objectTypeIcons: Record<string, typeof Building2> = {
  building: Building2,
  vehicle: Car,
  vegetation: Trees,
  equipment: Wrench,
  ground: Grid3X3,
  custom: Box,
};

export default function SpatialWorkbenchPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sceneObjects, setSceneObjects] = useState<SceneObject[]>([]);
  const [selectedObject, setSelectedObject] = useState<SceneObject | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(false);
  const [environment, setEnvironment] = useState<'city' | 'sunset' | 'dawn' | 'night' | 'forest'>('city');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [blenderStatus, setBlenderStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [generating, setGenerating] = useState(false);
  const [scenePrompt, setScenePrompt] = useState('');
  const [addObjectDialog, setAddObjectDialog] = useState(false);
  const [newObject, setNewObject] = useState({
    name: '',
    type: 'building' as SceneObject['type'],
    positionX: 0,
    positionY: 0,
    positionZ: 0,
    color: '#94a3b8',
    width: 10,
    height: 15,
    depth: 10,
  });

  // Initialize scene
  useEffect(() => {
    const initScene = async () => {
      try {
        const defaultScene = await getDefaultConstructionScene();
        setSceneObjects(defaultScene);
      } catch (error) {
        console.error('Failed to load default scene:', error);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      initScene();
      checkBlenderConnection();
    }
  }, [status, router]);

  // Check Blender MCP connection
  const checkBlenderConnection = async () => {
    setBlenderStatus('checking');
    try {
      const response = await fetch('/api/blender?action=status');
      if (response.ok) {
        const data = await response.json();
        setBlenderStatus(data.connected ? 'connected' : 'disconnected');
      } else {
        setBlenderStatus('disconnected');
      }
    } catch (error) {
      setBlenderStatus('disconnected');
    }
  };

  // Handle object selection
  const handleObjectSelect = useCallback((object: SceneObject | null) => {
    setSelectedObject(object);
  }, []);

  // Add new object to scene
  const handleAddObject = () => {
    const newSceneObject: SceneObject = {
      id: `obj-${Date.now()}`,
      name: newObject.name || `${newObject.type} ${sceneObjects.length + 1}`,
      type: newObject.type,
      position: [newObject.positionX, newObject.positionY, newObject.positionZ],
      color: newObject.color,
      dimensions: {
        width: newObject.width,
        height: newObject.height,
        depth: newObject.depth,
      },
    };

    setSceneObjects([...sceneObjects, newSceneObject]);
    setAddObjectDialog(false);
    toast.success(`Added ${newSceneObject.name} to scene`);

    // Reset form
    setNewObject({
      name: '',
      type: 'building',
      positionX: 0,
      positionY: 0,
      positionZ: 0,
      color: '#94a3b8',
      width: 10,
      height: 15,
      depth: 10,
    });
  };

  // Delete selected object
  const handleDeleteObject = () => {
    if (!selectedObject) return;

    setSceneObjects(sceneObjects.filter((obj) => obj.id !== selectedObject.id));
    setSelectedObject(null);
    toast.success(`Deleted ${selectedObject.name}`);
  };

  // Update object property
  const updateObjectProperty = (property: string, value: unknown) => {
    if (!selectedObject) return;

    const updatedObjects = sceneObjects.map((obj) => {
      if (obj.id === selectedObject.id) {
        if (property.startsWith('position')) {
          const axis = property.charAt(property.length - 1).toLowerCase();
          const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
          const newPosition = [...obj.position] as [number, number, number];
          newPosition[axisIndex] = value as number;
          return { ...obj, position: newPosition };
        } else if (property.startsWith('dimension')) {
          const dim = property.replace('dimension', '').toLowerCase();
          return {
            ...obj,
            dimensions: { ...obj.dimensions, [dim]: value },
          };
        }
        return { ...obj, [property]: value };
      }
      return obj;
    });

    setSceneObjects(updatedObjects);
    setSelectedObject(updatedObjects.find((obj) => obj.id === selectedObject.id) || null);
  };

  // Generate scene with AI
  const handleGenerateScene = async () => {
    if (!scenePrompt.trim()) {
      toast.error('Please enter a description for the scene');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/blender', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_model',
          params: {
            prompt: scenePrompt,
            style: 'realistic',
            quality: 'medium',
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Scene generation initiated');

        // Add a placeholder object for the generated model
        const generatedObject: SceneObject = {
          id: `generated-${Date.now()}`,
          name: 'Generated Scene',
          type: 'custom',
          position: [0, 0, 0],
          color: '#6366f1',
          metadata: {
            prompt: scenePrompt,
            modelId: result.model?.modelId,
          },
        };

        setSceneObjects([...sceneObjects, generatedObject]);
      } else {
        toast.error('Failed to generate scene');
      }
    } catch (error) {
      console.error('Scene generation error:', error);
      toast.error('Scene generation failed');
    } finally {
      setGenerating(false);
      setScenePrompt('');
    }
  };

  // Export scene
  const handleExportScene = async () => {
    try {
      const sceneData = JSON.stringify(sceneObjects, null, 2);
      const blob = new Blob([sceneData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scene-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Scene exported successfully');
    } catch (error) {
      toast.error('Failed to export scene');
    }
  };

  // Reset scene
  const handleResetScene = async () => {
    const defaultScene = await getDefaultConstructionScene();
    setSceneObjects(defaultScene);
    setSelectedObject(null);
    toast.success('Scene reset to default');
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading Spatial Workbench...</p>
        </div>
      </div>
    );
  }

  const ObjectIcon = selectedObject ? objectTypeIcons[selectedObject.type] || Box : Box;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-6">
          <BackButton fallbackUrl="/dashboard" />
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main 3D Viewport */}
          <div className={`flex-1 ${isFullscreen ? 'fixed inset-0 z-50 p-4 bg-background' : ''}`}>
            <Card className="h-full">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Move3D className="h-5 w-5 text-primary" />
                      Spatial Workbench - 3D View
                    </CardTitle>
                    <CardDescription>
                      Interactive 3D construction site visualization
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={blenderStatus === 'connected' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {blenderStatus === 'checking' ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : blenderStatus === 'connected' ? (
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-gray-400 mr-1" />
                      )}
                      Blender {blenderStatus}
                    </Badge>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsFullscreen(!isFullscreen)}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={checkBlenderConnection}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <div className="flex items-center gap-2 border rounded-lg p-1">
                    <Button
                      variant={showGrid ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setShowGrid(!showGrid)}
                    >
                      <Grid3X3 className="h-4 w-4 mr-1" />
                      Grid
                    </Button>
                    <Button
                      variant={showAxes ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setShowAxes(!showAxes)}
                    >
                      <Move3D className="h-4 w-4 mr-1" />
                      Axes
                    </Button>
                  </div>

                  <Select value={environment} onValueChange={(v: typeof environment) => setEnvironment(v)}>
                    <SelectTrigger className="w-[120px]">
                      <Sun className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="city">City</SelectItem>
                      <SelectItem value="sunset">Sunset</SelectItem>
                      <SelectItem value="dawn">Dawn</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                      <SelectItem value="forest">Forest</SelectItem>
                    </SelectContent>
                  </Select>

                  <Separator orientation="vertical" className="h-8" />

                  <Dialog open={addObjectDialog} onOpenChange={setAddObjectDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Object
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Object</DialogTitle>
                        <DialogDescription>
                          Add a new object to the 3D scene
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Object Name</Label>
                            <Input
                              value={newObject.name}
                              onChange={(e) => setNewObject({ ...newObject, name: e.target.value })}
                              placeholder="e.g., Main Building"
                            />
                          </div>
                          <div>
                            <Label>Type</Label>
                            <Select
                              value={newObject.type}
                              onValueChange={(v: SceneObject['type']) =>
                                setNewObject({ ...newObject, type: v })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="building">Building</SelectItem>
                                <SelectItem value="equipment">Equipment</SelectItem>
                                <SelectItem value="vehicle">Vehicle</SelectItem>
                                <SelectItem value="vegetation">Vegetation</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Position X</Label>
                            <Input
                              type="number"
                              value={newObject.positionX}
                              onChange={(e) =>
                                setNewObject({ ...newObject, positionX: parseFloat(e.target.value) || 0 })
                              }
                            />
                          </div>
                          <div>
                            <Label>Position Y</Label>
                            <Input
                              type="number"
                              value={newObject.positionY}
                              onChange={(e) =>
                                setNewObject({ ...newObject, positionY: parseFloat(e.target.value) || 0 })
                              }
                            />
                          </div>
                          <div>
                            <Label>Position Z</Label>
                            <Input
                              type="number"
                              value={newObject.positionZ}
                              onChange={(e) =>
                                setNewObject({ ...newObject, positionZ: parseFloat(e.target.value) || 0 })
                              }
                            />
                          </div>
                        </div>

                        {(newObject.type === 'building' || newObject.type === 'custom') && (
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label>Width</Label>
                              <Input
                                type="number"
                                value={newObject.width}
                                onChange={(e) =>
                                  setNewObject({ ...newObject, width: parseFloat(e.target.value) || 10 })
                                }
                              />
                            </div>
                            <div>
                              <Label>Height</Label>
                              <Input
                                type="number"
                                value={newObject.height}
                                onChange={(e) =>
                                  setNewObject({ ...newObject, height: parseFloat(e.target.value) || 15 })
                                }
                              />
                            </div>
                            <div>
                              <Label>Depth</Label>
                              <Input
                                type="number"
                                value={newObject.depth}
                                onChange={(e) =>
                                  setNewObject({ ...newObject, depth: parseFloat(e.target.value) || 10 })
                                }
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <Label>Color</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              type="color"
                              value={newObject.color}
                              onChange={(e) => setNewObject({ ...newObject, color: e.target.value })}
                              className="w-12 h-10 p-1"
                            />
                            <Input
                              value={newObject.color}
                              onChange={(e) => setNewObject({ ...newObject, color: e.target.value })}
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>

                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAddObjectDialog(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddObject}>Add Object</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Button variant="outline" size="sm" onClick={handleExportScene}>
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>

                  <Button variant="outline" size="sm" onClick={handleResetScene}>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {/* 3D Viewport */}
                <div className="h-[600px] border rounded-lg overflow-hidden bg-slate-900">
                  <SceneViewer3D
                    objects={sceneObjects}
                    selectedObjectId={selectedObject?.id}
                    onObjectSelect={handleObjectSelect}
                    showGrid={showGrid}
                    showAxes={showAxes}
                    environmentPreset={environment}
                    backgroundColor="#1e293b"
                  />
                </div>

                {/* Scene Stats */}
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{sceneObjects.length}</div>
                    <div className="text-xs text-muted-foreground">Objects</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">
                      {sceneObjects.filter((o) => o.type === 'building').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Buildings</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">
                      {sceneObjects.filter((o) => o.type === 'equipment').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Equipment</div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">
                      {sceneObjects.filter((o) => o.type === 'vehicle').length}
                    </div>
                    <div className="text-xs text-muted-foreground">Vehicles</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          {!isFullscreen && (
            <div className="w-full lg:w-80 space-y-4">
              {/* AI Scene Generation */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-purple-500" />
                    AI Scene Generator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    placeholder="Describe the scene you want to generate... e.g., 'A modern office building with a parking lot and landscaping'"
                    value={scenePrompt}
                    onChange={(e) => setScenePrompt(e.target.value)}
                    rows={3}
                  />
                  <Button
                    className="w-full"
                    onClick={handleGenerateScene}
                    disabled={generating || !scenePrompt.trim()}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Generate Scene
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Object Properties */}
              {selectedObject ? (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ObjectIcon className="h-4 w-4 text-primary" />
                        {selectedObject.name}
                      </CardTitle>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleDeleteObject}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <Badge variant="outline" className="w-fit">
                      {selectedObject.type}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Position */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Position</Label>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        <div>
                          <Label className="text-xs">X</Label>
                          <Input
                            type="number"
                            value={selectedObject.position[0]}
                            onChange={(e) =>
                              updateObjectProperty('positionX', parseFloat(e.target.value) || 0)
                            }
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Y</Label>
                          <Input
                            type="number"
                            value={selectedObject.position[1]}
                            onChange={(e) =>
                              updateObjectProperty('positionY', parseFloat(e.target.value) || 0)
                            }
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Z</Label>
                          <Input
                            type="number"
                            value={selectedObject.position[2]}
                            onChange={(e) =>
                              updateObjectProperty('positionZ', parseFloat(e.target.value) || 0)
                            }
                            className="h-8"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dimensions */}
                    {selectedObject.dimensions && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Dimensions</Label>
                        <div className="grid grid-cols-3 gap-2 mt-1">
                          <div>
                            <Label className="text-xs">W</Label>
                            <Input
                              type="number"
                              value={selectedObject.dimensions.width || 0}
                              onChange={(e) =>
                                updateObjectProperty('dimensionWidth', parseFloat(e.target.value) || 0)
                              }
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">H</Label>
                            <Input
                              type="number"
                              value={selectedObject.dimensions.height || 0}
                              onChange={(e) =>
                                updateObjectProperty('dimensionHeight', parseFloat(e.target.value) || 0)
                              }
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">D</Label>
                            <Input
                              type="number"
                              value={selectedObject.dimensions.depth || 0}
                              onChange={(e) =>
                                updateObjectProperty('dimensionDepth', parseFloat(e.target.value) || 0)
                              }
                              className="h-8"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Color */}
                    <div>
                      <Label className="text-xs text-muted-foreground">Color</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          value={selectedObject.color || '#888888'}
                          onChange={(e) => updateObjectProperty('color', e.target.value)}
                          className="w-12 h-8 p-1"
                        />
                        <Input
                          value={selectedObject.color || '#888888'}
                          onChange={(e) => updateObjectProperty('color', e.target.value)}
                          className="flex-1 h-8"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Info className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click on an object in the 3D view to edit its properties
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Scene Objects List */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Scene Objects ({sceneObjects.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-1">
                      {sceneObjects.map((obj) => {
                        const Icon = objectTypeIcons[obj.type] || Box;
                        const isSelected = selectedObject?.id === obj.id;
                        return (
                          <div
                            key={obj.id}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-primary/10 border border-primary'
                                : 'hover:bg-muted/50'
                            }`}
                            onClick={() => handleObjectSelect(isSelected ? null : obj)}
                          >
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm flex-1 truncate">{obj.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {obj.type}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
