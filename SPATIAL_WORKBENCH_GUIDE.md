# Spatial Workbench Guide

## Overview

The **Spatial Workbench** is SiteSync OS's interactive 3D visualization module for construction site planning and visualization. It provides a powerful Three.js-powered 3D viewer with Blender MCP integration for AI-assisted 3D model generation.

## Features

### 3D Scene Viewer
- **Interactive Navigation**: Orbit controls for rotating, panning, and zooming
- **Object Types**: Buildings, equipment, vehicles, vegetation, and custom objects
- **Object Selection**: Click to select and edit object properties
- **Grid & Axes**: Toggleable grid and coordinate axes for precise positioning
- **Environment Lighting**: Multiple presets (city, sunset, dawn, night, forest)
- **Fullscreen Mode**: Expand the viewport to full screen

### Object Management
- **Add Objects**: Create new buildings, equipment, vehicles, and vegetation
- **Edit Properties**: Modify position, dimensions, and color of selected objects
- **Delete Objects**: Remove objects from the scene
- **Scene Export**: Export scene data to JSON format
- **Reset Scene**: Restore the default construction site scene

### AI Scene Generation
- **Natural Language Input**: Describe scenes in plain English
- **Blender MCP Integration**: Generate 3D models using AI
- **Real-time Preview**: See generated content in the 3D viewer

## Accessing the Spatial Workbench

Navigate to `/spatial-workbench` from the dashboard or use the direct URL:
```
https://your-domain.com/spatial-workbench
```

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                  Spatial Workbench Page                  │
│                 (app/spatial-workbench/page.tsx)         │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   SceneViewer3D Component                │
│              (components/ui/scene-viewer-3d.tsx)         │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Canvas    │  │   Lights    │  │  Controls   │     │
│  │  (R3F)      │  │ (Ambient,   │  │  (Orbit)    │     │
│  └─────────────┘  │ Directional)│  └─────────────┘     │
│                   └─────────────┘                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Scene Objects                        │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐  │   │
│  │  │Building │ │Equipment│ │ Vehicle │ │ Tree  │  │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └───────┘  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Blender MCP Client                     │
│                  (lib/blender-client.ts)                 │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ HTTP Bridge  │  │ Socket Mode  │  │  Mock Mode   │  │
│  │ (Production) │  │ (Local Dev)  │  │ (Testing)    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Blender MCP Server                     │
│               (lib/blender-mcp/server.py)                │
│                                                          │
│  Socket Server (Port 9876) ◄──► Blender Application     │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| 3D Rendering | Three.js | WebGL-based 3D graphics |
| React Integration | @react-three/fiber | React renderer for Three.js |
| Helpers | @react-three/drei | Useful abstractions (controls, environment) |
| 3D Backend | Blender MCP | AI-powered 3D model generation |
| Communication | HTTP/Socket | Client-server communication |

## Blender MCP Integration

### Connection Modes

The Blender client supports three connection modes:

1. **Mock Mode** (Default for development)
   - No external dependencies
   - Returns simulated responses
   - Set `BLENDER_USE_MOCK=true`

2. **HTTP Mode** (Recommended for production)
   - Connects via HTTP bridge
   - Better firewall compatibility
   - Set `BLENDER_HTTP_PORT=8765`

3. **Socket Mode** (Local development)
   - Direct TCP connection to Blender
   - Lowest latency
   - Set `BLENDER_PORT=9876`

### Environment Configuration

```env
# Blender MCP Configuration
BLENDER_HOST=localhost          # Blender server hostname
BLENDER_PORT=9876               # Socket port for direct connection
BLENDER_HTTP_PORT=8765          # HTTP bridge port
BLENDER_USE_MOCK=true           # Use mock data (true/false)
```

### API Endpoints

#### Check Connection Status
```http
GET /api/blender?action=status
```

**Response:**
```json
{
  "connected": true,
  "version": "1.5.5",
  "blenderVersion": "4.0"
}
```

#### Get Scene Information
```http
GET /api/blender?action=scene
```

**Response:**
```json
{
  "objects": [...],
  "materials": [...],
  "cameras": ["Camera_Overview"],
  "lights": ["Sun", "Area_Light"],
  "activeCamera": "Camera_Overview",
  "frameRange": [1, 250],
  "renderSettings": {
    "engine": "CYCLES",
    "resolution": [1920, 1080],
    "samples": 128
  }
}
```

#### Create Object
```http
POST /api/blender
Content-Type: application/json

{
  "action": "create_object",
  "params": {
    "type": "cube",
    "name": "Building_Main",
    "location": [0, 0, 5],
    "scale": [10, 15, 10]
  }
}
```

#### Generate AI Model
```http
POST /api/blender
Content-Type: application/json

{
  "action": "generate_model",
  "params": {
    "prompt": "Modern office building with glass facade",
    "style": "realistic",
    "quality": "medium"
  }
}
```

