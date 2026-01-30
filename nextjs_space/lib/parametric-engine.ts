/**
 * Parametric Detail Engine for SiteSync OS
 *
 * Bridges the gap between LOD 100 AI massing blocks and construction-ready
 * parametric geometry by applying rules for windows, materials, textures,
 * solar panels, and other building elements.
 *
 * Ecosystem Flow:
 *   Massing Tool (GLB Blocks) -> Design Services (Aesthetic Prompts) ->
 *   Spatial Workbench (2D/3D Plans) -> SiteSync OS (Construction Docs)
 */

// ---------------------------------------------------------------------------
// Level of Development (LOD) Definitions
// ---------------------------------------------------------------------------

export type LODLevel = 100 | 200 | 300 | 350 | 400;

export interface LODDefinition {
  level: LODLevel;
  label: string;
  description: string;
  includes: string[];
}

export const LOD_DEFINITIONS: Record<LODLevel, LODDefinition> = {
  100: {
    level: 100,
    label: 'Conceptual',
    description: 'Gross area, height, volume, location, and orientation',
    includes: ['Massing volumes', 'Building footprint', 'Overall height'],
  },
  200: {
    level: 200,
    label: 'Schematic Design',
    description: 'Approximate size, shape, location, and orientation with generic materials',
    includes: [
      'Approximate floor-to-floor height',
      'Generic wall/roof assemblies',
      'Window openings (approximate)',
      'Primary structural grid',
    ],
  },
  300: {
    level: 300,
    label: 'Design Development',
    description: 'Specific assemblies with accurate quantity, size, shape, location, and orientation',
    includes: [
      'Specific window types & sizes',
      'Wall assembly detail',
      'Roof construction type',
      'Material selections',
      'Solar panel zones',
      'MEP rough-in zones',
    ],
  },
  350: {
    level: 350,
    label: 'Construction Documentation',
    description: 'Detail sufficient for coordination between disciplines',
    includes: [
      'Connection details',
      'Support & attachment points',
      'Clash detection geometry',
      'Fabrication-level framing',
      'Duct/pipe routing',
    ],
  },
  400: {
    level: 400,
    label: 'Fabrication',
    description: 'Detail sufficient for fabrication and assembly of the component',
    includes: [
      'Shop drawing geometry',
      'Exact material cut lists',
      'Hardware & fastener placement',
      'Erection sequencing info',
    ],
  },
};

// ---------------------------------------------------------------------------
// Material & Texture Library
// ---------------------------------------------------------------------------

export interface MaterialDefinition {
  id: string;
  name: string;
  category: MaterialCategory;
  color: [number, number, number, number]; // RGBA 0-1
  metallic: number;
  roughness: number;
  opacity: number;
  textureHint: string; // Prompt for AI texture generation
  sustainabilityRating?: 'A' | 'B' | 'C' | 'D';
  rValue?: number; // Thermal resistance
}

export type MaterialCategory =
  | 'concrete'
  | 'glass'
  | 'metal'
  | 'wood'
  | 'brick'
  | 'stone'
  | 'composite'
  | 'solar'
  | 'roofing'
  | 'insulation'
  | 'cladding';

