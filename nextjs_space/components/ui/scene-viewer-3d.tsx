'use client';

import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  PerspectiveCamera,
  Environment,
  Grid,
  Html,
  useHelper,
} from '@react-three/drei';
import * as THREE from 'three';

// Types for scene objects
export interface SceneObject {
  id: string;
  name: string;
  type: 'building' | 'ground' | 'equipment' | 'vegetation' | 'vehicle' | 'custom';
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  color?: string;
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface Scene3DProps {
  objects?: SceneObject[];
  selectedObjectId?: string | null;
  onObjectSelect?: (object: SceneObject | null) => void;
  showGrid?: boolean;
  showAxes?: boolean;
  backgroundColor?: string;
  environmentPreset?: 'sunset' | 'dawn' | 'night' | 'warehouse' | 'forest' | 'apartment' | 'studio' | 'city' | 'park' | 'lobby';
}

// Building component
function Building({
  position,
  dimensions,
  color = '#94a3b8',
  isSelected,
  onClick,
  name,
}: {
  position: [number, number, number];
  dimensions: { width: number; height: number; depth: number };
  color?: string;
  isSelected?: boolean;
  onClick?: () => void;
  name?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      {/* Main building body */}
      <mesh
        ref={meshRef}
        position={[0, dimensions.height / 2, 0]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[dimensions.width, dimensions.height, dimensions.depth]} />
        <meshStandardMaterial
          color={isSelected ? '#3b82f6' : hovered ? '#60a5fa' : color}
          metalness={0.2}
          roughness={0.7}
        />
      </mesh>

      {/* Windows (simple representation) */}
      {Array.from({ length: Math.floor(dimensions.height / 3) }).map((_, floor) =>
        Array.from({ length: Math.floor(dimensions.width / 2) }).map((_, col) => (
          <mesh
            key={`window-${floor}-${col}`}
            position={[
              -dimensions.width / 2 + 1 + col * 2,
              1.5 + floor * 3,
              dimensions.depth / 2 + 0.01,
            ]}
          >
            <planeGeometry args={[1, 1.5]} />
            <meshStandardMaterial color="#bfdbfe" metalness={0.5} roughness={0.1} />
          </mesh>
        ))
      )}

      {/* Roof */}
      <mesh position={[0, dimensions.height + 0.25, 0]}>
        <boxGeometry args={[dimensions.width + 0.5, 0.5, dimensions.depth + 0.5]} />
        <meshStandardMaterial color="#475569" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Label */}
      {(hovered || isSelected) && name && (
        <Html position={[0, dimensions.height + 2, 0]} center>
          <div className="bg-black/80 text-white px-2 py-1 rounded text-sm whitespace-nowrap">
            {name}
          </div>
        </Html>
      )}
    </group>
  );
}

// Construction equipment component
function Equipment({
  position,
  type,
  color = '#f59e0b',
  isSelected,
  onClick,
  name,
}: {
  position: [number, number, number];
  type: string;
  color?: string;
  isSelected?: boolean;
  onClick?: () => void;
  name?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      {/* Equipment base */}
      <mesh
        position={[0, 0.5, 0]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[2, 1, 4]} />
        <meshStandardMaterial
          color={isSelected ? '#3b82f6' : hovered ? '#fbbf24' : color}
          metalness={0.4}
          roughness={0.5}
        />
      </mesh>

      {/* Cabin */}
      <mesh position={[0, 1.5, -1]}>
        <boxGeometry args={[1.5, 1, 1.5]} />
        <meshStandardMaterial color="#1e293b" metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Arm (for excavator-type) */}
      <mesh position={[0, 1.5, 2]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.5, 0.5, 3]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Label */}
      {(hovered || isSelected) && name && (
        <Html position={[0, 3, 0]} center>
          <div className="bg-black/80 text-white px-2 py-1 rounded text-sm whitespace-nowrap">
            {name}
          </div>
        </Html>
      )}
    </group>
  );
}

