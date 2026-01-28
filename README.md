# SiteSync OS

SiteSync OS is an advanced AI-powered construction management platform built with Next.js 14, Prisma, PostgreSQL, and Radix UI. Streamline your construction projects with intelligent multi-agent automation, 3D visualization, real-time collaboration, and comprehensive project oversight.

**Version:** 2.0.0 | **Last Updated:** January 2026

## 🚀 Features

### Core Modules (29 Total)
- **Project Management** - Create, track, and manage construction projects with milestones
- **Properties** - Real estate portfolio with financial analysis, IRR/NPV calculations
- **RFIs (Request for Information)** - Manage project clarifications with comments and responses
- **Submittals** - Track submittal packages with review workflows
- **Daily Reports** - Field reporting for daily activities, weather, and manpower
- **Change Orders** - Cost management with budget tracking
- **Punch Items** - Deficiency tracking and completion management
- **Documents** - File management with AWS S3 cloud storage and institutional report generation
- **Design Services** - AI-powered architectural rendering via external platform integration
- **GIS Module** - Geographic Information System with risk assessment and WebGL visualization
- **Gantt Charts** - Interactive project scheduling and timeline visualization
- **Budgeting** - Comprehensive budget management and tracking
- **Draw Requests** - Payment draw workflows with lender coordination
- **Maintenance** - Work order management and maintenance tracking
- **Tenant Management** - Occupancy tracking and tenant record management
- **ROI Calculator** - Financial analysis and return on investment calculations
- **Scenarios** - Project scenario modeling and simulations
- **Lender Portal** - Secure investor/lender access portal
- **Contractor Portal** - Dedicated contractor interface
- **Accounting** - Accounting integrations and ledger management
- **Analytics** - Business analytics and reporting dashboards

### AI & Automation Features
- ✅ **Multi-Agent Orchestration** - 16 specialized AI agents with event-driven execution
  - Human Oversight Liaison (Interface Agent)
  - Decision Advisor (Reasoning Agent)
  - Collective AI Overseer (Governance Agent)
  - Ethical Alignment Council (Policy Agent)
  - AI Risk Sentinel (Risk Agent)
  - Transparency Officer (Audit Agent)
  - Agent Ecosystem Orchestrator (Coordination Agent)
  - Plus 9 domain-specific agents
- ✅ **Blender MCP Integration** - 3D construction visualization with Model Context Protocol
- ✅ **Quantum Ledger** - Advanced financial ledger with event-driven workflows
- ✅ **AI Assistant** - Context-aware recommendations and intelligent automation

### Advanced Features
- ✅ **Webhook Integrations** - n8n automation for change orders and design services
- ✅ **Role-Based Access Control** - Admin, Project Manager, Field Engineer, Subcontractor roles
- ✅ **Financial Analysis** - IRR calculations, capital stack modeling, multi-year projections
- ✅ **Cloud Storage** - AWS S3 integration for document management
- ✅ **Real-time Updates** - Status tracking across all modules
- ✅ **Responsive Design** - Modern UI with Tailwind CSS and Radix UI components
- ✅ **Institutional Reports** - Professional report generation for stakeholders
- ✅ **State Machines** - Sophisticated workflow state management
- ✅ **Audit Trails** - Comprehensive logging for compliance

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** NextAuth.js with JWT
- **Storage:** AWS S3
- **UI:** Tailwind CSS + Radix UI
- **Forms:** React Hook Form + Zod validation
- **State Management:** React Query (TanStack Query)

## 📋 Prerequisites

- Node.js 18+ and Yarn
- PostgreSQL database
- AWS account (for S3 storage)
- Environment variables (see Setup)

## 🔧 Installation

1. **Clone the repository:**
```bash
git clone <your-repo-url>
cd construction_crm_platform
```

2. **Install dependencies:**
```bash
cd nextjs_space
yarn install
```

3. **Set up environment variables:**

Create `.env` file in `nextjs_space` directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sitesync"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# AWS S3 (configured automatically by Abacus.AI)
AWS_BUCKET_NAME="your-bucket-name"
AWS_FOLDER_PREFIX="your-folder-prefix/"

# Webhook Secrets
CHANGE_ORDER_WEBHOOK_SECRET="your-change-order-webhook-secret"
DESIGN_WEBHOOK_SECRET="your-design-webhook-secret"

# External AI Design Platform
DESIGN_WEBHOOK_URL="https://your-design-platform.com/webhook"
```

4. **Initialize the database:**
```bash
yarn prisma generate
yarn prisma db push
yarn prisma db seed
```

5. **Run the development server:**
```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔑 Default Login Credentials

**Admin Account:**
- Email: `john@doe.com`
- Password: `johndoe123`

## 📁 Project Structure