export const MATERIAL_LIBRARY: MaterialDefinition[] = [
  {
    id: 'concrete-structural',
    name: 'Structural Concrete',
    category: 'concrete',
    color: [0.72, 0.71, 0.68, 1],
    metallic: 0,
    roughness: 0.85,
    opacity: 1,
    textureHint: 'Poured reinforced concrete, form tie pattern, light grey',
    sustainabilityRating: 'C',
    rValue: 0.08,
  },
  {
    id: 'concrete-precast',
    name: 'Precast Concrete Panel',
    category: 'concrete',
    color: [0.8, 0.78, 0.75, 1],
    metallic: 0,
    roughness: 0.6,
    opacity: 1,
    textureHint: 'Smooth precast concrete panel, off-white, slight aggregate',
    sustainabilityRating: 'C',
    rValue: 0.1,
  },
  {
    id: 'glass-curtainwall',
    name: 'Curtain Wall Glass',
    category: 'glass',
    color: [0.6, 0.75, 0.85, 0.3],
    metallic: 0.1,
    roughness: 0.05,
    opacity: 0.3,
    textureHint: 'Low-E double-pane curtain wall glass, blue-green tint, reflective',
    sustainabilityRating: 'B',
    rValue: 3.1,
  },
  {
    id: 'glass-residential',
    name: 'Residential Window Glass',
    category: 'glass',
    color: [0.7, 0.8, 0.88, 0.25],
    metallic: 0.05,
    roughness: 0.02,
    opacity: 0.25,
    textureHint: 'Clear double-pane residential glass, slight reflection',
    sustainabilityRating: 'B',
    rValue: 2.8,
  },
  {
    id: 'metal-aluminum',
    name: 'Aluminum Mullion / Trim',
    category: 'metal',
    color: [0.77, 0.78, 0.8, 1],
    metallic: 0.9,
    roughness: 0.25,
    opacity: 1,
    textureHint: 'Anodized aluminum, brushed satin finish, silver',
    sustainabilityRating: 'B',
  },
  {
    id: 'metal-steel-dark',
    name: 'Dark Steel Cladding',
    category: 'metal',
    color: [0.2, 0.22, 0.25, 1],
    metallic: 0.85,
    roughness: 0.35,
    opacity: 1,
    textureHint: 'Dark painted steel panel cladding, subtle corrugation',
    sustainabilityRating: 'B',
  },
  {
    id: 'wood-clt',
    name: 'Cross-Laminated Timber',
    category: 'wood',
    color: [0.65, 0.5, 0.35, 1],
    metallic: 0,
    roughness: 0.7,
    opacity: 1,
    textureHint: 'Cross-laminated timber panel, visible grain pattern, warm tone',
    sustainabilityRating: 'A',
    rValue: 1.25,
  },
  {
    id: 'brick-red',
    name: 'Red Brick',
    category: 'brick',
    color: [0.6, 0.25, 0.15, 1],
    metallic: 0,
    roughness: 0.9,
    opacity: 1,
    textureHint: 'Traditional red brick, running bond pattern, grey mortar joints',
    sustainabilityRating: 'B',
    rValue: 0.2,
  },
  {
    id: 'solar-panel',
    name: 'Photovoltaic Solar Panel',
    category: 'solar',
    color: [0.1, 0.12, 0.2, 1],
    metallic: 0.3,
    roughness: 0.1,
    opacity: 1,
    textureHint: 'Monocrystalline solar panel, dark blue-black cells, silver frame, grid lines',
    sustainabilityRating: 'A',
  },
  {
    id: 'solar-bipv',
    name: 'Building-Integrated PV',
    category: 'solar',
    color: [0.15, 0.15, 0.25, 0.85],
    metallic: 0.2,
    roughness: 0.1,
    opacity: 0.85,
    textureHint: 'Semi-transparent BIPV glass panel, dark photovoltaic cells visible through glass',
    sustainabilityRating: 'A',
  },
  {
    id: 'roof-tpo',
    name: 'TPO Roofing Membrane',
    category: 'roofing',
    color: [0.9, 0.9, 0.88, 1],
    metallic: 0,
    roughness: 0.4,
    opacity: 1,
    textureHint: 'White TPO single-ply roofing membrane, subtle seams',
    sustainabilityRating: 'B',
    rValue: 0.2,
  },
  {
    id: 'cladding-fiber-cement',
    name: 'Fiber Cement Board',
    category: 'cladding',
    color: [0.85, 0.83, 0.78, 1],
    metallic: 0,
    roughness: 0.65,
    opacity: 1,
    textureHint: 'Fiber cement panel cladding, smooth light grey, horizontal lap siding',
    sustainabilityRating: 'B',
    rValue: 0.15,
  },
];

export function getMaterialById(id: string): MaterialDefinition | undefined {
  return MATERIAL_LIBRARY.find((m) => m.id === id);
}