// Vehicle component
function Vehicle({
  position,
  color = '#ef4444',
  isSelected,
  onClick,
  name,
}: {
  position: [number, number, number];
  color?: string;
  isSelected?: boolean;
  onClick?: () => void;
  name?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      {/* Body */}
      <mesh
        position={[0, 0.5, 0]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[1.5, 0.6, 3]} />
        <meshStandardMaterial
          color={isSelected ? '#3b82f6' : hovered ? '#f87171' : color}
          metalness={0.5}
          roughness={0.4}
        />
      </mesh>

      {/* Cabin */}
      <mesh position={[0, 1, -0.3]}>
        <boxGeometry args={[1.3, 0.6, 1.2]} />
        <meshStandardMaterial color="#1e293b" metalness={0.3} roughness={0.3} />
      </mesh>

      {/* Wheels */}
      {[[-0.75, 0.25, -0.8], [0.75, 0.25, -0.8], [-0.75, 0.25, 0.8], [0.75, 0.25, 0.8]].map(
        (pos, i) => (
          <mesh key={i} position={pos as [number, number, number]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.25, 0.25, 0.2, 16]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        )
      )}

      {/* Label */}
      {(hovered || isSelected) && name && (
        <Html position={[0, 2, 0]} center>
          <div className="bg-black/80 text-white px-2 py-1 rounded text-sm whitespace-nowrap">
            {name}
          </div>
        </Html>
      )}
    </group>
  );
}

