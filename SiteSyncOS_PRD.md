---
title: "SiteSync OS - Product Requirements Document"
author: "SiteSync OS Platform Team"
date: "January 2026"
geometry: margin=1in
---

\newpage

# Executive Summary

## Product Overview

**SiteSync OS** is an AI-powered Construction Management Platform designed to streamline project workflows, enhance collaboration, and provide real-time insights for construction teams. Built on modern web technologies, SiteSync OS serves as a comprehensive solution for managing all aspects of construction projects from inception to completion.

The platform integrates traditional construction management tools with cutting-edge AI capabilities, automation workflows, and advanced analytics to deliver unprecedented efficiency and visibility across all project stakeholders.

## Vision & Mission

**Vision:** To become the leading construction management platform that empowers teams to deliver projects on time, within budget, and with exceptional quality through intelligent automation and data-driven insights.

**Mission:** Provide construction professionals with an intuitive, powerful platform that eliminates administrative overhead, facilitates seamless communication, and leverages AI to predict and prevent project issues before they occur.

## Target Users

SiteSync OS is designed for the following user personas:

| User Role | Primary Responsibilities | Key Features Used |
|-----------|-------------------------|-------------------|
| **General Contractors** | Overall project management, coordination, budget oversight | Projects, Change Orders, Analytics Dashboard, Financial Tracking |
| **Project Managers** | Day-to-day project execution, team coordination, schedule management | RFIs, Submittals, Daily Reports, Time Tracking, Notifications |
| **Field Supervisors** | On-site management, crew coordination, equipment tracking | Daily Reports, Punch Items, Equipment Management, Time Tracking |
| **Subcontractors** | Specialized work execution, submittal preparation, RFI responses | Submittals, RFIs, Documents, Punch Items |
| **Owners/Clients** | Project oversight, approval workflows, financial monitoring | Analytics Dashboard, Change Orders, Document Review, Reports |

\newpage

# Product Features (Completed)

## Core Project Management

### Projects Module

The Projects module serves as the central hub for all construction activities, providing comprehensive project lifecycle management.

**Key Features:**

- **CRUD Operations:** Full create, read, update, delete functionality for project records
- **Project Attributes:**
  - Project name, description, and location
  - Start and end dates with timeline visualization
  - Budget tracking with variance calculations
  - Status tracking (Planning, Active, On Hold, Completed, Cancelled)
  - Client/owner information
  - Project manager assignment
- **Filtering & Search:** Advanced filtering by status, date range, budget, and custom criteria
- **Project Dashboard:** Individual project overview with key metrics and recent activity
- **Document Association:** Link documents, drawings, and specifications to projects
- **Team Management:** Assign team members and define roles per project

### RFIs (Request for Information)

Streamlined RFI management with complete tracking from submission to resolution.

**Key Features:**

- **RFI Creation:** Structured form with project association, subject, description, priority
- **Response Tracking:** Multi-response capability with threaded conversations
- **Comment System:** Collaborative discussion threads on each RFI
- **Status Management:** Draft, Submitted, Under Review, Answered, Closed
- **Priority Levels:** Low, Medium, High, Critical
- **Due Date Tracking:** Automated reminders and overdue notifications
- **Attachment Support:** Upload drawings, photos, and supporting documents
- **Response Time Analytics:** Track average response times and bottlenecks

### Submittals

Complete submittal workflow management with approval tracking and version control.

**Key Features:**

- **Submittal Types:** Shop Drawings, Product Data, Samples, Mix Designs, Test Reports
- **Approval Workflow:** Multi-stage approval process with reviewer assignment
- **Status Tracking:** Pending, Under Review, Approved, Approved as Noted, Rejected, Resubmit
- **Version Control:** Track submittal revisions and resubmissions
- **Response Management:** Detailed reviewer responses with comments
- **Due Date Management:** Submission and review deadlines with alerts
- **Specification References:** Link to project specifications and drawing references
- **Compliance Tracking:** Ensure all required submittals are completed

### Change Orders

Comprehensive change order management with cost impact analysis and approval workflows.

**Key Features:**

- **Change Request Creation:** Detailed description of proposed changes
- **Cost Tracking:** Original cost, proposed cost, and variance calculations
- **Schedule Impact:** Track time extensions and schedule modifications
- **Approval Workflow:** Multi-level approval process with stakeholder sign-off
- **Status Management:** Draft, Pending, Approved, Rejected, Implemented
- **Reason Codes:** Categorize changes (Design Change, Site Conditions, Owner Request, etc.)
- **Document Attachments:** Supporting documentation and justifications
- **Budget Impact Analysis:** Real-time project budget updates
- **n8n Webhook Integration:** Automated change order processing via external workflows

### Punch Items

Deficiency tracking and completion management for project closeout.

**Key Features:**

- **Punch Item Creation:** Description, location, responsible party, priority
- **Assignment System:** Assign to specific subcontractors or team members
- **Status Tracking:** Open, In Progress, Completed, Verified, Closed
- **Priority Levels:** Low, Medium, High, Critical
- **Photo Documentation:** Before and after photos for verification
- **Due Date Management:** Track completion deadlines
- **Verification Workflow:** Inspector review and approval process
- **Bulk Operations:** Create and update multiple punch items simultaneously
- **Closeout Reports:** Generate comprehensive punch list reports

### Daily Reports

Comprehensive daily activity logging with weather tracking and progress documentation.

**Key Features:**

- **Daily Log Entry:** Date-specific reports with project association
- **Weather Conditions:** Temperature, conditions, and weather impact notes
- **Work Performed:** Detailed description of daily activities
- **Crew Information:** Track crew size and labor hours
- **Equipment Usage:** Log equipment on-site and utilization
- **Material Deliveries:** Record material receipts and quantities
- **Visitor Log:** Track site visitors and inspections
- **Safety Incidents:** Document safety observations and incidents
- **Progress Photos:** Attach daily progress photography
- **Delays & Issues:** Record delays, causes, and mitigation actions
- **Report Distribution:** Automated distribution to stakeholders

