'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Building2,
  HardHat,
  AlertTriangle,
  Shield,
  RefreshCw,
  Search,
  Layers,
  Info,
  X,
  CheckCircle,
  Globe,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { BackButton } from '@/components/ui/back-button';
import type { MapMarker } from '@/components/ui/gis-map';

// Dynamic import for map component (client-side only)
const GISMap = dynamic(() => import('@/components/ui/gis-map').then((mod) => mod.GISMap), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-muted rounded-lg flex items-center justify-center">
      <div className="text-center">
        <Globe className="h-12 w-12 mx-auto mb-2 text-muted-foreground animate-pulse" />
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    </div>
  ),
});

interface GISLocation {
  id: string;
  name: string;
  type: 'property' | 'project';
  address?: string;
  fullAddress?: string;
  coordinates: [number, number] | null;
  latitude?: number | null;
  longitude?: number | null;
  riskZone?: 'Low' | 'Moderate' | 'High' | 'Severe' | null;
  riskScore?: number | null;
  floodZone?: string | null;
  hazardTypes?: string | null;
  status?: string;
  phase?: string;
  budget?: number;
  totalProjectCost?: number;
  assetType?: string;
  developmentStage?: string;
  statusIndicator?: string;
  lastRiskAssessment?: string | null;
}

interface RiskAssessment {
  latitude: number;
  longitude: number;
  riskScore: number;
  riskZone: string;
  floodZone: string;
  hazardTypes: string[];
  riskFactors: {
    floodRisk: number;
    earthquakeRisk: number;
    wildfireRisk: number;
    hurricaneRisk: number;
    tornadoRisk: number;
  };
  recommendations: string[];
  assessmentDate: string;
}

interface GISData {
  properties: GISLocation[];
  projects: GISLocation[];
  summary: {
    totalLocations: number;
    highRiskCount: number;
    moderateRiskCount: number;
    lowRiskCount: number;
  };
}