// Vegetation component
function Vegetation({
  position,
  scale = [1, 1, 1],
  color = '#22c55e',
  isSelected,
  onClick,
  name,
}: {
  position: [number, number, number];
  scale?: [number, number, number];
  color?: string;
  isSelected?: boolean;
  onClick?: () => void;
  name?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh
        position={[0, 1, 0]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[0.15, 0.2, 2, 8]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>

      {/* Foliage */}
      <mesh position={[0, 2.5, 0]}>
        <coneGeometry args={[1.2, 2.5, 8]} />
        <meshStandardMaterial
          color={isSelected ? '#3b82f6' : hovered ? '#4ade80' : color}
        />
      </mesh>

      {/* Label */}
      {(hovered || isSelected) && name && (
        <Html position={[0, 4, 0]} center>
          <div className="bg-black/80 text-white px-2 py-1 rounded text-sm whitespace-nowrap">
            {name}
          </div>
        </Html>
      )}
    </group>
  );
}

// Ground plane component
function Ground({
  size = [100, 100],
  color = '#78716c',
}: {
  size?: [number, number];
  color?: string;
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

// Scene object renderer
function SceneObjects({
  objects,
  selectedObjectId,
  onObjectSelect,
}: {
  objects: SceneObject[];
  selectedObjectId?: string | null;
  onObjectSelect?: (object: SceneObject | null) => void;
}) {
  return (
    <>
      {objects.map((obj) => {
        const isSelected = obj.id === selectedObjectId;
        const handleClick = () => onObjectSelect?.(isSelected ? null : obj);

        switch (obj.type) {
          case 'building':
            return (
              <Building
                key={obj.id}
                position={obj.position}
                dimensions={{
                  width: obj.dimensions?.width ?? 10,
                  height: obj.dimensions?.height ?? 15,
                  depth: obj.dimensions?.depth ?? 10,
                }}
                color={obj.color}
                isSelected={isSelected}
                onClick={handleClick}
                name={obj.name}
              />
            );

          case 'equipment':
            return (
              <Equipment
                key={obj.id}
                position={obj.position}
                type="excavator"
                color={obj.color}
                isSelected={isSelected}
                onClick={handleClick}
                name={obj.name}
              />
            );

          case 'vehicle':
            return (
              <Vehicle
                key={obj.id}
                position={obj.position}
                color={obj.color}
                isSelected={isSelected}
                onClick={handleClick}
                name={obj.name}
              />
            );

          case 'vegetation':
            return (
              <Vegetation
                key={obj.id}
                position={obj.position}
                scale={obj.scale}
                color={obj.color}
                isSelected={isSelected}
                onClick={handleClick}
                name={obj.name}
              />
            );

          case 'ground':
            return (
              <Ground
                key={obj.id}
                size={obj.dimensions ? [obj.dimensions.width || 100, obj.dimensions.depth || 100] : undefined}
                color={obj.color}
              />
            );

          default:
            return (
              <mesh
                key={obj.id}
                position={obj.position}
                rotation={obj.rotation}
                scale={obj.scale}
                onClick={handleClick}
              >
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color={obj.color || '#888'} />
              </mesh>
            );
        }
      })}
    </>
  );
}

// Loading component
function Loader() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading 3D scene...</p>
      </div>
    </Html>
  );
}

// Main 3D Scene Viewer Component
export function SceneViewer3D({
  objects = [],
  selectedObjectId,
  onObjectSelect,
  showGrid = true,
  showAxes = false,
  backgroundColor = '#1e293b',
  environmentPreset = 'city',
}: Scene3DProps) {
  return (
    <div className="w-full h-full min-h-[400px] rounded-lg overflow-hidden">
      <Canvas shadows>
        <Suspense fallback={<Loader />}>
          {/* Camera */}
          <PerspectiveCamera makeDefault position={[30, 25, 30]} fov={50} />

          {/* Controls */}
          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            minDistance={5}
            maxDistance={200}
            maxPolarAngle={Math.PI / 2 - 0.1}
          />

          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[50, 50, 25]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <hemisphereLight args={['#87ceeb', '#362d1e', 0.5]} />

          {/* Environment */}
          <Environment preset={environmentPreset} background={false} />

          {/* Background */}
          <color attach="background" args={[backgroundColor]} />

          {/* Grid */}
          {showGrid && (
            <Grid
              position={[0, 0.01, 0]}
              args={[100, 100]}
              cellSize={1}
              cellThickness={0.5}
              cellColor="#444"
              sectionSize={10}
              sectionThickness={1}
              sectionColor="#666"
              fadeDistance={100}
              fadeStrength={1}
              followCamera={false}
            />
          )}

          {/* Axes Helper */}
          {showAxes && <axesHelper args={[10]} />}

          {/* Scene Objects */}
          <SceneObjects
            objects={objects}
            selectedObjectId={selectedObjectId}
            onObjectSelect={onObjectSelect}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Export a sample construction site scene
export function getDefaultConstructionScene(): SceneObject[] {
  return [
    {
      id: 'ground-1',
      name: 'Site Ground',
      type: 'ground',
      position: [0, 0, 0],
      dimensions: { width: 100, depth: 100 },
      color: '#78716c',
    },
    {
      id: 'building-main',
      name: 'Main Building',
      type: 'building',
      position: [0, 0, 0],
      dimensions: { width: 20, height: 25, depth: 15 },
      color: '#94a3b8',
    },
    {
      id: 'building-annex',
      name: 'Annex Building',
      type: 'building',
      position: [25, 0, -5],
      dimensions: { width: 12, height: 12, depth: 10 },
      color: '#a8a29e',
    },
    {
      id: 'equipment-1',
      name: 'Excavator #1',
      type: 'equipment',
      position: [-15, 0, 20],
      color: '#f59e0b',
    },
    {
      id: 'equipment-2',
      name: 'Crane #1',
      type: 'equipment',
      position: [10, 0, -20],
      color: '#f97316',
    },
    {
      id: 'vehicle-1',
      name: 'Pickup Truck',
      type: 'vehicle',
      position: [-25, 0, 5],
      color: '#ef4444',
    },
    {
      id: 'vehicle-2',
      name: 'Site Manager Vehicle',
      type: 'vehicle',
      position: [-20, 0, 10],
      color: '#3b82f6',
    },
    {
      id: 'tree-1',
      name: 'Oak Tree',
      type: 'vegetation',
      position: [30, 0, 20],
      scale: [1.5, 1.5, 1.5],
      color: '#22c55e',
    },
    {
      id: 'tree-2',
      name: 'Pine Tree',
      type: 'vegetation',
      position: [35, 0, 15],
      color: '#15803d',
    },
    {
      id: 'tree-3',
      name: 'Maple Tree',
      type: 'vegetation',
      position: [-30, 0, -15],
      scale: [1.2, 1.2, 1.2],
      color: '#16a34a',
    },
  ];
}

export default SceneViewer3D;
