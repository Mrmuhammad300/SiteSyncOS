'use client';

import React, { useRef, useEffect, useCallback } from 'react';

export interface ThreeDRoom {
  id: string;
  name: string;
  type: string;
  bounds: { x: number; y: number; width: number; depth: number };
  area: number;
  adaAccessible: boolean;
}

export interface ThreeDFloorData {
  floorNumber: number;
  height: number;
  sliceHeight: number;
  rooms: ThreeDRoom[];
  grossArea: number;
  netArea: number;
}

interface ThreeDFloorViewProps {
  floor: ThreeDFloorData;
  buildingWidth: number;
  buildingDepth: number;
  floorHeight: number;
  projectType: string;
}

const ROOM_3D_COLORS: Record<string, string> = {
  bedroom: '#c7d2fe',
  bathroom: '#a5f3fc',
  kitchen: '#fde68a',
  living: '#bbf7d0',
  dining: '#fecaca',
  hallway: '#e5e7eb',
  closet: '#ddd6fe',
  utility: '#fef08a',
  office: '#bfdbfe',
  lobby: '#c7d2fe',
  retail: '#fbcfe8',
  parking: '#d1d5db',
  mechanical: '#d6d3d1',
};

const ROOM_WALL_COLORS: Record<string, string> = {
  bedroom: '#818cf8',
  bathroom: '#22d3ee',
  kitchen: '#f59e0b',
  living: '#34d399',
  dining: '#f87171',
  hallway: '#9ca3af',
  closet: '#a78bfa',
  utility: '#eab308',
  office: '#60a5fa',
  lobby: '#6366f1',
  retail: '#ec4899',
  parking: '#6b7280',
  mechanical: '#a8a29e',
};