### Document Management

Cloud-based document management with AWS S3 integration for secure file storage.

**Key Features:**

- **File Upload:** Support for all common file types (PDF, DWG, images, Office docs)
- **Cloud Storage:** AWS S3 integration with presigned URLs for secure access
- **Document Categories:** Drawings, Specifications, Contracts, Reports, Photos, Other
- **Version Control:** Track document revisions and updates
- **Access Control:** Public vs. private document permissions
- **Project Association:** Link documents to specific projects
- **Search & Filter:** Full-text search and metadata filtering
- **Bulk Upload:** Upload multiple files simultaneously
- **Download Management:** Secure download links with expiration
- **Storage Path Management:** Organized folder structure in cloud storage

\newpage

## Phase 1 & 2 Features (Recently Completed)

### Communication & Notification System

A comprehensive real-time notification system that keeps all stakeholders informed of critical project events.

**Key Features:**

- **Real-Time Notifications:**
  - RFI responses and status changes
  - Submittal approvals and rejections
  - Change order updates and approvals
  - Punch item assignments and completions
  - Daily report submissions
  - Document uploads and updates
  - Time entry approvals
  - Equipment maintenance alerts
  - Material requisition status changes

- **Notification Center:**
  - Bell icon with unread count badge
  - Dropdown panel with recent notifications
  - Mark individual notifications as read
  - Mark all notifications as read
  - Filter by read/unread status
  - Direct links to related items
  - Timestamp display (relative and absolute)

- **Email Notifications:**
  - HTML email templates with branding
  - Configurable email preferences per user
  - Digest options (immediate, daily, weekly)
  - Unsubscribe management
  - Email delivery tracking

- **User Notification Preferences:**
  - Granular control over notification types
  - Channel preferences (in-app, email, both)
  - Frequency settings
  - Quiet hours configuration
  - Project-specific notification rules

- **Activity Feed:**
  - Comprehensive activity tracking (18+ activity types)
  - Project-level activity streams
  - User activity history
  - Filterable by activity type
  - Searchable activity logs
  - Export activity reports

**Activity Types Tracked:**

| Activity Type | Description |
|--------------|-------------|
| PROJECT_CREATED | New project initialization |
| PROJECT_UPDATED | Project details modified |
| RFI_CREATED | New RFI submitted |
| RFI_RESPONDED | RFI response provided |
| RFI_CLOSED | RFI marked as closed |
| SUBMITTAL_CREATED | New submittal submitted |
| SUBMITTAL_REVIEWED | Submittal review completed |
| SUBMITTAL_APPROVED | Submittal approved |
| CHANGE_ORDER_CREATED | New change order requested |
| CHANGE_ORDER_APPROVED | Change order approved |
| PUNCH_ITEM_CREATED | New punch item logged |
| PUNCH_ITEM_COMPLETED | Punch item marked complete |
| DAILY_REPORT_CREATED | Daily report submitted |
| DOCUMENT_UPLOADED | New document added |
| TIME_ENTRY_SUBMITTED | Time entry submitted for approval |
| EQUIPMENT_MAINTENANCE | Equipment maintenance scheduled |
| MATERIAL_ORDERED | Material requisition ordered |
| DESIGN_REQUEST_CREATED | Design service request initiated |

### Advanced Analytics Dashboard

A powerful analytics engine providing real-time insights into project performance, team productivity, and financial health.

**Dashboard Components:**

#### 1. Project Health Scorecard

High-level metrics providing instant visibility into portfolio health:

- **Active Projects Count:** Total number of active projects
- **On-Time Percentage:** Projects meeting schedule targets
- **Budget Variance:** Aggregate budget performance across all projects
- **Critical Items:** Count of high-priority RFIs, punch items, and overdue tasks
- **Team Utilization:** Labor hours and crew efficiency metrics
- **Equipment Utilization:** Equipment usage rates and availability

#### 2. Performance Metrics

Detailed performance indicators with trend analysis:

- **RFI Velocity:**
  - Average response time
  - Open vs. closed RFI ratio
  - RFI volume trends
  - Response time by priority level
  - Bottleneck identification

- **Submittal Approval Rates:**
  - First-time approval percentage
  - Average review time
  - Rejection reasons analysis
  - Resubmission rates
  - Reviewer performance metrics

- **Change Order Analysis:**
  - Total change order value
  - Approval rate and timeline
  - Change order frequency
  - Cost impact by category
  - Trend analysis over time

- **Punch Item Completion:**
  - Open vs. closed punch items
  - Average completion time
  - Completion rate by trade
  - Critical punch items tracking
  - Closeout readiness score

#### 3. Interactive Charts (Chart.js Integration)

Professional data visualizations with multiple chart types:

- **Line Charts:** Time-series data for trends and forecasting
- **Bar Charts:** Comparative analysis across projects or categories
- **Doughnut Charts:** Distribution and proportion visualization
- **Stacked Charts:** Multi-dimensional data representation
- **Interactive Tooltips:** Hover for detailed data points
- **Responsive Design:** Adapts to screen size and device
- **Color-Coded:** Consistent color scheme for data categories

#### 4. Date Range Filters

Flexible time-based analysis:

- **Preset Ranges:**
  - Last 7 days
  - Last 30 days
  - Last 90 days
  - Last 365 days
  - Custom date range picker

- **Dynamic Updates:** Charts and metrics update in real-time based on selected range
- **Comparison Mode:** Compare current period to previous period
- **Trend Indicators:** Up/down arrows with percentage change

#### 5. Export Functionality

Comprehensive data export capabilities:

- **Export Formats:** PDF, Excel, CSV
- **Report Types:**
  - Executive summary reports
  - Detailed analytics reports
  - Custom filtered reports
  - Scheduled automated reports
