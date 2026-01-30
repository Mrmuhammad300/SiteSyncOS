'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, AlertTriangle, Building2, HardHat, Globe } from 'lucide-react';

export interface MapMarker {
  id: string;
  name: string;
  type: 'property' | 'project';
  coordinates: [number, number]; // [lng, lat]
  riskZone?: 'Low' | 'Moderate' | 'High' | 'Severe' | null;
  riskScore?: number | null;
  address?: string;
  status?: string;
  budget?: number;
  onClick?: () => void;
}

interface GISMapProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  showRiskOverlay?: boolean;
  onMarkerClick?: (marker: MapMarker) => void;
  selectedMarkerId?: string | null;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

const getRiskColor = (riskZone?: string | null): string => {
  switch (riskZone) {
    case 'Severe':
      return '#dc2626'; // red-600
    case 'High':
      return '#f97316'; // orange-500
    case 'Moderate':
      return '#eab308'; // yellow-500
    case 'Low':
    default:
      return '#22c55e'; // green-500
  }
};

const getMarkerIcon = (type: 'property' | 'project'): string => {
  return type === 'property' ? '🏢' : '🏗️';
};

// Check if WebGL is available
function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return gl !== null;
  } catch {
    return false;
  }
}

// Fallback list view when map is unavailable
function FallbackListView({
  markers,
  height,
  onMarkerClick,
  selectedMarkerId,
  showRiskOverlay,
}: {
  markers: MapMarker[];
  height: string;
  onMarkerClick?: (marker: MapMarker) => void;
  selectedMarkerId?: string | null;
  showRiskOverlay?: boolean;
}) {
  return (
    <div className="relative rounded-lg overflow-hidden border border-border bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800" style={{ height }}>
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-border p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <span className="font-medium text-sm">GIS Location View</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <AlertTriangle className="h-3 w-3" />
          Map unavailable - showing list view
        </div>
      </div>

      {/* Scrollable list */}
      <div className="overflow-y-auto p-4" style={{ height: `calc(${height} - 52px)` }}>
        {markers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MapPin className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">No locations with coordinates</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {markers.map((marker) => (
              <div
                key={marker.id}
                onClick={() => onMarkerClick?.(marker)}
                className={`p-4 rounded-lg border bg-white dark:bg-slate-800 cursor-pointer transition-all hover:shadow-md ${
                  selectedMarkerId === marker.id ? 'ring-2 ring-primary shadow-md' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 border-white shadow-md"
                    style={{ backgroundColor: getRiskColor(marker.riskZone) }}
                  >
                    {marker.type === 'property' ? '🏢' : '🏗️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{marker.name}</div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {marker.address || 'No address'}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: `${getRiskColor(marker.riskZone)}20`,
                          color: getRiskColor(marker.riskZone),
                        }}
                      >
                        {marker.riskZone || 'Not Assessed'}
                      </span>
                      {marker.riskScore !== null && marker.riskScore !== undefined && (
                        <span className="text-xs text-muted-foreground">Score: {marker.riskScore}</span>
                      )}
                    </div>
                    {marker.coordinates && (
                      <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {marker.coordinates[1].toFixed(4)}, {marker.coordinates[0].toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Risk Legend */}
      {showRiskOverlay && (
        <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border">
          <div className="text-xs font-semibold mb-2">Risk Levels</div>
          <div className="space-y-1.5">
            {[
              { zone: 'Low', color: '#22c55e' },
              { zone: 'Moderate', color: '#eab308' },
              { zone: 'High', color: '#f97316' },
              { zone: 'Severe', color: '#dc2626' },
            ].map(({ zone, color }) => (
              <div key={zone} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs">{zone}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Asset Type Legend */}
      <div className="absolute bottom-4 right-4 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border">
        <div className="text-xs font-semibold mb-2">Asset Types</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span>🏢</span>
            <span className="text-xs">Property</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🏗️</span>
            <span className="text-xs">Project</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GISMap({
  markers,
  center = [-98.5795, 39.8283], // Center of US
  zoom = 4,
  height = '500px',
  showRiskOverlay = true,
  onMarkerClick,
  selectedMarkerId,
}: GISMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [webGLSupported, setWebGLSupported] = useState<boolean | null>(null);
  const [mapboxgl, setMapboxgl] = useState<any>(null);

  // Check WebGL support on mount
  useEffect(() => {
    const supported = isWebGLAvailable();
    setWebGLSupported(supported);

    // If WebGL is supported, dynamically import mapbox-gl
    if (supported) {
      import('mapbox-gl').then((module) => {
        if (module && module.default) {
          setMapboxgl(module.default);
        } else {
          setMapError('Map library loaded but is invalid');
        }
      }).catch((err) => {
        console.error('[GISMap] Failed to load mapbox-gl:', err);
        setMapError('Failed to load map library');
        setWebGLSupported(false); // Fall back to list view
      });
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || !webGLSupported || !mapboxgl) return;

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: center,
        zoom: zoom,
        failIfMajorPerformanceCaveat: false,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

      map.current.on('load', () => {
        setMapLoaded(true);
      });

      map.current.on('error', (e: any) => {
        console.error('Map error:', e);
        // Only set fatal error for style/source failures, not tile 404s
        if (e?.error?.status !== 404) {
          setMapError('Map failed to load');
        }
      });

    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError('Failed to initialize map');
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [webGLSupported, mapboxgl, center, zoom]);

  // Update markers when data changes
  useEffect(() => {
    if (!map.current || !mapLoaded || !mapboxgl) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add new markers
    markers.forEach((markerData) => {
      if (!markerData.coordinates || !map.current) return;

      const el = document.createElement('div');
      el.className = 'gis-marker';
      el.style.cssText = `
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: ${getRiskColor(markerData.riskZone)};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer;
        font-size: 16px;
        transition: transform 0.2s;
      `;
      el.innerHTML = getMarkerIcon(markerData.type);
      el.onmouseenter = () => {
        el.style.transform = 'scale(1.2)';
      };
      el.onmouseleave = () => {
        el.style.transform = selectedMarkerId === markerData.id ? 'scale(1.2)' : 'scale(1)';
      };

      if (selectedMarkerId === markerData.id) {
        el.style.transform = 'scale(1.2)';
        el.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.5), 0 2px 6px rgba(0,0,0,0.3)';
      }

      // Create popup
      const popupContent = `
        <div style="min-width: 200px; padding: 8px;">
          <h3 style="font-weight: 600; font-size: 14px; margin: 0 0 8px 0;">
            ${getMarkerIcon(markerData.type)} ${markerData.name}
          </h3>
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
            ${markerData.address || 'No address'}
          </div>
          <div style="display: flex; gap: 8px; margin-top: 8px;">
            <span style="
              display: inline-block;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 500;
              background-color: ${getRiskColor(markerData.riskZone)}20;
              color: ${getRiskColor(markerData.riskZone)};
            ">
              ${markerData.riskZone || 'Not Assessed'} Risk
            </span>
            ${markerData.riskScore !== null && markerData.riskScore !== undefined ? `
              <span style="font-size: 11px; color: #888;">Score: ${markerData.riskScore}</span>
            ` : ''}
          </div>
          ${markerData.status ? `
            <div style="margin-top: 8px; font-size: 11px;">
              <strong>Status:</strong> ${markerData.status}
            </div>
          ` : ''}
          ${markerData.budget ? `
            <div style="margin-top: 4px; font-size: 11px;">
              <strong>Budget:</strong> $${markerData.budget.toLocaleString()}
            </div>
          ` : ''}
        </div>
      `;

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
      }).setHTML(popupContent);

      const marker = new mapboxgl.Marker(el)
        .setLngLat(markerData.coordinates)
        .setPopup(popup)
        .addTo(map.current!);

      el.addEventListener('click', () => {
        onMarkerClick?.(markerData);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to markers if there are any
    if (markers.length > 0) {
      const validMarkers = markers.filter((m) => m.coordinates);
      if (validMarkers.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        validMarkers.forEach((m) => {
          bounds.extend(m.coordinates);
        });
        map.current.fitBounds(bounds, {
          padding: 50,
          maxZoom: 12,
        });
      }
    }
  }, [markers, mapLoaded, mapboxgl, onMarkerClick, selectedMarkerId]);

  // Show fallback if WebGL not supported or there's an error
  if (webGLSupported === false || mapError) {
    return (
      <FallbackListView
        markers={markers}
        height={height}
        onMarkerClick={onMarkerClick}
        selectedMarkerId={selectedMarkerId}
        showRiskOverlay={showRiskOverlay}
      />
    );
  }

  // Loading state
  if (webGLSupported === null || !mapboxgl) {
    return (
      <div className="relative rounded-lg overflow-hidden border border-border" style={{ height }}>
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-center">
            <Globe className="h-12 w-12 mx-auto mb-2 text-muted-foreground animate-pulse" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-border">
      <div ref={mapContainer} style={{ height }} />

      {/* Risk Legend */}
      {showRiskOverlay && (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border">
          <div className="text-xs font-semibold mb-2">Risk Levels</div>
          <div className="space-y-1.5">
            {[
              { zone: 'Low', color: '#22c55e' },
              { zone: 'Moderate', color: '#eab308' },
              { zone: 'High', color: '#f97316' },
              { zone: 'Severe', color: '#dc2626' },
            ].map(({ zone, color }) => (
              <div key={zone} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs">{zone}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map Type Legend */}
      <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border">
        <div className="text-xs font-semibold mb-2">Asset Types</div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span>🏢</span>
            <span className="text-xs">Property</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🏗️</span>
            <span className="text-xs">Project</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GISMap;