export function getMaterialsByCategory(category: MaterialCategory): MaterialDefinition[] {
  return MATERIAL_LIBRARY.filter((m) => m.category === category);
}

// ---------------------------------------------------------------------------
// Parametric Rules
// ---------------------------------------------------------------------------

export interface ParametricRule {
  id: string;
  name: string;
  description: string;
  category: 'envelope' | 'structure' | 'sustainability' | 'interior' | 'site';
  condition: string; // Human-readable condition
  parameters: Record<string, number | string | boolean>;
}

export interface BuildingConstraints {
  projectType: 'senior-living' | 'veteran-housing' | 'affordable' | 'mixed-use' | 'commercial' | 'custom';
  totalFloors: number;
  floorToFloorHeight: number; // meters
  footprintWidth: number; // meters
  footprintDepth: number; // meters
  windowToWallRatio: number; // 0-1
  solarCoverage: number; // 0-1 fraction of roof area
  materials: {
    facade: string; // material id
    glazing: string;
    roof: string;
    structure: string;
  };
  sustainabilityTarget?: 'LEED-Silver' | 'LEED-Gold' | 'LEED-Platinum' | 'PassiveHouse' | 'NetZero';
  accessibilityRequired?: boolean;
  unitMix?: UnitMixEntry[];
}

export interface UnitMixEntry {
  type: string; // e.g. "1BR", "2BR", "Studio"
  count: number;
  minArea: number; // sq ft
  maxArea: number;
  adaAccessible?: boolean;
}

export const DEFAULT_CONSTRAINTS: Record<string, Partial<BuildingConstraints>> = {
  'senior-living': {
    projectType: 'senior-living',
    floorToFloorHeight: 3.2,
    windowToWallRatio: 0.15,
    solarCoverage: 0.4,
    accessibilityRequired: true,
    materials: {
      facade: 'brick-red',
      glazing: 'glass-residential',
      roof: 'roof-tpo',
      structure: 'concrete-structural',
    },
    sustainabilityTarget: 'LEED-Gold',
  },
  'veteran-housing': {
    projectType: 'veteran-housing',
    floorToFloorHeight: 3.0,
    windowToWallRatio: 0.2,
    solarCoverage: 0.35,
    accessibilityRequired: true,
    materials: {
      facade: 'cladding-fiber-cement',
      glazing: 'glass-residential',
      roof: 'roof-tpo',
      structure: 'concrete-structural',
    },
    sustainabilityTarget: 'LEED-Silver',
  },
  'affordable': {
    projectType: 'affordable',
    floorToFloorHeight: 2.9,
    windowToWallRatio: 0.18,
    solarCoverage: 0.3,
    accessibilityRequired: true,
    materials: {
      facade: 'cladding-fiber-cement',
      glazing: 'glass-residential',
      roof: 'roof-tpo',
      structure: 'concrete-structural',
    },
  },
  'mixed-use': {
    projectType: 'mixed-use',
    floorToFloorHeight: 3.5,
    windowToWallRatio: 0.4,
    solarCoverage: 0.25,
    materials: {
      facade: 'concrete-precast',
      glazing: 'glass-curtainwall',
      roof: 'roof-tpo',
      structure: 'concrete-structural',
    },
    sustainabilityTarget: 'LEED-Silver',
  },
  commercial: {
    projectType: 'commercial',
    floorToFloorHeight: 4.0,
    windowToWallRatio: 0.55,
    solarCoverage: 0.2,
    materials: {
      facade: 'metal-steel-dark',
      glazing: 'glass-curtainwall',
      roof: 'roof-tpo',
      structure: 'concrete-structural',
    },
  },
};

// ---------------------------------------------------------------------------
// Parametric Generation Engine
// ---------------------------------------------------------------------------

export interface ParametricElement {
  id: string;
  type: 'window' | 'wall' | 'floor' | 'roof' | 'solar-panel' | 'door' | 'column' | 'balcony' | 'mullion';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  materialId: string;
  metadata: Record<string, unknown>;
}