- **Customization:** Select specific metrics and charts to include
- **Branding:** Company logo and custom headers/footers

#### 6. Tabbed Interface

Organized analytics across multiple dimensions:

- **Overview Tab:** High-level dashboard with key metrics
- **Projects Tab:** Project-specific analytics and comparisons
- **RFIs Tab:** Detailed RFI analysis and trends
- **Submittals Tab:** Submittal workflow performance
- **Financial Tab:** Budget, costs, and change order analysis
- **Labor Tab:** Time tracking and crew productivity
- **Equipment Tab:** Equipment utilization and maintenance

### Time Tracking & Labor Management

Comprehensive labor management system for tracking crew time, calculating costs, and managing overtime.

**Key Features:**

- **Time Entry Management:**
  - Date and project association
  - User/employee assignment
  - Regular hours and overtime hours
  - Hourly rate configuration
  - Automatic cost calculation
  - Notes and description fields
  - Status workflow (Draft, Submitted, Approved, Rejected)

- **Crew Management:**
  - Create and manage crews
  - Assign crew members with roles
  - Track crew size and composition
  - Crew-level time tracking
  - Crew productivity metrics
  - Historical crew performance

- **Overtime Tracking:**
  - Separate overtime hour logging
  - Configurable overtime multipliers
  - Overtime cost calculations
  - Overtime trend analysis
  - Budget impact tracking
  - Compliance reporting

- **Labor Cost Calculations:**
  - Real-time cost computation
  - Regular vs. overtime cost breakdown
  - Project-level labor cost aggregation
  - Budget vs. actual labor cost comparison
  - Labor cost forecasting
  - Cost allocation by trade or activity

- **Approval Workflow:**
  - Submit time entries for approval
  - Manager review and approval
  - Rejection with comments
  - Resubmission capability
  - Approval history tracking
  - Bulk approval operations

- **Reporting:**
  - Weekly/monthly timesheets
  - Labor cost reports by project
  - Overtime analysis reports
  - Crew productivity reports
  - Export to payroll systems

### Equipment & Material Management

Complete asset and material tracking system for construction equipment and material requisitions.

#### Equipment Management

**Key Features:**

- **Equipment Inventory:**
  - Equipment name and description
  - Equipment type/category
  - Serial number and model
  - Purchase date and cost
  - Current status (Available, In Use, Maintenance, Retired)
  - Ownership type (Owned, Rented, Leased)
  - Location tracking
  - Project assignment

- **Maintenance Record Scheduling:**
  - Scheduled maintenance tracking
  - Maintenance type (Preventive, Repair, Inspection)
  - Maintenance date and next due date
  - Maintenance cost tracking
  - Service provider information
  - Maintenance history log
  - Automated maintenance reminders
  - Downtime tracking

- **Project Assignment Tracking:**
  - Assign equipment to specific projects
  - Track equipment utilization by project
  - Equipment transfer between projects
  - Availability calendar
  - Conflict detection for double-booking
  - Equipment checkout/check-in system

- **Equipment Status Management:**
  - Real-time status updates
  - Status change history
  - Utilization rate calculations
  - Idle equipment identification
  - Retirement planning
  - Disposal tracking

- **Cost Tracking:**
  - Purchase/rental costs
  - Maintenance costs
  - Operating costs
  - Total cost of ownership
  - Cost allocation to projects
  - ROI analysis for owned equipment

#### Material Management

**Key Features:**

- **Material Requisition Workflow:**
  - Create material requisitions
  - Material description and specifications
  - Quantity and unit of measure
  - Required delivery date
  - Project association
  - Cost estimation
  - Vendor/supplier information

- **Status Tracking:**
  - **Requested:** Initial requisition created
  - **Ordered:** Purchase order issued
  - **In Transit:** Material shipped
  - **Delivered:** Material received on-site
  - **Cancelled:** Requisition cancelled

- **Delivery Management:**
  - Expected delivery date
  - Actual delivery date
  - Delivery location
  - Receiving documentation
  - Quantity verification
  - Quality inspection notes

- **Cost Management:**
  - Estimated cost
  - Actual cost
  - Cost variance tracking
  - Budget impact analysis
  - Invoice matching
  - Payment tracking

- **Inventory Integration:**
  - Track material quantities
  - Material usage by project
  - Inventory levels and reorder points
  - Material waste tracking
  - Surplus material management

\newpage

## AI-Powered Features

### Document Analysis with Abacus.AI

Leverage advanced AI capabilities to extract insights from construction documents.

**Key Features:**

- **Intelligent Document Processing:**
  - Automatic text extraction from PDFs and images
  - Drawing analysis and markup detection
  - Specification parsing and indexing
  - Contract clause extraction
  - Compliance checking

- **Search & Discovery:**
  - Natural language search across documents
  - Semantic search for related content
  - Automatic document categorization
  - Duplicate detection
  - Version comparison

- **Data Extraction:**
  - Extract key dates and milestones
  - Identify cost items and quantities
  - Parse material specifications
  - Extract contact information
  - Identify risks and obligations

### CRM Integration

Integrated customer relationship management for client and stakeholder management.

**Key Features:**

- **Contact Management:** Track clients, subcontractors, vendors, and stakeholders
- **Communication History:** Log all interactions and communications
- **Opportunity Tracking:** Manage bids and proposals
- **Relationship Mapping:** Visualize stakeholder relationships
- **Activity Tracking:** Monitor engagement and touchpoints

### AI Project Planning

Intelligent project planning assistance powered by machine learning.

**Key Features:**

- **Schedule Optimization:** AI-suggested task sequences and durations
- **Resource Allocation:** Optimal crew and equipment assignments
- **Risk Prediction:** Identify potential delays and issues
- **Cost Estimation:** AI-powered cost predictions based on historical data
- **What-If Analysis:** Scenario planning and impact analysis

\newpage

## Integrations

### Design Services Integration

