'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

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
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: center,
      zoom: zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

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
  }, [markers, mapLoaded, onMarkerClick, selectedMarkerId]);

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
