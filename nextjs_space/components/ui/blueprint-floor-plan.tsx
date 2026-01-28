'use client';

import React, { useMemo } from 'react';

export interface BlueprintRoom {
  id: string;
  name: string;
  type: string;
  bounds: { x: number; y: number; width: number; depth: number };
  area: number;
  adaAccessible: boolean;
}

export interface BlueprintFloorData {
  floorNumber: number;
  height: number;
  sliceHeight: number;
  rooms: BlueprintRoom[];
  grossArea: number;
  netArea: number;
}

interface BlueprintFloorPlanProps {
  floor: BlueprintFloorData;
  buildingWidth: number;
  buildingDepth: number;
  projectType: string;
  buildingName?: string;
}

const ROOM_COLORS: Record<string, string> = {
  bedroom: '#e8f0fe',
  bathroom: '#d1ecf1',
  kitchen: '#fff3cd',
  living: '#f0f4e8',
  dining: '#fce8e8',
  hallway: '#f5f5f5',
  closet: '#ede7f6',
  utility: '#fff8e1',
  office: '#e3f2fd',
  lobby: '#e8eaf6',
  retail: '#fce4ec',
  parking: '#eceff1',
  mechanical: '#efebe9',
};

const ROOM_LABELS: Record<string, string> = {
  bedroom: 'BEDROOM',
  bathroom: 'BATH',
  kitchen: 'KITCHEN',
  living: 'LIVING',
  dining: 'DINING',
  hallway: 'CORRIDOR',
  closet: 'CL.',
  utility: 'UTIL.',
  office: 'OFFICE',
  lobby: 'LOBBY',
  retail: 'RETAIL',
  parking: 'PARKING',
  mechanical: 'MECH.',
};