Seamless integration with external AI rendering and design platforms for architectural visualization.

**Architecture:**

- **Webhook-Based Communication:** Asynchronous request/response pattern
- **External Platform:** Supabase Edge Function endpoint
- **Callback System:** Results posted back to SiteSync OS via callback endpoint

**Workflow:**

1. **Design Request Creation:**
   - User creates a design request in SiteSync OS
   - Specify design type, requirements, and parameters
   - Attach reference images or drawings
   - Set priority and deadline

2. **Automated Task Generation:**
   - System automatically generates design tasks
   - Tasks sent to external AI platform via webhook
   - Webhook URL: `https://gmllorlxfsxmsejhsjpa.supabase.co/functions/v1/n8n-orders-webhook`
   - Authentication via secret: `DESIGN_WEBHOOK_SECRET`

3. **AI Processing:**
   - External platform processes design request
   - Generates renderings, visualizations, or design documents
   - Applies AI-powered enhancements and optimizations

4. **Callback & Results:**
   - External platform posts results to SiteSync OS callback endpoint
   - Endpoint: `/api/webhooks/design-callback`
   - Results automatically attached to original design request
   - Notifications sent to requester and stakeholders

**Design Types Supported:**

- Architectural renderings
- 3D visualizations
- Floor plan generation
- Elevation drawings
- Site plan layouts
- Interior design concepts
- Material and finish selections

### Accounting Integrations

Bi-directional sync with major accounting platforms for financial management.

**Supported Platforms:**

- **QuickBooks:** Invoice sync, expense tracking, financial reporting
- **Xero:** Real-time financial data, bank reconciliation
- **FreshBooks:** Time and expense tracking, invoicing
- **Sage:** Project accounting, job costing
- **NetSuite:** Enterprise resource planning, financial consolidation

**Integration Features:**

- Automatic invoice generation from change orders
- Expense categorization and allocation
- Budget vs. actual reporting
- Cash flow forecasting
- Tax compliance and reporting

### n8n Automation (Change Orders)

Workflow automation for change order processing using n8n integration platform.

**Webhook Configuration:**

- **Endpoint:** `/api/webhooks/change-orders`
- **Authentication:** Webhook secret verification
- **Secret:** `34d7412dfa4d1c54106d4c5129c6a312061a3d8b50966dbe6000124cbece9890`

**Automated Workflows:**

- Change order approval routing
- Stakeholder notification sequences
- Document generation and distribution
- Budget update triggers
- Schedule impact analysis
- Compliance checking
- Audit trail creation

**Benefits:**

- Reduce manual processing time
- Ensure consistent approval workflows
- Eliminate human error in routing
- Maintain complete audit trails
- Accelerate change order turnaround

### ROI Calculator with IRR Calculations

Advanced financial analysis tools for investment decision-making.

**Key Features:**

- **Internal Rate of Return (IRR):**
  - Newton's method implementation for accurate IRR calculation
  - Multi-year cash flow analysis
  - Sensitivity analysis
  - Comparison to hurdle rates

- **Return Metrics:**
  - Net Present Value (NPV)
  - Return on Investment (ROI)
  - Payback period
  - Profitability index

- **Scenario Analysis:**
  - Best case / worst case / most likely scenarios
  - Monte Carlo simulation for risk assessment
  - Break-even analysis
  - Sensitivity to key variables

\newpage

## Real Estate Financial Analysis

Comprehensive financial modeling for real estate development and investment projects.

### Property Profiles

Detailed property information and tracking:

- **Property Details:**
  - Property name and address
  - Property type (Residential, Commercial, Industrial, Mixed-Use)
  - Total square footage
  - Number of units
  - Lot size and zoning
  - Year built / year renovated

- **Asset Type Classification:**
  - Office
  - Retail
  - Multifamily
  - Industrial
  - Hospitality
  - Mixed-Use
  - Land

- **Development Stage Tracking:**
  - Pre-Development
  - Planning & Entitlements
  - Design & Engineering
  - Construction
  - Lease-Up / Stabilization
  - Stabilized Operations
  - Disposition

### Capital Stack Management

Comprehensive capital structure tracking and analysis:

- **Equity Layers:**
  - Common equity
  - Preferred equity
  - Mezzanine financing
  - Equity percentages and ownership
  - Return requirements by layer

- **Debt Layers:**
  - Senior debt
  - Subordinated debt
  - Construction loans
  - Permanent financing
  - Interest rates and terms
  - Loan-to-value (LTV) ratios
  - Debt service coverage ratios (DSCR)

- **Capital Stack Visualization:**
  - Graphical representation of capital structure
  - Waterfall distribution modeling
  - Return priority visualization
  - Risk/return profile by layer

### Multi-Year Cash Flow Projections

Detailed financial forecasting and analysis:

- **Revenue Projections:**
  - Rental income by unit/space type
  - Occupancy rate assumptions
  - Rent escalations
  - Other income sources
  - Vacancy and collection loss

- **Operating Expenses:**
  - Property management fees
  - Maintenance and repairs
  - Utilities
  - Property taxes
  - Insurance
  - Marketing and leasing costs

- **Capital Expenditures:**
  - Tenant improvements
  - Leasing commissions
  - Major repairs and replacements
  - Building improvements

- **Debt Service:**
  - Principal and interest payments
  - Loan amortization schedules
  - Refinancing assumptions

- **Cash Flow Analysis:**
  - Net Operating Income (NOI)
  - Cash Flow Before Tax (CFBT)
  - Cash Flow After Tax (CFAT)
  - Cash-on-cash returns
  - Equity multiple calculations

### IRR Calculations (Newton's Method)

Advanced IRR computation using Newton's method for precision:

- **Implementation Details:**
  - Iterative Newton-Raphson algorithm
  - Handles complex cash flow patterns
  - Multiple IRR detection
  - Convergence tolerance settings
  - Maximum iteration limits