export default function GISPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [data, setData] = useState<GISData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<GISLocation | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'properties' | 'projects'>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [runningAssessment, setRunningAssessment] = useState(false);
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [geocodeDialog, setGeocodeDialog] = useState(false);
  const [geocodeAddress, setGeocodeAddress] = useState('');
  const [geocoding, setGeocoding] = useState(false);

  // Fetch GIS data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/gis?includeRisk=true');
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch GIS data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, router, fetchData]);

  // Run risk assessment for a location
  const runRiskAssessment = async (location: GISLocation) => {
    if (!location.latitude || !location.longitude) {
      return;
    }

    setRunningAssessment(true);
    try {
      const res = await fetch('/api/gis/risk-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          type: location.type,
          id: location.id,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setAssessment(result);
        // Refresh data to get updated risk info
        fetchData();
      }
    } catch (error) {
      console.error('Risk assessment failed:', error);
    } finally {
      setRunningAssessment(false);
    }
  };

  // Geocode an address (simplified - in production use a geocoding API)
  const geocodeLocation = async () => {
    if (!selectedLocation || !geocodeAddress) return;

    setGeocoding(true);
    try {
      // Simple US state coordinate mapping for demo
      // In production, use Mapbox Geocoding API or similar
      const stateCoords: Record<string, [number, number]> = {
        'CA': [-119.4179, 36.7783],
        'TX': [-99.9018, 31.9686],
        'FL': [-81.5158, 27.6648],
        'NY': [-75.4999, 43.2994],
        'IL': [-89.3985, 40.6331],
        'PA': [-77.1945, 41.2033],
        'OH': [-82.9071, 40.4173],
        'GA': [-82.9001, 32.1656],
        'NC': [-79.0193, 35.7596],
        'MI': [-85.6024, 44.3148],
      };

      // Extract state from address
      const addressUpper = geocodeAddress.toUpperCase();
      let coords: [number, number] = [-98.5795, 39.8283]; // Default US center
      
      for (const [state, stateCoords_] of Object.entries(stateCoords)) {
        if (addressUpper.includes(state) || addressUpper.includes(state.toLowerCase())) {
          coords = stateCoords_;
          // Add some randomization for variety
          coords = [
            coords[0] + (Math.random() - 0.5) * 2,
            coords[1] + (Math.random() - 0.5) * 2,
          ];
          break;
        }
      }

      // Update the location with coordinates
      await fetch('/api/gis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedLocation.type,
          id: selectedLocation.id,
          latitude: coords[1],
          longitude: coords[0],
        }),
      });

      setGeocodeDialog(false);
      setGeocodeAddress('');
      fetchData();
    } catch (error) {
      console.error('Geocoding failed:', error);
    } finally {
      setGeocoding(false);
    }
  };

  // Filter locations
  const getFilteredLocations = (): GISLocation[] => {
    if (!data) return [];

    let locations: GISLocation[] = [];
    if (filterType === 'all' || filterType === 'properties') {
      locations = [...locations, ...data.properties];
    }
    if (filterType === 'all' || filterType === 'projects') {
      locations = [...locations, ...data.projects];
    }

    // Filter by risk
    if (filterRisk !== 'all') {
      locations = locations.filter((l) => l.riskZone === filterRisk);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      locations = locations.filter(
        (l) =>
          l.name.toLowerCase().includes(query) ||
          l.address?.toLowerCase().includes(query) ||
          l.fullAddress?.toLowerCase().includes(query)
      );
    }

    return locations;
  };

  // Convert locations to map markers
  const getMapMarkers = (): MapMarker[] => {
    return getFilteredLocations()
      .filter((l) => l.coordinates)
      .map((l) => ({
        id: l.id,
        name: l.name,
        type: l.type,
        coordinates: l.coordinates as [number, number],
        riskZone: l.riskZone,
        riskScore: l.riskScore,
        address: l.address || l.fullAddress,
        status: l.status || l.developmentStage,
        budget: l.budget || l.totalProjectCost,
      }));
  };

  const getRiskBadgeVariant = (risk?: string | null) => {
    switch (risk) {
      case 'Severe':
        return 'destructive';
      case 'High':
        return 'destructive';
      case 'Moderate':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredLocations = getFilteredLocations();
  const locationsWithCoords = filteredLocations.filter((l) => l.coordinates);
  const locationsWithoutCoords = filteredLocations.filter((l) => !l.coordinates);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-6">
          <BackButton fallbackUrl="/dashboard" />
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Map Area */}
          <div className="flex-1">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      SiteSync GIS Intelligence
                    </CardTitle>
                    <CardDescription>
                      Property mapping, site visualization & risk analysis
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 mt-4">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search locations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                    <SelectTrigger className="w-[140px]">
                      <Layers className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="properties">Properties</SelectItem>
                      <SelectItem value="projects">Projects</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterRisk} onValueChange={setFilterRisk}>
                    <SelectTrigger className="w-[140px]">
                      <Shield className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Risk</SelectItem>
                      <SelectItem value="Low">Low Risk</SelectItem>
                      <SelectItem value="Moderate">Moderate</SelectItem>
                      <SelectItem value="High">High Risk</SelectItem>
                      <SelectItem value="Severe">Severe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent>
                {/* Map */}
                <GISMap
                  markers={getMapMarkers()}
                  height="500px"
                  showRiskOverlay={true}
                  onMarkerClick={(marker) => {
                    const loc = filteredLocations.find((l) => l.id === marker.id);
                    if (loc) {
                      setSelectedLocation(loc);
                      setShowDetails(true);
                    }
                  }}
                  selectedMarkerId={selectedLocation?.id}
                />

                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold">{data?.summary.totalLocations || 0}</div>
                    <div className="text-xs text-muted-foreground">Mapped Locations</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-600">{data?.summary.lowRiskCount || 0}</div>
                    <div className="text-xs text-muted-foreground">Low Risk</div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-yellow-600">{data?.summary.moderateRiskCount || 0}</div>
                    <div className="text-xs text-muted-foreground">Moderate Risk</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-600">{data?.summary.highRiskCount || 0}</div>
                    <div className="text-xs text-muted-foreground">High/Severe Risk</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-4">
            {/* Location List */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Locations ({filteredLocations.length})</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[400px] overflow-y-auto">
                <div className="space-y-2">
                  {filteredLocations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No locations found
                    </p>
                  ) : (
                    filteredLocations.map((loc) => (
                      <div
                        key={loc.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedLocation?.id === loc.id
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => {
                          setSelectedLocation(loc);
                          setShowDetails(true);
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5">
                            {loc.type === 'property' ? (
                              <Building2 className="h-4 w-4 text-blue-500" />
                            ) : (
                              <HardHat className="h-4 w-4 text-orange-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{loc.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {loc.address || loc.fullAddress || 'No address'}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {loc.coordinates ? (
                                <Badge variant="outline" className="text-xs">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  Mapped
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  No coords
                                </Badge>
                              )}
                              {loc.riskZone && (
                                <Badge variant={getRiskBadgeVariant(loc.riskZone)} className="text-xs">
                                  {loc.riskZone}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Unmapped Locations Alert */}
            {locationsWithoutCoords.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Unmapped Locations</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {locationsWithoutCoords.length} location(s) need geocoding to appear on the map.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Location Details Dialog */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedLocation?.type === 'property' ? (
                  <Building2 className="h-5 w-5 text-blue-500" />
                ) : (
                  <HardHat className="h-5 w-5 text-orange-500" />
                )}
                {selectedLocation?.name}
              </DialogTitle>
              <DialogDescription>
                {selectedLocation?.address || selectedLocation?.fullAddress || 'No address available'}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="info">Information</TabsTrigger>
                <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Type</div>
                    <div className="font-medium capitalize">{selectedLocation?.type}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Status</div>
                    <div className="font-medium">
                      {selectedLocation?.status || selectedLocation?.developmentStage || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Budget/Cost</div>
                    <div className="font-medium">
                      ${(selectedLocation?.budget || selectedLocation?.totalProjectCost || 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Coordinates</div>
                    <div className="font-medium text-sm">
                      {selectedLocation?.coordinates
                        ? `${selectedLocation.coordinates[1].toFixed(4)}, ${selectedLocation.coordinates[0].toFixed(4)}`
                        : 'Not set'}
                    </div>
                  </div>
                </div>

                {!selectedLocation?.coordinates && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setGeocodeDialog(true)}
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Set Location Coordinates
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="risk" className="space-y-4 mt-4">
                {selectedLocation?.riskScore !== null && selectedLocation?.riskScore !== undefined ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs text-muted-foreground">Risk Score</div>
                        <div className="text-2xl font-bold">{selectedLocation.riskScore}/100</div>
                      </div>
                      <Badge variant={getRiskBadgeVariant(selectedLocation.riskZone)} className="text-sm">
                        {selectedLocation.riskZone} Risk
                      </Badge>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Risk Level</div>
                      <Progress value={selectedLocation.riskScore} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground">Flood Zone</div>
                        <div className="font-medium">{selectedLocation.floodZone || 'Unknown'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Hazard Types</div>
                        <div className="font-medium text-sm">
                          {selectedLocation.hazardTypes || 'None identified'}
                        </div>
                      </div>
                    </div>

                    {selectedLocation.lastRiskAssessment && (
                      <div className="text-xs text-muted-foreground">
                        Last assessed: {new Date(selectedLocation.lastRiskAssessment).toLocaleDateString()}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-4">No risk assessment available</p>
                  </div>
                )}

                {selectedLocation?.coordinates && (
                  <Button
                    className="w-full"
                    onClick={() => selectedLocation && runRiskAssessment(selectedLocation)}
                    disabled={runningAssessment}
                  >
                    {runningAssessment ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Run Risk Assessment
                      </>
                    )}
                  </Button>
                )}

                {/* Assessment Results */}
                {assessment && (
                  <Card className="bg-muted/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Assessment Complete
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-5 gap-2 text-center">
                        <div>
                          <div className="text-lg font-bold text-blue-600">
                            {assessment.riskFactors.floodRisk}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Flood</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-orange-600">
                            {assessment.riskFactors.earthquakeRisk}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Quake</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-red-600">
                            {assessment.riskFactors.wildfireRisk}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Fire</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-purple-600">
                            {assessment.riskFactors.hurricaneRisk}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Hurricane</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-gray-600">
                            {assessment.riskFactors.tornadoRisk}
                          </div>
                          <div className="text-[10px] text-muted-foreground">Tornado</div>
                        </div>
                      </div>

                      {assessment.recommendations.length > 0 && (
                        <div>
                          <div className="text-xs font-medium mb-1">Recommendations</div>
                          <ul className="text-xs text-muted-foreground space-y-1">
                            {assessment.recommendations.slice(0, 3).map((rec, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <TrendingUp className="h-3 w-3 mt-0.5 text-primary" />
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetails(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Geocode Dialog */}
        <Dialog open={geocodeDialog} onOpenChange={setGeocodeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Location Coordinates</DialogTitle>
              <DialogDescription>
                Enter an address to geocode, or the coordinates will be estimated based on the state.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Address</label>
                <Input
                  value={geocodeAddress}
                  onChange={(e) => setGeocodeAddress(e.target.value)}
                  placeholder="e.g., 123 Main St, Los Angeles, CA"
                  className="mt-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Note: For best results, include the state abbreviation (e.g., CA, TX, FL).
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGeocodeDialog(false)}>
                Cancel
              </Button>
              <Button onClick={geocodeLocation} disabled={geocoding || !geocodeAddress}>
                {geocoding ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Geocoding...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Set Coordinates
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