```
SiteSyncOS/
├── nextjs_space/
│   ├── app/                          # Main application (29 modules)
│   │   ├── api/                      # 53+ API endpoints
│   │   ├── auth/                     # Authentication pages
│   │   ├── dashboard/                # Main dashboard
│   │   ├── projects/                 # Project management
│   │   ├── properties/               # Real estate portfolio
│   │   ├── rfis/                     # RFI management
│   │   ├── submittals/               # Submittal tracking
│   │   ├── daily-reports/            # Daily reports
│   │   ├── change-orders/            # Change order management
│   │   ├── punch-items/              # Punch list
│   │   ├── documents/                # Document management
│   │   ├── design-services/          # AI design integration
│   │   ├── gis/                      # GIS with WebGL
│   │   ├── gantt/                    # Project scheduling
│   │   ├── budgeting/                # Budget management
│   │   ├── draw-requests/            # Payment workflows
│   │   ├── maintenance/              # Work orders
│   │   ├── tenant-management/        # Tenant records
│   │   ├── lender-portal/            # Investor portal
│   │   ├── contractor-portal/        # Contractor interface
│   │   ├── ledger/                   # Quantum Ledger
│   │   ├── analytics/                # Business analytics
│   │   ├── ai-assistant/             # AI-powered assistant
│   │   ├── accounting/               # Accounting integrations
│   │   ├── milestones/               # Project milestones
│   │   ├── roi-calculator/           # ROI calculations
│   │   └── scenarios/                # Project scenarios
│   ├── components/
│   │   ├── ui/                       # Reusable UI components
│   │   ├── dashboard-nav.tsx         # Navigation
│   │   └── notification-center.tsx   # Notifications
│   ├── lib/
│   │   ├── agent-orchestrator.ts     # Multi-agent execution engine
│   │   ├── agent-system.ts           # 16 AI agents
│   │   ├── blender-client.ts         # Blender 3D integration
│   │   ├── blender-mcp/              # Model Context Protocol
│   │   ├── state-machines.ts         # Workflow management
│   │   ├── quantum-ledger.ts         # Advanced ledger
│   │   ├── financial-calculations.ts # IRR, NPV, cash flow
│   │   ├── auth-options.ts           # NextAuth configuration
│   │   ├── design-webhook.ts         # Design platform
│   │   ├── s3.ts                     # AWS S3 utilities
│   │   ├── notifications.ts          # Notification system
│   │   ├── roi-calculator.ts         # ROI computation
│   │   └── db.ts                     # Prisma client
│   ├── hooks/                        # Custom React hooks
│   ├── scripts/                      # Database seeds
│   ├── prisma/
│   │   └── schema.prisma             # 40+ data models
│   └── public/                       # Static assets
├── whitepaper.md                     # Business whitepaper
├── SiteSyncOS_PRD.md                 # Product requirements
├── SiteSyncOS_Technical_Spec.md      # Technical specifications
├── WEBHOOK_GUIDE.md                  # Webhook integration guide
├── DESIGN_SERVICES_GUIDE.md          # AI design platform guide
└── README.md                         # This file
```

## 🔗 API Endpoints (53+ Endpoints)

### Authentication
- `POST /api/auth/signin` - User login
- `POST /api/signup` - User registration

### Projects & Management
- `GET/POST /api/projects` - List/Create projects
- `GET/PATCH /api/projects/[id]` - Get/Update project details
- `GET/POST /api/milestones` - Project milestones

### RFIs & Submittals
- `GET/POST /api/rfis` - List/Create RFIs
- `GET/PATCH /api/rfis/[id]` - Get/Update RFI details
- `POST /api/rfis/[id]/responses` - Add response
- `POST /api/rfis/[id]/comments` - Add comment
- `GET/POST /api/submittals` - List/Create submittals
- `GET/PATCH /api/submittals/[id]` - Get/Update submittal

### Documents & Reports
- `GET/POST /api/documents` - Document management
- `POST /api/documents/upload` - File upload to S3
- `POST /api/documents/institutional-report` - Generate reports

### Financial
- `GET/POST /api/budgets` - Budget management
- `GET/POST /api/draw-requests` - Draw request workflows
- `POST /api/roi-calculator` - ROI calculations
- `GET/POST /api/ledger` - Quantum Ledger entries

### AI & Automation
- `POST /api/agents/execute` - Execute AI agents
- `GET /api/agents/status` - Agent execution status
- `POST /api/blender/scene` - 3D scene operations

### GIS & Visualization
- `GET /api/gis/data` - Geographic data
- `GET /api/gis/risk-assessment` - Risk analysis

### Webhooks
- `POST /api/webhooks/change-orders` - n8n change order automation
- `POST /api/webhooks/design-callback` - Design platform status updates

## 📚 Documentation

- **[Webhook Integration Guide](./WEBHOOK_GUIDE.md)** - Complete guide for setting up n8n webhooks
- **[Design Services Guide](./DESIGN_SERVICES_GUIDE.md)** - AI design platform integration instructions

## 🔐 Security

- All routes protected with NextAuth.js middleware
- Role-based access control (RBAC)
- Webhook signature verification
- Environment variables for sensitive data
- AWS S3 with presigned URLs for secure file access

## 🚀 Deployment

The application is configured for deployment on Abacus.AI platform:

1. Build the application:
```bash
yarn build
```

2. Deploy using the provided deployment tools or manually:
```bash
yarn start
```

## 🐛 Known Issues & Fixes

All critical issues have been resolved in the latest version:
- ✅ Fixed null/undefined handling in status formatters
- ✅ Fixed date formatting for invalid dates
- ✅ Fixed API response structure mismatches
- ✅ Enhanced error handling across all modules

## 🗺️ Roadmap

### Completed (v2.0.0)
- ✅ Multi-agent orchestration with 16 AI agents
- ✅ Blender MCP integration for 3D visualization
- ✅ Quantum Ledger with event-driven workflows
- ✅ GIS module with WebGL fallback
- ✅ Document upload and institutional reporting
- ✅ Asset Management Intelligence features
- ✅ Lender and contractor portals

### In Progress
- Phase 1: Enhanced mobile responsiveness
- Phase 2: Real-time collaboration features
- Phase 3: Advanced analytics dashboards

### Planned
- Phase 4: IoT sensor integration
- Phase 5: AR/VR visualization support
- Phase 6: Predictive maintenance AI

## 📝 License

Proprietary - All rights reserved

## 🤝 Contributing

This is a private project. Contact the project administrator for contribution guidelines.

## 📞 Support

For issues or questions, contact the development team.

---

**SiteSync OS - Building the Future of Construction Management**
**Powered by AI • Built with ❤️ using Next.js and modern web technologies**