- **IRR Metrics:**
  - Project IRR (all cash flows)
  - Equity IRR (equity cash flows only)
  - Levered vs. unlevered IRR
  - IRR by investor class

- **Sensitivity Analysis:**
  - IRR sensitivity to key assumptions
  - Tornado charts for variable impact
  - Scenario comparison
  - Risk-adjusted returns

### Development Stage Tracking

Monitor project progress through development lifecycle:

- **Stage Milestones:**
  - Key dates and deadlines
  - Completion percentages
  - Budget tracking by stage
  - Risk factors by stage

- **Stage-Specific Metrics:**
  - Pre-development: Feasibility, entitlements
  - Construction: Draw schedule, completion percentage
  - Lease-up: Occupancy rate, absorption pace
  - Stabilized: NOI, cap rate, valuation

- **Transition Management:**
  - Stage transition criteria
  - Approval workflows
  - Documentation requirements
  - Stakeholder notifications

\newpage

# User Roles & Permissions

SiteSync OS implements a comprehensive role-based access control (RBAC) system to ensure appropriate access levels for all users.

## Role Definitions

### Admin

**Access Level:** Full system access

**Permissions:**

- Create, read, update, delete all records across all modules
- User management (create users, assign roles, deactivate accounts)
- System configuration and settings
- Integration management (API keys, webhooks, external services)
- Analytics and reporting (all projects, all users)
- Audit log access
- Billing and subscription management
- Data export and backup
- Security settings and access controls

**Typical Users:** System administrators, IT managers, executive leadership

### Project Manager

**Access Level:** Full access to assigned projects

**Permissions:**

- Create and manage projects
- Full CRUD on RFIs, submittals, change orders for assigned projects
- Create and manage daily reports
- Upload and manage documents
- Assign tasks and punch items
- Approve time entries and expenses
- View project analytics and reports
- Manage project team members
- Configure project-specific settings
- Create design requests
- Manage equipment assignments
- Approve material requisitions

**Typical Users:** Project managers, construction managers, senior superintendents

### Field Supervisor

**Access Level:** Field operations for assigned projects

**Permissions:**

- View project details (read-only)
- Create and update daily reports
- Create and update punch items
- Create RFIs (approval required for submission)
- Submit time entries for crew
- Log equipment usage
- Request materials
- Upload field photos and documents
- View submittals and change orders (read-only)
- Receive notifications for assigned tasks

**Typical Users:** Site superintendents, foremen, field engineers

### Subcontractor

**Access Level:** Limited to relevant project information

**Permissions:**

- View assigned project details (read-only)
- Respond to RFIs related to their scope
- Submit submittals for their work
- View and update assigned punch items
- Upload documents related to their scope
- Submit time entries for their crew
- View change orders affecting their scope (read-only)
- Receive notifications for items requiring their action

**Typical Users:** Subcontractor project managers, trade foremen

### Client/Owner

**Access Level:** Read-only with approval authority

**Permissions:**

- View all project information (read-only)
- View and approve change orders
- View and approve submittals (if designated as approver)
- View analytics and reports
- Download documents and reports
- Receive notifications for items requiring approval
- Add comments to RFIs and submittals
- View financial summaries and budget status

**Typical Users:** Property owners, developers, owner's representatives

## Permission Matrix

| Feature | Admin | Project Manager | Field Supervisor | Subcontractor | Client/Owner |
|---------|-------|----------------|------------------|---------------|--------------|
| **Projects** |
| Create/Edit | ✓ | ✓ | ✗ | ✗ | ✗ |
| View | ✓ | ✓ | ✓ | ✓ (assigned) | ✓ |
| Delete | ✓ | ✗ | ✗ | ✗ | ✗ |
| **RFIs** |
| Create | ✓ | ✓ | ✓ | ✓ | ✗ |
| Respond | ✓ | ✓ | ✗ | ✓ (assigned) | ✗ |
| Close | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Submittals** |
| Create | ✓ | ✓ | ✗ | ✓ | ✗ |
| Review | ✓ | ✓ | ✗ | ✗ | ✓ (if approver) |
| Approve | ✓ | ✓ | ✗ | ✗ | ✓ (if approver) |
| **Change Orders** |
| Create | ✓ | ✓ | ✗ | ✗ | ✗ |
| Approve | ✓ | ✓ | ✗ | ✗ | ✓ |
| View | ✓ | ✓ | ✓ | ✓ (relevant) | ✓ |
| **Punch Items** |
| Create | ✓ | ✓ | ✓ | ✗ | ✗ |
| Update | ✓ | ✓ | ✓ | ✓ (assigned) | ✗ |
| Verify | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Daily Reports** |
| Create | ✓ | ✓ | ✓ | ✗ | ✗ |
| View | ✓ | ✓ | ✓ | ✗ | ✓ |
| **Documents** |
| Upload | ✓ | ✓ | ✓ | ✓ (scope) | ✗ |
| Download | ✓ | ✓ | ✓ | ✓ (scope) | ✓ |
| Delete | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Time Tracking** |
| Enter Time | ✓ | ✓ | ✓ | ✓ | ✗ |
| Approve Time | ✓ | ✓ | ✗ | ✗ | ✗ |
| View Reports | ✓ | ✓ | ✓ (own) | ✓ (own) | ✗ |
| **Equipment** |
| Manage | ✓ | ✓ | ✗ | ✗ | ✗ |
| Assign | ✓ | ✓ | ✗ | ✗ | ✗ |
| Log Usage | ✓ | ✓ | ✓ | ✗ | ✗ |
| **Analytics** |
| View All | ✓ | ✗ | ✗ | ✗ | ✓ |
| View Project | ✓ | ✓ | ✗ | ✗ | ✓ |
| Export | ✓ | ✓ | ✗ | ✗ | ✓ |

\newpage

# Key Workflows

## RFI Creation → Response → Resolution

**Workflow Steps:**