export function BlueprintFloorPlan({
  floor,
  buildingWidth,
  buildingDepth,
  projectType,
  buildingName,
}: BlueprintFloorPlanProps) {
  const scale = 12; // pixels per meter
  const margin = 60;
  const titleBlockHeight = 50;

  const svgWidth = buildingWidth * scale + margin * 2;
  const svgHeight = buildingDepth * scale + margin * 2 + titleBlockHeight;

  const drawX = (m: number) => margin + m * scale;
  const drawY = (m: number) => margin + m * scale;

  // Generate window positions along exterior walls
  const windows = useMemo(() => {
    const wins: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      orientation: 'h' | 'v';
    }> = [];
    const windowSpacing = 3; // meters between windows
    const windowWidth = 1.4;

    // North wall windows
    for (let wx = 2; wx < buildingWidth - 1; wx += windowSpacing) {
      wins.push({
        x: wx,
        y: -0.15,
        width: windowWidth,
        height: 0.3,
        orientation: 'h',
      });
    }
    // South wall windows
    for (let wx = 2; wx < buildingWidth - 1; wx += windowSpacing) {
      wins.push({
        x: wx,
        y: buildingDepth - 0.15,
        width: windowWidth,
        height: 0.3,
        orientation: 'h',
      });
    }
    // East wall windows
    for (let wy = 2; wy < buildingDepth - 1; wy += windowSpacing) {
      wins.push({
        x: buildingWidth - 0.15,
        y: wy,
        width: 0.3,
        height: windowWidth,
        orientation: 'v',
      });
    }
    // West wall windows
    for (let wy = 2; wy < buildingDepth - 1; wy += windowSpacing) {
      wins.push({
        x: -0.15,
        y: wy,
        width: 0.3,
        height: windowWidth,
        orientation: 'v',
      });
    }
    return wins;
  }, [buildingWidth, buildingDepth]);

  // Generate door positions for each room
  const doors = useMemo(() => {
    const doorList: Array<{
      x: number;
      y: number;
      swing: 'left' | 'right' | 'up' | 'down';
    }> = [];

    floor.rooms.forEach((room) => {
      if (room.type === 'hallway' || room.type === 'parking') return;

      // Place door at the edge closest to corridor or boundary
      const doorX = room.bounds.x + room.bounds.width * 0.3;
      const doorY = room.bounds.y + room.bounds.depth;

      doorList.push({
        x: doorX,
        y: doorY,
        swing: 'down',
      });
    });

    return doorList;
  }, [floor.rooms]);

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full h-full"
      style={{ background: '#ffffff' }}
    >
      <defs>
        {/* Blueprint grid pattern */}
        <pattern id={`grid-${floor.floorNumber}`} width={scale} height={scale} patternUnits="userSpaceOnUse">
          <path
            d={`M ${scale} 0 L 0 0 0 ${scale}`}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="0.5"
          />
        </pattern>
        {/* Hatch pattern for walls */}
        <pattern id={`wall-hatch-${floor.floorNumber}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="4" stroke="#94a3b8" strokeWidth="0.5" />
        </pattern>
      </defs>

      {/* Background grid */}
      <rect
        x={margin - 10}
        y={margin - 10}
        width={buildingWidth * scale + 20}
        height={buildingDepth * scale + 20}
        fill={`url(#grid-${floor.floorNumber})`}
      />

      {/* Room fills */}
      {floor.rooms.map((room) => (
        <rect
          key={room.id}
          x={drawX(room.bounds.x)}
          y={drawY(room.bounds.y)}
          width={room.bounds.width * scale}
          height={room.bounds.depth * scale}
          fill={ROOM_COLORS[room.type] || '#f9fafb'}
          stroke="#cbd5e1"
          strokeWidth="0.5"
        />
      ))}

      {/* Exterior walls - thick outline */}
      <rect
        x={drawX(0)}
        y={drawY(0)}
        width={buildingWidth * scale}
        height={buildingDepth * scale}
        fill="none"
        stroke="#1e293b"
        strokeWidth="3"
      />

      {/* Interior walls */}
      {floor.rooms.map((room) => (
        <rect
          key={`wall-${room.id}`}
          x={drawX(room.bounds.x)}
          y={drawY(room.bounds.y)}
          width={room.bounds.width * scale}
          height={room.bounds.depth * scale}
          fill="none"
          stroke="#475569"
          strokeWidth="1.5"
        />
      ))}

      {/* Windows on exterior walls */}
      {windows.map((win, i) => (
        <g key={`win-${i}`}>
          <rect
            x={drawX(win.x)}
            y={drawY(win.y)}
            width={win.width * scale}
            height={win.height * scale}
            fill="#bfdbfe"
            stroke="#3b82f6"
            strokeWidth="1"
          />
          {/* Double line for window symbol */}
          {win.orientation === 'h' ? (
            <>
              <line
                x1={drawX(win.x)}
                y1={drawY(win.y + win.height * 0.35)}
                x2={drawX(win.x + win.width)}
                y2={drawY(win.y + win.height * 0.35)}
                stroke="#3b82f6"
                strokeWidth="0.5"
              />
              <line
                x1={drawX(win.x)}
                y1={drawY(win.y + win.height * 0.65)}
                x2={drawX(win.x + win.width)}
                y2={drawY(win.y + win.height * 0.65)}
                stroke="#3b82f6"
                strokeWidth="0.5"
              />
            </>
          ) : (
            <>
              <line
                x1={drawX(win.x + win.width * 0.35)}
                y1={drawY(win.y)}
                x2={drawX(win.x + win.width * 0.35)}
                y2={drawY(win.y + win.height)}
                stroke="#3b82f6"
                strokeWidth="0.5"
              />
              <line
                x1={drawX(win.x + win.width * 0.65)}
                y1={drawY(win.y)}
                x2={drawX(win.x + win.width * 0.65)}
                y2={drawY(win.y + win.height)}
                stroke="#3b82f6"
                strokeWidth="0.5"
              />
            </>
          )}
        </g>
      ))}

      {/* Door arcs */}
      {doors.map((door, i) => {
        const doorWidth = 0.9; // meters
        const dx = drawX(door.x);
        const dy = drawY(door.y);
        const dw = doorWidth * scale;

        return (
          <g key={`door-${i}`}>
            {/* Door opening (gap in wall) */}
            <rect
              x={dx}
              y={dy - 1}
              width={dw}
              height={2}
              fill="#ffffff"
            />
            {/* Door leaf */}
            <line
              x1={dx}
              y1={dy}
              x2={dx + dw}
              y2={dy}
              stroke="#64748b"
              strokeWidth="1.5"
            />
            {/* Door swing arc */}
            <path
              d={`M ${dx + dw} ${dy} A ${dw} ${dw} 0 0 1 ${dx} ${dy + dw}`}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
          </g>
        );
      })}

      {/* Room labels and areas */}
      {floor.rooms.map((room) => {
        const cx = drawX(room.bounds.x + room.bounds.width / 2);
        const cy = drawY(room.bounds.y + room.bounds.depth / 2);
        const label = ROOM_LABELS[room.type] || room.type.toUpperCase();
        const areaText = `${room.area.toFixed(1)} m²`;
        const fontSize = Math.min(room.bounds.width * scale * 0.12, 10);

        return (
          <g key={`label-${room.id}`}>
            <text
              x={cx}
              y={cy - fontSize * 0.4}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={Math.max(fontSize, 6)}
              fontFamily="monospace"
              fontWeight="600"
              fill="#1e293b"
              letterSpacing="0.5"
            >
              {label}
            </text>
            <text
              x={cx}
              y={cy + fontSize * 0.8}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={Math.max(fontSize * 0.75, 5)}
              fontFamily="monospace"
              fill="#64748b"
            >
              {areaText}
            </text>
            {room.name.includes('Unit') && (
              <text
                x={cx}
                y={cy + fontSize * 1.8}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={Math.max(fontSize * 0.65, 4.5)}
                fontFamily="monospace"
                fill="#94a3b8"
              >
                {room.name.split('(')[1]?.replace(')', '') || ''}
              </text>
            )}
            {room.adaAccessible && (
              <g transform={`translate(${cx + room.bounds.width * scale * 0.3}, ${cy - room.bounds.depth * scale * 0.3})`}>
                <circle r="4" fill="#2563eb" opacity="0.8" />
                <text
                  x="0"
                  y="0.5"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="4"
                  fill="white"
                  fontWeight="bold"
                >
                  A
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Dimension lines - Width */}
      <g>
        {/* Top dimension */}
        <line
          x1={drawX(0)}
          y1={margin - 30}
          x2={drawX(buildingWidth)}
          y2={margin - 30}
          stroke="#1e293b"
          strokeWidth="0.75"
        />
        <line x1={drawX(0)} y1={margin - 35} x2={drawX(0)} y2={margin - 25} stroke="#1e293b" strokeWidth="0.75" />
        <line x1={drawX(buildingWidth)} y1={margin - 35} x2={drawX(buildingWidth)} y2={margin - 25} stroke="#1e293b" strokeWidth="0.75" />
        {/* Arrowheads */}
        <polygon points={`${drawX(0)},${margin - 30} ${drawX(0) + 4},${margin - 33} ${drawX(0) + 4},${margin - 27}`} fill="#1e293b" />
        <polygon points={`${drawX(buildingWidth)},${margin - 30} ${drawX(buildingWidth) - 4},${margin - 33} ${drawX(buildingWidth) - 4},${margin - 27}`} fill="#1e293b" />
        <text
          x={drawX(buildingWidth / 2)}
          y={margin - 35}
          textAnchor="middle"
          fontSize="8"
          fontFamily="monospace"
          fill="#1e293b"
        >
          {buildingWidth.toFixed(1)} m
        </text>
      </g>

      {/* Dimension lines - Depth */}
      <g>
        <line
          x1={margin - 30}
          y1={drawY(0)}
          x2={margin - 30}
          y2={drawY(buildingDepth)}
          stroke="#1e293b"
          strokeWidth="0.75"
        />
        <line x1={margin - 35} y1={drawY(0)} x2={margin - 25} y2={drawY(0)} stroke="#1e293b" strokeWidth="0.75" />
        <line x1={margin - 35} y1={drawY(buildingDepth)} x2={margin - 25} y2={drawY(buildingDepth)} stroke="#1e293b" strokeWidth="0.75" />
        <polygon points={`${margin - 30},${drawY(0)} ${margin - 33},${drawY(0) + 4} ${margin - 27},${drawY(0) + 4}`} fill="#1e293b" />
        <polygon points={`${margin - 30},${drawY(buildingDepth)} ${margin - 33},${drawY(buildingDepth) - 4} ${margin - 27},${drawY(buildingDepth) - 4}`} fill="#1e293b" />
        <text
          x={margin - 35}
          y={drawY(buildingDepth / 2)}
          textAnchor="middle"
          fontSize="8"
          fontFamily="monospace"
          fill="#1e293b"
          transform={`rotate(-90, ${margin - 35}, ${drawY(buildingDepth / 2)})`}
        >
          {buildingDepth.toFixed(1)} m
        </text>
      </g>

      {/* North arrow */}
      <g transform={`translate(${svgWidth - 35}, ${margin + 10})`}>
        <line x1="0" y1="20" x2="0" y2="0" stroke="#1e293b" strokeWidth="1.5" />
        <polygon points="0,0 -4,7 4,7" fill="#1e293b" />
        <text x="0" y="-4" textAnchor="middle" fontSize="7" fontFamily="monospace" fontWeight="bold" fill="#1e293b">
          N
        </text>
      </g>

      {/* Title block */}
      <g>
        <rect
          x={margin}
          y={svgHeight - titleBlockHeight}
          width={buildingWidth * scale}
          height={titleBlockHeight - 5}
          fill="#f8fafc"
          stroke="#1e293b"
          strokeWidth="1.5"
        />
        <line
          x1={margin + buildingWidth * scale * 0.55}
          y1={svgHeight - titleBlockHeight}
          x2={margin + buildingWidth * scale * 0.55}
          y2={svgHeight - 5}
          stroke="#1e293b"
          strokeWidth="0.75"
        />
        <text
          x={margin + 8}
          y={svgHeight - titleBlockHeight + 16}
          fontSize="9"
          fontFamily="monospace"
          fontWeight="bold"
          fill="#1e293b"
        >
          {buildingName || `${projectType.replace(/-/g, ' ').toUpperCase()} BUILDING`}
        </text>
        <text
          x={margin + 8}
          y={svgHeight - titleBlockHeight + 28}
          fontSize="7"
          fontFamily="monospace"
          fill="#475569"
        >
          FLOOR {floor.floorNumber} PLAN - SECTION AT {floor.sliceHeight}m AFF
        </text>
        <text
          x={margin + 8}
          y={svgHeight - titleBlockHeight + 39}
          fontSize="6"
          fontFamily="monospace"
          fill="#94a3b8"
        >
          GROSS: {floor.grossArea.toFixed(0)} m² | NET: {floor.netArea.toFixed(0)} m² | SCALE: 1:{Math.round(1000 / scale)}
        </text>
        <text
          x={margin + buildingWidth * scale * 0.55 + 8}
          y={svgHeight - titleBlockHeight + 16}
          fontSize="7"
          fontFamily="monospace"
          fontWeight="bold"
          fill="#1e293b"
        >
          SiteSync OS
        </text>
        <text
          x={margin + buildingWidth * scale * 0.55 + 8}
          y={svgHeight - titleBlockHeight + 28}
          fontSize="6"
          fontFamily="monospace"
          fill="#475569"
        >
          SPATIAL WORKBENCH
        </text>
        <text
          x={margin + buildingWidth * scale * 0.55 + 8}
          y={svgHeight - titleBlockHeight + 39}
          fontSize="6"
          fontFamily="monospace"
          fill="#94a3b8"
        >
          PARAMETRIC ENGINE OUTPUT
        </text>
      </g>
    </svg>
  );
}
