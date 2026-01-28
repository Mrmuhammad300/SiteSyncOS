'use client';

import React, { useState } from 'react';
import { BlueprintFloorPlan, type BlueprintFloorData } from './blueprint-floor-plan';
import { ThreeDFloorView, type ThreeDFloorData } from './three-d-floor-view';
import { Grid3X3, Box, Download } from 'lucide-react';
import { Button } from './button';

interface FloorPlanViewerProps {
  floor: BlueprintFloorData & ThreeDFloorData;
  buildingWidth: number;
  buildingDepth: number;
  floorHeight: number;
  projectType: string;
  buildingName?: string;
}

export function FloorPlanViewer({
  floor,
  buildingWidth,
  buildingDepth,
  floorHeight,
  projectType,
  buildingName,
}: FloorPlanViewerProps) {
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

  return (
    <div className="flex flex-col h-full">
      {/* Toggle Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('2d')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === '2d'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
            2D Plan
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === '3d'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            3D View
          </button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => {
            // Export SVG or canvas as PNG
            if (viewMode === '2d') {
              const svgEl = document.querySelector(`[data-floor="${floor.floorNumber}"] svg`);
              if (svgEl) {
                const svgData = new XMLSerializer().serializeToString(svgEl);
                const blob = new Blob([svgData], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `floor-${floor.floorNumber}-plan.svg`;
                a.click();
                URL.revokeObjectURL(url);
              }
            } else {
              const canvas = document.querySelector(`[data-floor="${floor.floorNumber}"] canvas`) as HTMLCanvasElement;
              if (canvas) {
                const url = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = url;
                a.download = `floor-${floor.floorNumber}-3d.png`;
                a.click();
              }
            }
          }}
        >
          <Download className="w-3 h-3 mr-1" />
          Export
        </Button>
      </div>

      {/* View Area */}
      <div
        data-floor={floor.floorNumber}
        className="flex-1 rounded-lg border border-gray-200 overflow-hidden bg-white"
        style={{ minHeight: '320px' }}
      >
        {viewMode === '2d' ? (
          <BlueprintFloorPlan
            floor={floor}
            buildingWidth={buildingWidth}
            buildingDepth={buildingDepth}
            projectType={projectType}
            buildingName={buildingName}
          />
        ) : (
          <ThreeDFloorView
            floor={floor}
            buildingWidth={buildingWidth}
            buildingDepth={buildingDepth}
            floorHeight={floorHeight}
            projectType={projectType}
          />
        )}
      </div>

      {/* View mode indicator */}
      <div className="mt-2 text-center">
        <span className="text-xs text-muted-foreground">
          {viewMode === '2d'
            ? `Blueprint Plan — Section at ${floor.sliceHeight}m AFF`
            : 'Isometric 3D View'}
        </span>
      </div>
    </div>
  );
}