1. **RFI Creation (Field Supervisor or Subcontractor)**
   - Navigate to RFIs module
   - Click "Create RFI"
   - Fill in required fields:
     - Project selection
     - RFI subject/title
     - Detailed description of question or issue
     - Priority level (Low, Medium, High, Critical)
     - Due date for response
     - Attach supporting documents, drawings, or photos
   - Submit RFI for review

2. **RFI Review (Project Manager)**
   - Receive notification of new RFI
   - Review RFI details and attachments
   - Assign to appropriate respondent (architect, engineer, owner)
   - Add internal comments if needed
   - Update status to "Under Review"
   - Set or adjust response due date

3. **RFI Response (Assigned Respondent)**
   - Receive notification of RFI assignment
   - Review question and supporting materials
   - Research and formulate response
   - Create response with:
     - Detailed answer
     - Supporting documentation
     - Drawings or sketches if applicable
     - Cost or schedule impact notes
   - Submit response

4. **Response Distribution (Automatic)**
   - System sends notification to RFI creator
   - Response distributed to all stakeholders
   - Activity logged in project feed
   - Email notifications sent based on preferences

5. **RFI Resolution (Project Manager)**
   - Review response for completeness
   - Verify response addresses original question
   - Update project documents if needed
   - Close RFI with resolution notes
   - Archive for project records

**Key Metrics Tracked:**

- Time from creation to response
- Number of clarification requests
- Response quality ratings
- Impact on schedule or budget

## Submittal Submission → Review → Approval

**Workflow Steps:**

1. **Submittal Preparation (Subcontractor)**
   - Identify required submittal from specifications
   - Gather product data, shop drawings, or samples
   - Navigate to Submittals module
   - Create new submittal:
     - Select project and specification section
     - Choose submittal type
     - Upload submittal documents
     - Add transmittal notes
     - Set required approval date
   - Submit for review

2. **Initial Review (Project Manager)**
   - Receive submittal notification
   - Perform preliminary review for completeness
   - Check against specification requirements
   - Verify all required information included
   - Assign to appropriate reviewer (architect, engineer, owner)
   - Update status to "Under Review"
   - Set review deadline

3. **Technical Review (Assigned Reviewer)**
   - Receive review assignment notification
   - Download and review submittal documents
   - Check compliance with specifications
   - Verify dimensions, materials, finishes
   - Check coordination with other trades
   - Prepare review response:
     - **Approved:** No exceptions, proceed with work
     - **Approved as Noted:** Minor corrections required
     - **Rejected:** Does not meet requirements, resubmit
     - **Resubmit:** Significant revisions needed
   - Add review comments and markups
   - Submit review response

4. **Response Processing (Project Manager)**
   - Receive review response
   - Review comments and decision
   - Prepare response letter
   - Distribute to subcontractor
   - Update project submittal log
   - Track resubmissions if required

5. **Resubmission (if required)**
   - Subcontractor addresses review comments
   - Creates new submittal version
   - References original submittal
   - Highlights changes made
   - Resubmits for approval
   - Process repeats from step 2

6. **Final Approval & Documentation**
   - Approved submittal filed in project documents
   - Submittal log updated
   - Procurement can proceed
   - Fabrication/installation authorized
   - Compliance tracked for closeout

**Key Metrics Tracked:**

- First-time approval rate
- Average review time
- Number of resubmissions
- Submittal backlog
- Compliance percentage

## Change Order Request → Review → Approval

**Workflow Steps:**

1. **Change Identification**
   - Issue identified requiring change
   - Source: Owner request, design change, site conditions, error/omission
   - Initial assessment of scope and impact

2. **Change Order Request Creation (Project Manager)**
   - Navigate to Change Orders module
   - Create new change order:
     - Detailed description of change
     - Reason/justification
     - Scope of work affected
     - Cost impact (labor, materials, equipment)
     - Schedule impact (time extension)
     - Attach supporting documentation
   - Submit for pricing (if needed)

3. **Pricing & Estimation**
   - Subcontractors provide pricing
   - Material costs obtained
   - Labor hours estimated
   - Equipment costs calculated
   - Overhead and profit applied
   - Total change order value determined

4. **Change Order Package Preparation**
   - Compile all pricing information
   - Prepare detailed cost breakdown
   - Create schedule impact analysis
   - Attach supporting documents:
     - Drawings showing changes
     - Specifications
     - Quotes from vendors/subs
     - Photos of site conditions
   - Prepare change order form

5. **Internal Review (Project Manager)**
   - Review pricing for reasonableness
   - Verify cost breakdown
   - Check against budget contingency
   - Assess schedule impact
   - Prepare recommendation
   - Submit for approval

6. **Approval Workflow**
   - **Level 1:** Project Manager approval (if within authority)
   - **Level 2:** Senior management approval (if over threshold)
   - **Level 3:** Owner approval (required for all)
   - Each level receives notification
   - Approvers can:
     - Approve
     - Reject with comments
     - Request additional information
     - Negotiate pricing

7. **n8n Automation (if configured)**
   - Webhook triggered on change order creation
   - Automated routing to approvers
   - Reminder notifications for pending approvals
   - Escalation for overdue approvals
   - Automatic document generation
   - Integration with accounting system

8. **Execution & Implementation**
   - Approved change order issued
   - Contract value updated
   - Budget revised
   - Schedule adjusted
   - Work authorization issued
   - Subcontractors notified
   - Work proceeds

9. **Tracking & Closeout**
   - Monitor change order work progress
   - Track actual costs vs. approved amount
   - Verify completion
   - Update as-built documents
   - Close change order
   - Update final project costs

**Key Metrics Tracked:**

- Change order volume and value
- Approval cycle time
- Cost variance (estimated vs. actual)
- Change order by category
- Impact on project margin

## Punch Item Assignment → Completion → Verification

**Workflow Steps:**