export interface ParametricBuildingModel {
  id: string;
  name: string;
  lodLevel: LODLevel;
  constraints: BuildingConstraints;
  elements: ParametricElement[];
  totalArea: number; // sq meters
  envelopeArea: number; // sq meters of facade
  glazingArea: number; // sq meters of glass
  solarArea: number; // sq meters of solar panels
  estimatedEnergyProduction?: number; // kWh/year
  floorPlans: FloorPlan[];
  createdAt: string;
}

export interface FloorPlan {
  floorNumber: number;
  height: number; // from ground, meters
  sliceHeight: number; // height at which the horizontal section is taken (typically 1.2m / 4ft)
  rooms: Room[];
  grossArea: number; // sq meters
  netArea: number; // sq meters (usable)
}

export interface Room {
  id: string;
  name: string;
  type: 'bedroom' | 'bathroom' | 'kitchen' | 'living' | 'dining' | 'hallway' | 'closet' | 'utility' | 'office' | 'lobby' | 'retail' | 'parking' | 'mechanical';
  bounds: { x: number; y: number; width: number; depth: number };
  area: number; // sq meters
  adaAccessible: boolean;
}

/**
 * Generate parametric building elements from massing data + constraints.
 * This takes LOD 100 block data and elevates it to LOD 200-300.
 */