// Isometric projection helpers
function isoProject(
  x: number,
  y: number,
  z: number,
  originX: number,
  originY: number,
  scale: number
): [number, number] {
  const isoX = (x - y) * Math.cos(Math.PI / 6) * scale;
  const isoY = (x + y) * Math.sin(Math.PI / 6) * scale - z * scale;
  return [originX + isoX, originY + isoY];
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function darkenHex(hex: string, factor: number): string {
  const r = Math.floor(parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.floor(parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.floor(parseInt(hex.slice(5, 7), 16) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

export function ThreeDFloorView({
  floor,
  buildingWidth,
  buildingDepth,
  floorHeight,
  projectType,
}: ThreeDFloorViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Clear
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    // Isometric parameters
    const scl = Math.min(w / (buildingWidth + buildingDepth + 4), h / (buildingWidth + buildingDepth + floorHeight + 4)) * 0.65;
    const originX = w * 0.5;
    const originY = h * 0.7;

    const wallHeight = floorHeight * 0.85;

    const proj = (x: number, y: number, z: number): [number, number] =>
      isoProject(x, y, z, originX, originY, scl);

    // Draw ground shadow
    const shadowPts = [
      proj(0.3, 0.3, -0.05),
      proj(buildingWidth + 0.3, 0.3, -0.05),
      proj(buildingWidth + 0.3, buildingDepth + 0.3, -0.05),
      proj(0.3, buildingDepth + 0.3, -0.05),
    ];
    ctx.beginPath();
    ctx.moveTo(shadowPts[0][0], shadowPts[0][1]);
    shadowPts.forEach((p) => ctx.lineTo(p[0], p[1]));
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fill();

    // Draw floor slab
    const floorPts = [
      proj(0, 0, 0),
      proj(buildingWidth, 0, 0),
      proj(buildingWidth, buildingDepth, 0),
      proj(0, buildingDepth, 0),
    ];
    ctx.beginPath();
    ctx.moveTo(floorPts[0][0], floorPts[0][1]);
    floorPts.forEach((p) => ctx.lineTo(p[0], p[1]));
    ctx.closePath();
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    // Sort rooms back-to-front for painter's algorithm (by x+y)
    const sortedRooms = [...floor.rooms].sort((a, b) => {
      const aKey = a.bounds.x + a.bounds.y;
      const bKey = b.bounds.x + b.bounds.y;
      return aKey - bKey;
    });

    // Draw each room as a 3D extruded box
    for (const room of sortedRooms) {
      const rx = room.bounds.x;
      const ry = room.bounds.y;
      const rw = room.bounds.width;
      const rd = room.bounds.depth;
      const rh = room.type === 'hallway' ? wallHeight * 0.4 : wallHeight;

      const floorColor = ROOM_3D_COLORS[room.type] || '#e5e7eb';
      const wallColor = ROOM_WALL_COLORS[room.type] || '#9ca3af';

      // Room floor
      const rfPts = [
        proj(rx, ry, 0.05),
        proj(rx + rw, ry, 0.05),
        proj(rx + rw, ry + rd, 0.05),
        proj(rx, ry + rd, 0.05),
      ];
      ctx.beginPath();
      ctx.moveTo(rfPts[0][0], rfPts[0][1]);
      rfPts.forEach((p) => ctx.lineTo(p[0], p[1]));
      ctx.closePath();
      ctx.fillStyle = floorColor;
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Right wall (front-facing in iso)
      const rwPts = [
        proj(rx + rw, ry, 0),
        proj(rx + rw, ry + rd, 0),
        proj(rx + rw, ry + rd, rh),
        proj(rx + rw, ry, rh),
      ];
      ctx.beginPath();
      ctx.moveTo(rwPts[0][0], rwPts[0][1]);
      rwPts.forEach((p) => ctx.lineTo(p[0], p[1]));
      ctx.closePath();
      ctx.fillStyle = hexToRgba(wallColor, 0.35);
      ctx.fill();
      ctx.strokeStyle = darkenHex(wallColor, 0.7);
      ctx.lineWidth = 1;
      ctx.stroke();

      // Front wall (bottom-facing in iso)
      const fwPts = [
        proj(rx, ry + rd, 0),
        proj(rx + rw, ry + rd, 0),
        proj(rx + rw, ry + rd, rh),
        proj(rx, ry + rd, rh),
      ];
      ctx.beginPath();
      ctx.moveTo(fwPts[0][0], fwPts[0][1]);
      fwPts.forEach((p) => ctx.lineTo(p[0], p[1]));
      ctx.closePath();
      ctx.fillStyle = hexToRgba(wallColor, 0.25);
      ctx.fill();
      ctx.strokeStyle = darkenHex(wallColor, 0.7);
      ctx.lineWidth = 1;
      ctx.stroke();

      // Top face
      const topPts = [
        proj(rx, ry, rh),
        proj(rx + rw, ry, rh),
        proj(rx + rw, ry + rd, rh),
        proj(rx, ry + rd, rh),
      ];
      ctx.beginPath();
      ctx.moveTo(topPts[0][0], topPts[0][1]);
      topPts.forEach((p) => ctx.lineTo(p[0], p[1]));
      ctx.closePath();
      ctx.fillStyle = hexToRgba(wallColor, 0.15);
      ctx.fill();
      ctx.strokeStyle = darkenHex(wallColor, 0.7);
      ctx.lineWidth = 0.75;
      ctx.stroke();

      // Window cutouts on right wall if room is large enough
      if (room.bounds.width > 2 && room.type !== 'hallway' && room.type !== 'closet') {
        const winY1 = ry + rd;
        const winZ0 = rh * 0.3;
        const winZ1 = rh * 0.75;
        const winX0 = rx + rw * 0.2;
        const winX1 = rx + rw * 0.8;

        const winPts = [
          proj(winX0, winY1 - 0.01, winZ0),
          proj(winX1, winY1 - 0.01, winZ0),
          proj(winX1, winY1 - 0.01, winZ1),
          proj(winX0, winY1 - 0.01, winZ1),
        ];
        ctx.beginPath();
        ctx.moveTo(winPts[0][0], winPts[0][1]);
        winPts.forEach((p) => ctx.lineTo(p[0], p[1]));
        ctx.closePath();
        ctx.fillStyle = 'rgba(147, 197, 253, 0.5)';
        ctx.fill();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 0.75;
        ctx.stroke();
      }

      // Room label on floor
      const labelPos = proj(rx + rw / 2, ry + rd / 2, 0.1);
      const labelSize = Math.max(Math.min(rw * scl * 0.12, 11), 6);
      ctx.font = `bold ${labelSize}px monospace`;
      ctx.fillStyle = '#334155';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const typeLabel = room.type.toUpperCase();
      ctx.fillText(typeLabel, labelPos[0], labelPos[1] - labelSize * 0.5);

      ctx.font = `${labelSize * 0.75}px monospace`;
      ctx.fillStyle = '#64748b';
      ctx.fillText(`${room.area.toFixed(0)} m²`, labelPos[0], labelPos[1] + labelSize * 0.4);
    }

    // Draw exterior wall outlines (thicker)
    const wallOutline = [
      proj(0, 0, 0),
      proj(buildingWidth, 0, 0),
      proj(buildingWidth, buildingDepth, 0),
      proj(0, buildingDepth, 0),
    ];
    ctx.beginPath();
    ctx.moveTo(wallOutline[0][0], wallOutline[0][1]);
    wallOutline.forEach((p) => ctx.lineTo(p[0], p[1]));
    ctx.closePath();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Exterior walls top edge
    const wallTopOutline = [
      proj(0, 0, wallHeight),
      proj(buildingWidth, 0, wallHeight),
      proj(buildingWidth, buildingDepth, wallHeight),
      proj(0, buildingDepth, wallHeight),
    ];
    ctx.beginPath();
    ctx.moveTo(wallTopOutline[0][0], wallTopOutline[0][1]);
    wallTopOutline.forEach((p) => ctx.lineTo(p[0], p[1]));
    ctx.closePath();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Vertical edges
    const corners = [
      [0, 0],
      [buildingWidth, 0],
      [buildingWidth, buildingDepth],
      [0, buildingDepth],
    ];
    corners.forEach(([cx, cy]) => {
      const bottom = proj(cx, cy, 0);
      const top = proj(cx, cy, wallHeight);
      ctx.beginPath();
      ctx.moveTo(bottom[0], bottom[1]);
      ctx.lineTo(top[0], top[1]);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Floor label
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Floor ${floor.floorNumber}`, 12, 12);

    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`${floor.grossArea.toFixed(0)} m² gross | ${floor.netArea.toFixed(0)} m² net`, 12, 30);
    ctx.fillText(`Height: ${floor.height.toFixed(1)} m AFF`, 12, 44);

    // Legend
    const legendY = h - 20;
    ctx.font = '9px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('3D Isometric View — SiteSync OS Spatial Workbench', w / 2, legendY);
  }, [floor, buildingWidth, buildingDepth, floorHeight, projectType]);

  useEffect(() => {
    drawScene();

    const handleResize = () => drawScene();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawScene]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded-lg"
      style={{ minHeight: '300px' }}
    />
  );
}