1. **Punch List Creation (Field Supervisor)**
   - Conduct walkthrough inspection
   - Identify deficiencies and incomplete work
   - For each item:
     - Take photos of issue
     - Write detailed description
     - Specify location (room, area, grid line)
     - Assign to responsible party (subcontractor)
     - Set priority level
     - Set due date for completion
   - Create punch items in system

2. **Punch Item Assignment (Automatic)**
   - System sends notification to assigned party
   - Email with punch item details
   - In-app notification
   - Punch item appears in assignee's task list
   - Due date reminder set

3. **Work Planning (Subcontractor)**
   - Review assigned punch items
   - Assess scope and materials needed
   - Schedule work
   - Coordinate access to areas
   - Update status to "In Progress"

4. **Punch Item Completion (Subcontractor)**
   - Perform corrective work
   - Take completion photos
   - Update punch item:
     - Change status to "Completed"
     - Add completion notes
     - Upload after photos
     - Request verification
   - Notification sent to inspector

5. **Verification Inspection (Field Supervisor)**
   - Receive completion notification
   - Schedule verification inspection
   - Inspect completed work
   - Compare to original punch item
   - Decision:
     - **Verified:** Work acceptable, close punch item
     - **Rejected:** Work unsatisfactory, reopen with comments
   - Update punch item status

6. **Rework (if rejected)**
   - Subcontractor receives rejection notification
   - Reviews rejection comments
   - Schedules rework
   - Repeats completion process
   - Requests re-inspection

7. **Punch List Closeout**
   - All punch items verified and closed
   - Generate final punch list report
   - Obtain owner acceptance
   - Release retainage (if applicable)
   - Update project status to complete
   - Archive punch list documentation

**Key Metrics Tracked:**

- Total punch items by trade
- Open vs. closed punch items
- Average completion time
- First-time acceptance rate
- Punch items per square foot
- Closeout readiness percentage

## Design Request → Task Creation → AI Processing → Callback

**Workflow Steps:**

1. **Design Request Creation (Project Manager)**
   - Navigate to Design Services module
   - Create new design request:
     - Select project
     - Choose design type (rendering, visualization, floor plan, etc.)
     - Provide detailed requirements
     - Upload reference images or drawings
     - Set priority and deadline
     - Specify output format and resolution
   - Submit request

2. **Automated Task Generation (System)**
   - System creates design task record
   - Generates unique task ID
   - Prepares payload for external platform:
     - Task ID
     - Design type
     - Requirements and parameters
     - Reference image URLs
     - Callback URL
     - Authentication token
   - Sends webhook to external AI platform
   - Webhook URL: `https://gmllorlxfsxmsejhsjpa.supabase.co/functions/v1/n8n-orders-webhook`
   - Includes authentication header with `DESIGN_WEBHOOK_SECRET`

3. **External AI Processing**
   - External platform receives webhook
   - Validates authentication
   - Queues design task
   - AI processing begins:
     - Analyzes requirements
     - Processes reference images
     - Generates design output
     - Applies enhancements and optimizations
     - Renders final output
   - Processing time varies by complexity (minutes to hours)

4. **Callback to SiteSync OS (External Platform)**
   - Upon completion, external platform prepares callback
   - Callback payload includes:
     - Original task ID
     - Status (completed, failed)
     - Generated design file URLs
     - Metadata (resolution, format, processing time)
     - Any error messages if failed
   - Posts to SiteSync OS callback endpoint: `/api/webhooks/design-callback`
   - Includes authentication signature

5. **Result Processing (SiteSync OS System)**
   - Callback endpoint receives results
   - Validates authentication signature
   - Matches task ID to original request
   - Downloads generated design files
   - Stores files in AWS S3
   - Updates design request status
   - Attaches results to request record

6. **Notification & Distribution (Automatic)**
   - System sends notification to requester
   - Email with preview and download links
   - In-app notification
   - Activity logged in project feed
   - Stakeholders notified based on preferences

7. **Review & Approval (Project Manager)**
   - Review generated design
   - Assess quality and accuracy
   - Options:
     - **Approve:** Accept design, use in project
     - **Request Revisions:** Provide feedback, resubmit
     - **Reject:** Design does not meet requirements
   - Update design request status
   - Distribute approved designs to team

8. **Integration with Project (if approved)**
   - Add design to project documents
   - Link to relevant RFIs or submittals
   - Include in presentations or reports
   - Use for client communications
   - Archive for project records

**Key Metrics Tracked:**

- Design request volume
- Average processing time
- Approval rate
- Revision requests
- Cost per design
- User satisfaction ratings

\newpage

# Success Metrics

SiteSync OS has achieved significant milestones in development and deployment, demonstrating comprehensive functionality and robust architecture.

## Platform Scale

### Route Architecture

**Total Routes: 77**

- **Page Routes: 46**
  - Public pages (login, signup, landing)
  - Dashboard and analytics
  - Project management pages
  - RFI, Submittal, Change Order pages
  - Punch Item and Daily Report pages
  - Document management
  - Time tracking and crew management
  - Equipment and material management
  - Design services
  - Real estate financial analysis
  - User profile and settings
  - Notification center
  - Activity feed

- **API Endpoints: 53**
  - RESTful API design
  - CRUD operations for all modules
  - Webhook endpoints
  - Analytics and reporting endpoints
  - File upload and download endpoints
  - Notification and activity endpoints
  - Authentication and authorization endpoints

### Database Architecture

**Total Models: 30+**

Core models with comprehensive relationships:

- User management (User, Role, Permission)
- Project management (Project, ProjectMember)
- RFI system (RFI, RFIResponse, RFIComment)
- Submittal system (Submittal, SubmittalResponse, SubmittalComment)
- Change Orders (ChangeOrder)
- Punch Items (PunchItem)
- Daily Reports (DailyReport)
- Documents (Document)
- Design Services (DesignRequest, DesignTask)
- Real Estate (Property, AssetType, DevelopmentStage)
- Notifications (Notification, NotificationPreference)
- Activity Tracking (Activity)
- Time Tracking (TimeEntry, Crew, CrewMember)
- Equipment (Equipment, MaintenanceRecord)
- Materials (MaterialRequisition)