### Supported Blender Commands

| Command | Description |
|---------|-------------|
| `get_scene_info` | Get complete scene information |
| `get_object_info` | Get specific object details |
| `create_object` | Create a new 3D primitive |
| `modify_object` | Transform existing object |
| `delete_object` | Remove object from scene |
| `set_material` | Apply material to object |
| `get_viewport_screenshot` | Capture viewport image |
| `render_scene` | Execute full render |
| `import_model` | Import external 3D model |
| `export_scene` | Export scene to file |
| `generate_model` | AI-powered model generation |
| `generate_scene` | AI-powered scene generation |
| `download_polyhaven_asset` | Fetch assets from Poly Haven |

## Scene Objects

### Object Types

#### Building
```typescript
{
  id: string;
  name: string;
  type: 'building';
  position: [x, y, z];
  dimensions: {
    width: number;
    height: number;
    depth: number;
  };
  color: string; // Hex color
}
```

#### Equipment
```typescript
{
  id: string;
  name: string;
  type: 'equipment';
  position: [x, y, z];
  color: string;
}
```

#### Vehicle
```typescript
{
  id: string;
  name: string;
  type: 'vehicle';
  position: [x, y, z];
  color: string;
}
```

#### Vegetation
```typescript
{
  id: string;
  name: string;
  type: 'vegetation';
  position: [x, y, z];
  scale: [x, y, z];
  color: string;
}
```

### Default Scene

The default construction scene includes:
- Ground plane (100x100 units)
- Main building (20x25x15)
- Annex building (12x12x10)
- 2 Construction equipment pieces
- 2 Vehicles
- 3 Trees

## User Interface

### Toolbar Controls

| Control | Function |
|---------|----------|
| Grid | Toggle grid visibility |
| Axes | Toggle coordinate axes |
| Environment | Change lighting preset |
| Add Object | Open object creation dialog |
| Export | Download scene as JSON |
| Reset | Restore default scene |
| Fullscreen | Expand viewport |

### 3D Navigation

| Action | Mouse/Touch |
|--------|-------------|
| Rotate | Left-click + drag |
| Pan | Right-click + drag |
| Zoom | Scroll wheel / Pinch |
| Select | Click on object |

### Object Properties Panel

When an object is selected:
- **Position**: X, Y, Z coordinates
- **Dimensions**: Width, Height, Depth (for buildings)
- **Color**: Color picker and hex input
- **Delete**: Remove object button

## Performance Optimization

### Recommendations

1. **Object Count**: Keep total objects under 100 for smooth performance
2. **Mobile Devices**: Reduce environment quality on mobile
3. **Large Scenes**: Use LOD (Level of Detail) for distant objects
4. **Textures**: Use compressed textures when available

### Browser Requirements

- WebGL 2.0 support required
- Modern browsers: Chrome 90+, Firefox 88+, Safari 15+, Edge 90+
- GPU acceleration recommended

## Troubleshooting

### Common Issues

#### "Blender disconnected" status
- Ensure Blender is running with the MCP addon
- Check firewall settings for ports 9876/8765
- Verify `BLENDER_HOST` environment variable

#### 3D scene not loading
- Check browser console for WebGL errors
- Ensure GPU acceleration is enabled
- Try refreshing the page

#### Objects not appearing
- Verify position coordinates are within view
- Check object scale isn't zero
- Ensure visibility is enabled

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=blender:*
```

## Integration Examples

### Creating a Site Visualization

```typescript
// Using the Blender client
import { BlenderMCPClient } from '@/lib/blender-client';

const client = new BlenderMCPClient();

// Create site visualization for a project
const result = await client.createSiteVisualization('project-123', {
  includeBuildings: true,
  includeTerrain: true,
  includeEquipment: true,
  cameraPosition: [50, 50, 30],
});
```

### Generating Building Model

```typescript
// Generate a building from specifications
const building = await client.generateBuildingModel('design-request-456', {
  floors: 5,
  style: 'modern',
  materials: ['glass', 'steel', 'concrete'],
});
```

### Rendering Property Visualization

```typescript
// Create property renders
const renders = await client.renderPropertyVisualization('property-789', {
  viewType: 'aerial', // 'aerial' | 'street' | 'interior' | 'isometric'
  resolution: [1920, 1080],
  quality: 'high',
});
```

## Related Documentation

- [Design Services Guide](./DESIGN_SERVICES_GUIDE.md) - AI design platform integration
- [Blender MCP README](./nextjs_space/lib/blender-mcp/README.md) - Detailed MCP server documentation
- [GIS Integration](./nextjs_space/app/gis/page.tsx) - 2D mapping and risk assessment

---

**SiteSync OS Spatial Workbench** - Visualize your construction projects in 3D