export function generateParametricModel(
  name: string,
  constraints: BuildingConstraints,
  targetLOD: LODLevel = 300
): ParametricBuildingModel {
  const elements: ParametricElement[] = [];
  const floorPlans: FloorPlan[] = [];

  const { totalFloors, floorToFloorHeight, footprintWidth, footprintDepth } = constraints;
  const buildingHeight = totalFloors * floorToFloorHeight;

  // --- Generate structural columns ---
  const columnSpacing = 6; // meters typical grid
  const colsX = Math.floor(footprintWidth / columnSpacing) + 1;
  const colsY = Math.floor(footprintDepth / columnSpacing) + 1;

  for (let ix = 0; ix < colsX; ix++) {
    for (let iy = 0; iy < colsY; iy++) {
      elements.push({
        id: `col-${ix}-${iy}`,
        type: 'column',
        position: [
          ix * columnSpacing - footprintWidth / 2,
          iy * columnSpacing - footprintDepth / 2,
          buildingHeight / 2,
        ],
        rotation: [0, 0, 0],
        scale: [0.4, 0.4, buildingHeight],
        materialId: constraints.materials.structure,
        metadata: { gridX: ix, gridY: iy },
      });
    }
  }

  // --- Generate floor slabs ---
  for (let floor = 0; floor <= totalFloors; floor++) {
    const z = floor * floorToFloorHeight;
    elements.push({
      id: `slab-${floor}`,
      type: 'floor',
      position: [0, 0, z],
      rotation: [0, 0, 0],
      scale: [footprintWidth, footprintDepth, 0.25],
      materialId: constraints.materials.structure,
      metadata: { floorNumber: floor },
    });
  }

  // --- Generate facade walls with window openings ---
  const facades: Array<{
    face: string;
    normal: [number, number, number];
    width: number;
    positionFn: (wx: number, wz: number) => [number, number, number];
    rotation: [number, number, number];
  }> = [
    {
      face: 'north',
      normal: [0, 1, 0],
      width: footprintWidth,
      positionFn: (wx, wz) => [wx - footprintWidth / 2, footprintDepth / 2, wz],
      rotation: [0, 0, 0],
    },
    {
      face: 'south',
      normal: [0, -1, 0],
      width: footprintWidth,
      positionFn: (wx, wz) => [wx - footprintWidth / 2, -footprintDepth / 2, wz],
      rotation: [0, 0, Math.PI],
    },
    {
      face: 'east',
      normal: [1, 0, 0],
      width: footprintDepth,
      positionFn: (wx, wz) => [footprintWidth / 2, wx - footprintDepth / 2, wz],
      rotation: [0, 0, Math.PI / 2],
    },
    {
      face: 'west',
      normal: [-1, 0, 0],
      width: footprintDepth,
      positionFn: (wx, wz) => [-footprintWidth / 2, wx - footprintDepth / 2, wz],
      rotation: [0, 0, -Math.PI / 2],
    },
  ];

  const windowWidth = 1.5; // meters
  const windowHeight = 1.8;
  const windowSillHeight = 0.9; // from floor level

  for (const facade of facades) {
    const wallSegments = Math.floor(facade.width / 3); // ~3m module
    for (let floor = 0; floor < totalFloors; floor++) {
      const floorZ = floor * floorToFloorHeight;

      for (let seg = 0; seg < wallSegments; seg++) {
        const segCenterX = (seg + 0.5) * (facade.width / wallSegments);

        // Decide if this segment gets a window based on WWR
        const hasWindow = Math.random() < constraints.windowToWallRatio * 2.5; // weighted
        const segHeight = floorToFloorHeight;
        const segWidth = facade.width / wallSegments;

        // Wall panel (spandrel or full)
        elements.push({
          id: `wall-${facade.face}-${floor}-${seg}`,
          type: 'wall',
          position: facade.positionFn(segCenterX, floorZ + segHeight / 2),
          rotation: facade.rotation,
          scale: [segWidth, 0.2, segHeight],
          materialId: constraints.materials.facade,
          metadata: { face: facade.face, floor, segment: seg, hasWindow },
        });

        if (hasWindow) {
          // Window element
          elements.push({
            id: `win-${facade.face}-${floor}-${seg}`,
            type: 'window',
            position: facade.positionFn(segCenterX, floorZ + windowSillHeight + windowHeight / 2),
            rotation: facade.rotation,
            scale: [windowWidth, 0.05, windowHeight],
            materialId: constraints.materials.glazing,
            metadata: { face: facade.face, floor, segment: seg },
          });

          // Mullion frame
          elements.push({
            id: `mull-${facade.face}-${floor}-${seg}`,
            type: 'mullion',
            position: facade.positionFn(segCenterX, floorZ + windowSillHeight + windowHeight / 2),
            rotation: facade.rotation,
            scale: [windowWidth + 0.1, 0.08, windowHeight + 0.1],
            materialId: 'metal-aluminum',
            metadata: { face: facade.face, floor, segment: seg },
          });
        }
      }
    }
  }

  // --- Roof & Solar Panels ---
  const roofZ = buildingHeight;
  elements.push({
    id: 'roof-membrane',
    type: 'roof',
    position: [0, 0, roofZ + 0.15],
    rotation: [0, 0, 0],
    scale: [footprintWidth, footprintDepth, 0.3],
    materialId: constraints.materials.roof,
    metadata: {},
  });

  // Solar panel array
  const solarPanelWidth = 1.0;
  const solarPanelDepth = 1.65;
  const solarSpacingX = 1.2;
  const solarSpacingY = 2.0;
  const solarAreaAvailable = footprintWidth * footprintDepth * 0.8; // 80% usable roof
  const solarAreaTarget = solarAreaAvailable * constraints.solarCoverage;
  const panelArea = solarPanelWidth * solarPanelDepth;
  const panelCount = Math.floor(solarAreaTarget / panelArea);

  const panelsPerRow = Math.floor((footprintWidth * 0.8) / solarSpacingX);
  const panelRows = Math.ceil(panelCount / panelsPerRow);

  let panelsPlaced = 0;
  for (let row = 0; row < panelRows && panelsPlaced < panelCount; row++) {
    for (let col = 0; col < panelsPerRow && panelsPlaced < panelCount; col++) {
      elements.push({
        id: `solar-${row}-${col}`,
        type: 'solar-panel',
        position: [
          col * solarSpacingX - (panelsPerRow * solarSpacingX) / 2 + solarSpacingX / 2,
          row * solarSpacingY - (panelRows * solarSpacingY) / 2 + solarSpacingY / 2,
          roofZ + 0.5,
        ],
        rotation: [0.35, 0, 0], // ~20 degree tilt
        scale: [solarPanelWidth, solarPanelDepth, 0.04],
        materialId: 'solar-panel',
        metadata: { row, col, tiltDeg: 20, wattage: 400 },
      });
      panelsPlaced++;
    }
  }

  // --- Floor Plans ---
  for (let floor = 0; floor < totalFloors; floor++) {
    const rooms: Room[] = [];
    const isGroundFloor = floor === 0;
    const grossArea = footprintWidth * footprintDepth;
    const corridorArea = footprintWidth * 1.8; // central corridor
    const netArea = grossArea - corridorArea;

    if (isGroundFloor && constraints.projectType === 'mixed-use') {
      // Ground floor: lobby + retail
      rooms.push({
        id: `room-${floor}-lobby`,
        name: 'Main Lobby',
        type: 'lobby',
        bounds: { x: 0, y: 0, width: footprintWidth * 0.3, depth: footprintDepth },
        area: footprintWidth * 0.3 * footprintDepth,
        adaAccessible: true,
      });
      rooms.push({
        id: `room-${floor}-retail`,
        name: 'Retail Space',
        type: 'retail',
        bounds: { x: footprintWidth * 0.3, y: 0, width: footprintWidth * 0.7, depth: footprintDepth },
        area: footprintWidth * 0.7 * footprintDepth,
        adaAccessible: true,
      });
    } else if (constraints.unitMix && constraints.unitMix.length > 0) {
      // Residential floors: distribute unit mix
      const unitsPerFloor = Math.ceil(
        constraints.unitMix.reduce((sum, u) => sum + u.count, 0) / (totalFloors - (constraints.projectType === 'mixed-use' ? 1 : 0))
      );
      const unitWidth = footprintWidth / Math.max(unitsPerFloor, 2);

      for (let u = 0; u < unitsPerFloor; u++) {
        const mixIndex = u % constraints.unitMix.length;
        const unitDef = constraints.unitMix[mixIndex];
        rooms.push({
          id: `room-${floor}-unit-${u}`,
          name: `Unit ${floor * 100 + u + 1} (${unitDef.type})`,
          type: 'bedroom',
          bounds: { x: u * unitWidth, y: 0, width: unitWidth, depth: footprintDepth * 0.45 },
          area: unitWidth * footprintDepth * 0.45,
          adaAccessible: unitDef.adaAccessible ?? false,
        });
      }

      // Central hallway
      rooms.push({
        id: `room-${floor}-hall`,
        name: `Hallway F${floor + 1}`,
        type: 'hallway',
        bounds: { x: 0, y: footprintDepth * 0.45, width: footprintWidth, depth: 1.8 },
        area: corridorArea,
        adaAccessible: true,
      });
    } else {
      // Generic open floor
      rooms.push({
        id: `room-${floor}-open`,
        name: `Floor ${floor + 1}`,
        type: 'office',
        bounds: { x: 0, y: 0, width: footprintWidth, depth: footprintDepth },
        area: grossArea,
        adaAccessible: constraints.accessibilityRequired ?? false,
      });
    }

    floorPlans.push({
      floorNumber: floor + 1,
      height: floor * floorToFloorHeight,
      sliceHeight: 1.2, // 4 feet AFF
      rooms,
      grossArea,
      netArea,
    });
  }

  // --- Compute Totals ---
  const totalArea = footprintWidth * footprintDepth * totalFloors;
  const perimeterPerFloor = 2 * (footprintWidth + footprintDepth);
  const envelopeArea = perimeterPerFloor * buildingHeight;
  const glazingArea = envelopeArea * constraints.windowToWallRatio;
  const solarArea = panelsPlaced * panelArea;
  const estimatedEnergyProduction = panelsPlaced * 400 * 4.5 * 365; // panels * watts * peak sun hours * days

  return {
    id: `param-${Date.now()}`,
    name,
    lodLevel: targetLOD,
    constraints,
    elements,
    totalArea,
    envelopeArea,
    glazingArea,
    solarArea,
    estimatedEnergyProduction,
    floorPlans,
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Blender Script Generator
// ---------------------------------------------------------------------------

/**
 * Generate a Blender Python script that applies parametric detail to a massing model.
 * This can be executed via the Blender MCP client.
 */
export function generateBlenderScript(model: ParametricBuildingModel): string {
  const lines: string[] = [
    '"""',
    `Auto-generated parametric script for: ${model.name}`,
    `LOD Level: ${model.lodLevel}`,
    `Generated by SiteSync OS Parametric Engine`,
    '"""',
    'import bpy',
    'import math',
    '',
    '# Clear default objects',
    'bpy.ops.object.select_all(action="SELECT")',
    'bpy.ops.object.delete()',
    '',
    '# --- Material Definitions ---',
  ];

  // Collect unique materials
  const usedMaterialIds = new Set(model.elements.map((e) => e.materialId));
  for (const matId of usedMaterialIds) {
    const mat = getMaterialById(matId);
    if (!mat) continue;
    const safeVarName = matId.replace(/-/g, '_');
    lines.push(`mat_${safeVarName} = bpy.data.materials.new(name="${mat.name}")`);
    lines.push(`mat_${safeVarName}.use_nodes = True`);
    lines.push(`bsdf_${safeVarName} = mat_${safeVarName}.node_tree.nodes["Principled BSDF"]`);
    lines.push(`bsdf_${safeVarName}.inputs["Base Color"].default_value = (${mat.color.join(', ')})`);
    lines.push(`bsdf_${safeVarName}.inputs["Metallic"].default_value = ${mat.metallic}`);
    lines.push(`bsdf_${safeVarName}.inputs["Roughness"].default_value = ${mat.roughness}`);
    if (mat.opacity < 1) {
      lines.push(`mat_${safeVarName}.blend_method = "BLEND"`);
      lines.push(`bsdf_${safeVarName}.inputs["Alpha"].default_value = ${mat.opacity}`);
    }
    lines.push('');
  }

  // Generate geometry
  lines.push('# --- Geometry ---');
  for (const el of model.elements) {
    const safeId = el.id.replace(/-/g, '_');
    const matVarName = el.materialId.replace(/-/g, '_');
    const matVar = `mat_${matVarName}`;

    // Skip elements whose material was not found in the library
    // to prevent referencing undefined Blender material variables
    if (!usedMaterialIds.has(el.materialId) || !getMaterialById(el.materialId)) {
      lines.push(`# Skipped element "${el.id}" — material "${el.materialId}" not found`);
      continue;
    }

    switch (el.type) {
      case 'column':
      case 'wall':
      case 'floor':
      case 'roof':
      case 'mullion':
        lines.push(`bpy.ops.mesh.primitive_cube_add(location=(${el.position.join(', ')}), scale=(${el.scale.map((s) => s / 2).join(', ')}))`);
        break;
      case 'window':
        lines.push(`bpy.ops.mesh.primitive_plane_add(location=(${el.position.join(', ')}), scale=(${el.scale[0] / 2}, ${el.scale[2] / 2}, 1))`);
        break;
      case 'solar-panel':
        lines.push(`bpy.ops.mesh.primitive_cube_add(location=(${el.position.join(', ')}), scale=(${el.scale.map((s) => s / 2).join(', ')}))`);
        break;
      default:
        lines.push(`bpy.ops.mesh.primitive_cube_add(location=(${el.position.join(', ')}), scale=(${el.scale.map((s) => s / 2).join(', ')}))`);
    }

    lines.push(`obj = bpy.context.active_object`);
    lines.push(`obj.name = "${safeId}"`);
    if (el.rotation[0] !== 0 || el.rotation[1] !== 0 || el.rotation[2] !== 0) {
      lines.push(`obj.rotation_euler = (${el.rotation.join(', ')})`);
    }
    lines.push(`obj.data.materials.append(${matVar})`);
    lines.push('');
  }

  // Camera setup
  lines.push('# --- Camera ---');
  lines.push('bpy.ops.object.camera_add(location=(50, -50, 30), rotation=(1.1, 0, 0.78))');
  lines.push('bpy.context.scene.camera = bpy.context.active_object');
  lines.push('');
  lines.push('# --- Lighting ---');
  lines.push('bpy.ops.object.light_add(type="SUN", location=(10, -10, 50))');
  lines.push('bpy.context.active_object.data.energy = 3');
  lines.push('');
  lines.push(`print("Parametric model '${model.name}' generated: ${model.elements.length} elements")`);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Visualization Prompt Generator
// ---------------------------------------------------------------------------

/**
 * Generate an AI visualization prompt for image-to-image / geometry-to-render pipelines.
 */
export function generateVisualizationPrompt(model: ParametricBuildingModel): string {
  const c = model.constraints;
  const facadeMat = getMaterialById(c.materials.facade);
  const glazingMat = getMaterialById(c.materials.glazing);

  const parts: string[] = [
    `Photorealistic architectural rendering of a ${c.totalFloors}-story ${c.projectType.replace(/-/g, ' ')} building.`,
    `Building dimensions approximately ${c.footprintWidth}m wide by ${c.footprintDepth}m deep, ${(c.totalFloors * c.floorToFloorHeight).toFixed(1)}m tall.`,
  ];

  if (facadeMat) {
    parts.push(`Facade material: ${facadeMat.textureHint}.`);
  }
  if (glazingMat) {
    parts.push(`Windows: ${glazingMat.textureHint}, ${Math.round(c.windowToWallRatio * 100)}% window-to-wall ratio.`);
  }
  if (c.solarCoverage > 0) {
    parts.push(
      `Rooftop solar array covering ${Math.round(c.solarCoverage * 100)}% of roof area, ${model.estimatedEnergyProduction ? `estimated ${(model.estimatedEnergyProduction / 1000).toFixed(0)} MWh/year production` : ''}.`
    );
  }
  if (c.sustainabilityTarget) {
    parts.push(`Designed to ${c.sustainabilityTarget} sustainability standards.`);
  }

  parts.push(
    'Golden hour lighting, slight overcast, professional architectural photography style.',
    'Surrounded by mature landscaping with native plants.',
    'Street-level perspective with pedestrians for scale.'
  );

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Ecosystem Pipeline Orchestrator
// ---------------------------------------------------------------------------

export type PipelineStage = 'massing' | 'parametric' | 'design-services' | 'spatial-workbench' | 'sitesync-export';

export interface PipelineStatus {
  currentStage: PipelineStage;
  stages: Array<{
    stage: PipelineStage;
    label: string;
    status: 'pending' | 'in_progress' | 'completed' | 'error';
    input?: string;
    output?: string;
    error?: string;
  }>;
}

export function createPipelineStatus(): PipelineStatus {
  return {
    currentStage: 'massing',
    stages: [
      {
        stage: 'massing',
        label: 'Massing Tool',
        status: 'pending',
        input: 'Zoning / Area data',
        output: '3D GLB Blocks',
      },
      {
        stage: 'parametric',
        label: 'Parametric Engine',
        status: 'pending',
        input: '3D GLB Blocks + Building Constraints',
        output: 'LOD 200-300 Model with Materials',
      },
      {
        stage: 'design-services',
        label: 'Design Services',
        status: 'pending',
        input: '3D GLB + Aesthetic Prompts',
        output: 'Photorealistic Renderings',
      },
      {
        stage: 'spatial-workbench',
        label: 'Spatial Workbench',
        status: 'pending',
        input: 'Refined 3D Model',
        output: '2D Blueprints & 3D Floor Plans',
      },
      {
        stage: 'sitesync-export',
        label: 'SiteSync OS Export',
        status: 'pending',
        input: 'All of the above',
        output: 'Construction-Ready Documentation',
      },
    ],
  };
}