## Feature Completeness

### Real-Time Notification System

- **18+ Activity Types:** Comprehensive tracking of all project events
- **Multi-Channel Delivery:** In-app and email notifications
- **User Preferences:** Granular control over notification settings
- **Unread Tracking:** Badge counts and read/unread status
- **Direct Navigation:** Click notifications to jump to related items

### Advanced Analytics

- **Real-Time Metrics:** Live data updates without page refresh
- **Interactive Visualizations:** Chart.js integration with multiple chart types
- **Flexible Filtering:** Date range selection and custom filters
- **Export Capabilities:** PDF, Excel, CSV export options
- **Trend Analysis:** Historical data comparison and forecasting

### Comprehensive Workflows

- **End-to-End Processes:** Complete workflows from creation to closeout
- **Automated Routing:** Intelligent task assignment and notifications
- **Approval Workflows:** Multi-level approval with audit trails
- **Status Tracking:** Real-time status updates across all modules
- **Integration Points:** Webhook and API integration for external systems

## Performance Metrics

### System Reliability

- **Production-Ready:** Stable build with zero critical errors
- **Database Synchronization:** Prisma schema in sync with database
- **Error Handling:** Comprehensive error handling and logging
- **Data Validation:** Zod schema validation on all inputs
- **Security:** Authentication, authorization, and webhook signature verification

### User Experience

- **Responsive Design:** Mobile-friendly interface across all pages
- **Consistent Navigation:** Reusable BackButton component on 14+ pages
- **Fast Load Times:** Optimized queries and client-side caching
- **Intuitive Interface:** Radix UI components for professional UX
- **Accessibility:** WCAG compliance for inclusive design

### Integration Success

- **AWS S3:** Reliable file storage with presigned URLs
- **External AI Platform:** Successful webhook integration for design services
- **n8n Automation:** Change order automation via webhook
- **Accounting Systems:** Ready for QuickBooks, Xero, and other integrations
- **Email Service:** HTML email templates with reliable delivery

## Adoption Metrics (Target)

### User Engagement

- **Daily Active Users:** Target 80% of licensed users
- **Feature Adoption:** Target 70% usage of core features
- **Mobile Usage:** Target 40% of sessions on mobile devices
- **Notification Engagement:** Target 60% click-through rate
- **Analytics Usage:** Target 50% of project managers using dashboard weekly

### Efficiency Gains

- **RFI Response Time:** Target 50% reduction vs. email-based process
- **Submittal Approval Time:** Target 40% reduction vs. paper-based process
- **Change Order Cycle Time:** Target 60% reduction with automation
- **Punch List Closeout:** Target 30% faster closeout process
- **Document Retrieval:** Target 80% reduction in time to find documents

### Business Impact

- **Project On-Time Delivery:** Target 20% improvement
- **Budget Variance:** Target 15% reduction in cost overruns
- **Rework Reduction:** Target 25% reduction in rework costs
- **Client Satisfaction:** Target 90% satisfaction rating
- **ROI:** Target 300% ROI within 12 months of adoption

## Completed Features (v2.1.0)

### Parametric Detail Engine

The Parametric Detail Engine bridges LOD 100 AI massing models to construction-ready geometry at LOD 200-400.

**Key Features:**

- **LOD Progression:** Supports LOD 100 (Conceptual) through LOD 400 (Fabrication)
- **Window Sizing & Placement:** Rule-based window generation per facade zone
- **Material Application:** Automated material and texture assignment
- **Solar Panel Zones:** Solar array calculation and envelope optimization
- **MEP Rough-In Geometry:** Mechanical, electrical, and plumbing layout generation
- **Floor Plan Generation:** Automated room layouts with dimension annotations
- **Blender Script Output:** Python scripts for 3D model generation in Blender

### Spatial Workbench Module

Full-featured UI for parametric building generation and 2D/3D deliverables export.

**Key Features:**

- **Project Type Presets:** Senior Living, Veteran Housing, Mixed-Use, Commercial
- **Building Dimension Configuration:** Floors, height, footprint width/depth
- **Material Selection Interface:** Facade, glazing, roof, and structure materials
- **Sustainability Targeting:** LEED Silver/Gold/Platinum, PassiveHouse, NetZero
- **Solar & Envelope Optimization:** Automated optimization controls
- **Floor Plan Visualization:** Interactive floor plan display and editing
- **Deliverables Export:** Export to Design Services, Revit/Rhino, permit sets

### Ecosystem Pipeline

5-stage visual workflow from concept to construction documents.

**Pipeline Stages:**

1. **Massing Tool** - GLB block generation for building volumes
2. **Parametric Engine** - Apply construction rules and detail enrichment
3. **Design Services** - Aesthetic rendering and material refinement
4. **Spatial Workbench** - 2D/3D plan generation and review
5. **SiteSync OS Export** - Construction document package output

### Mobile Responsiveness

Enhanced mobile responsiveness across all recently added features ensuring full functionality on tablets and mobile devices.

## Future Roadmap

### Phase 3 (Planned)

- Mobile native apps (iOS and Android)
- Offline mode with sync
- Advanced AI features (predictive analytics, risk assessment)
- BIM (Building Information Modeling) integration
- Drone and IoT sensor integration
- Enhanced collaboration tools (video conferencing, screen sharing)
- Marketplace for third-party integrations

### Phase 4 (Planned)

- Multi-language support
- Global expansion features
- Advanced financial modeling
- Portfolio management for multiple projects
- Benchmarking and industry comparisons
- Machine learning for cost estimation
- Blockchain for contract management

---

**Document Version:** 2.1
**Last Updated:** January 2026
**Status:** Production Release
