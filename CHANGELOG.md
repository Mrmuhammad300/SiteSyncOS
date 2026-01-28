# Changelog

All notable changes to SiteSync OS will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-01-28

### Added
- **Parametric Detail Engine** - Bridges LOD 100 AI massing to construction-ready geometry (LOD 200-400)
  - Window sizing and placement rules
  - Material and texture application per facade zone
  - Solar panel zone calculation and envelope optimization
  - MEP rough-in geometry generation
  - Floor plan generation with room layouts
  - Blender Python script generation for 3D output
- **Spatial Workbench Module** - Full UI for parametric building generation
  - 4 project type presets: Senior Living, Veteran Housing, Mixed-Use, Commercial
  - Building dimension configuration (floors, height, footprint width/depth)
  - Material selection interface (facade, glazing, roof, structure)
  - Sustainability targeting (LEED Silver/Gold/Platinum, PassiveHouse, NetZero)
  - Solar and envelope optimization controls
  - Floor plan visualization and export
  - Deliverables export to Design Services, Revit/Rhino, permit sets
- **Ecosystem Pipeline** - 5-stage visual workflow
  - Stage 1: Massing Tool (GLB Blocks)
  - Stage 2: Parametric Engine (Apply rules)
  - Stage 3: Design Services (Aesthetic rendering)
  - Stage 4: Spatial Workbench (2D/3D plans)
  - Stage 5: SiteSync OS Export (Construction docs)
- **Mobile Responsiveness** - Enhanced mobile responsiveness across all recently added features

### Changed
- Updated module count from 29 to 30 (added Spatial Workbench)
- Updated API endpoint count to 79 total endpoints
- Updated project structure documentation
- Enhanced lib directory with parametric-engine.ts

## [2.0.0] - 2026-01-28

### Added
- **Multi-Agent Orchestration System** - 16 specialized AI agents with event-driven execution
  - Human Oversight Liaison (Interface Agent)
  - Decision Advisor (Reasoning Agent)
  - Collective AI Overseer (Governance Agent)
  - Ethical Alignment Council (Policy Agent)
  - AI Risk Sentinel (Risk Agent)
  - Transparency Officer (Audit Agent)
  - Agent Ecosystem Orchestrator (Coordination Agent)
  - Plus 9 domain-specific agents for construction operations
- **Blender MCP Integration** - 3D construction visualization using Model Context Protocol
  - Scene creation and manipulation
  - Object manipulation for construction models
  - Real-time 3D visualization
- **Document Upload & Institutional Reports** - Enhanced document management
  - AWS S3 integration for file storage
  - Institutional report generation for stakeholders
  - Document version control
- **Quantum Ledger** - Advanced financial ledger with event-driven workflows
  - Treasury integration
  - Audit trail logging
  - Event-driven transaction processing
- **GIS Module** - Geographic Information System
  - WebGL-based visualization
  - Risk assessment features
  - Location-based analytics

### Changed
- Updated README.md with comprehensive feature documentation
- Enhanced project structure documentation
- Improved API endpoint documentation (53+ endpoints)

### Fixed
- Various bug fixes and performance improvements

## [1.5.0] - 2026-01-26

### Added
- Asset Management Intelligence rebrand
- Quantum Ledger Treasury Integration
- Quantum Ledger event-driven workflows

## [1.4.0] - 2026-01-25

### Added
- GIS module with WebGL fallback
- GIS Intelligence module integration

## [1.3.0] - 2026-01-24

### Changed
- Complete platform rebrand from STRATOS to SiteSync OS

### Added
- Lender portal enhancements
- Live Scenarios feature
- Role-based access control with simulations

## [1.2.0] - 2026-01-20

### Added
- Design Services integration with AI rendering
- Webhook integrations for n8n automation
- Change order automation workflows

## [1.1.0] - 2026-01-15

### Added
- Properties module with financial analysis
- IRR/NPV calculations
- Capital stack modeling
- Multi-year projections

## [1.0.0] - 2026-01-01

### Added
- Initial release of SiteSync OS
- Core modules: Projects, RFIs, Submittals, Daily Reports
- Change Orders, Punch Items, Documents
- User authentication with NextAuth.js
- Role-based access control
- AWS S3 document storage integration
- Responsive UI with Tailwind CSS and Radix UI

---

For detailed documentation, see:
- [README.md](./README.md) - Project overview
- [SiteSyncOS_PRD.md](./SiteSyncOS_PRD.md) - Product requirements
- [SiteSyncOS_Technical_Spec.md](./SiteSyncOS_Technical_Spec.md) - Technical specifications
- [WEBHOOK_GUIDE.md](./WEBHOOK_GUIDE.md) - Webhook integration
- [DESIGN_SERVICES_GUIDE.md](./DESIGN_SERVICES_GUIDE.md) - AI design integration
