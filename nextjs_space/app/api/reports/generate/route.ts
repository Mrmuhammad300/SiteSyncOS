import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

interface SessionUser {
  id: string;
  email: string;
  role: string;
}

interface ReportConfig {
  type: string;
  style: string;
  format: string;
  sections: string[];
  includeCharts: boolean;
  includePhotos: boolean;
  includeFinancials: boolean;
  customTitle?: string;
  customNotes?: string;
}

interface ProjectData {
  id: string;
  name: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  budget: number | null;
  actualCost: number | null;
  progress: number | null;
  description: string | null;
  address: string | null;
  _count: {
    rfis: number;
    submittals: number;
    changeOrders: number;
    punchItems: number;
    dailyReports: number;
  };
  rfis?: Array<{ id: string; status: string; priority: string }>;
  submittals?: Array<{ id: string; status: string }>;
  changeOrders?: Array<{ id: string; status: string; proposedCost: number | null }>;
}

// Generate report data based on entity type
async function generateReportData(
  entityType: string,
  entityId: string | undefined,
  config: ReportConfig,
  userId: string
) {
  const reportData: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    generatedBy: userId,
    reportType: config.type,
    style: config.style,
    format: config.format,
  };

  switch (entityType) {
    case 'project': {
      if (!entityId) throw new Error('Project ID required');
      
      const project = await prisma.project.findUnique({
        where: { id: entityId },
        include: {
          _count: {
            select: {
              rfis: true,
              submittals: true,
              changeOrders: true,
              punchItems: true,
              dailyReports: true,
            },
          },
          rfis: config.sections.includes('rfis') ? {
            select: { id: true, status: true, priority: true },
            take: 50,
          } : false,
          submittals: config.sections.includes('submittals') ? {
            select: { id: true, status: true },
            take: 50,
          } : false,
          changeOrders: config.sections.includes('change_orders') ? {
            select: { id: true, status: true, proposedCost: true },
            take: 50,
          } : false,
        },
      }) as ProjectData | null;

      if (!project) throw new Error('Project not found');

      reportData.project = {
        name: project.name,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        budget: project.budget,
        actualCost: project.actualCost,
        progress: project.progress,
        description: project.description,
        address: project.address,
      };

      // Overview section
      if (config.sections.includes('overview')) {
        reportData.overview = {
          totalRFIs: project._count.rfis,
          totalSubmittals: project._count.submittals,
          totalChangeOrders: project._count.changeOrders,
          totalPunchItems: project._count.punchItems,
          totalDailyReports: project._count.dailyReports,
        };
      }

      // Budget section
      if (config.sections.includes('budget') && config.includeFinancials) {
        const budgetVariance = project.budget && project.actualCost
          ? ((project.actualCost - project.budget) / project.budget) * 100
          : 0;
        
        reportData.budget = {
          totalBudget: project.budget,
          actualCost: project.actualCost,
          variance: budgetVariance,
          remaining: project.budget ? (project.budget - (project.actualCost || 0)) : 0,
        };
      }

      // Progress section
      if (config.sections.includes('progress')) {
        reportData.progress = {
          percentComplete: project.progress || 0,
          scheduledCompletion: project.endDate,
          daysRemaining: project.endDate
            ? Math.ceil((new Date(project.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null,
        };
      }

      // RFIs section
      if (config.sections.includes('rfis') && project.rfis) {
        const rfisByStatus = project.rfis.reduce((acc: Record<string, number>, rfi: { status: string }) => {
          acc[rfi.status] = (acc[rfi.status] || 0) + 1;
          return acc;
        }, {});
        
        reportData.rfis = {
          total: project._count.rfis,
          byStatus: rfisByStatus,
        };
      }

      // Submittals section
      if (config.sections.includes('submittals') && project.submittals) {
        const submittalsByStatus = project.submittals.reduce((acc: Record<string, number>, s: { status: string }) => {
          acc[s.status] = (acc[s.status] || 0) + 1;
          return acc;
        }, {});
        
        reportData.submittals = {
          total: project._count.submittals,
          byStatus: submittalsByStatus,
        };
      }

      // Change Orders section
      if (config.sections.includes('change_orders') && project.changeOrders) {
        const totalCOValue = project.changeOrders.reduce(
          (sum: number, co: { proposedCost: number | null }) => sum + (co.proposedCost || 0),
          0
        );
        
        reportData.changeOrders = {
          total: project._count.changeOrders,
          totalValue: totalCOValue,
        };
      }

      break;
    }

    case 'portfolio': {
      const projects = await prisma.project.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          budget: true,
          startDate: true,
          estimatedCompletion: true,
        },
      });

      const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);

      reportData.portfolio = {
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'Active').length,
        completedProjects: projects.filter(p => p.status === 'Completed').length,
        totalBudget,
      };

      if (config.sections.includes('projects')) {
        reportData.projects = projects.map(p => ({
          name: p.name,
          status: p.status,
          budget: p.budget,
        }));
      }

      break;
    }

    case 'draw_request': {
      if (!entityId) throw new Error('Draw Request ID required');
      
      const drawRequest = await prisma.drawRequest.findUnique({
        where: { id: entityId },
      });

      if (!drawRequest) throw new Error('Draw Request not found');

      reportData.drawRequest = {
        drawNumber: drawRequest.drawNumber,
        status: drawRequest.status,
        requestedAmount: drawRequest.requestedAmount,
        approvedAmount: drawRequest.approvedAmount,
        submittedDate: drawRequest.submittedDate,
        approvedDate: drawRequest.approvedDate,
      };

      break;
    }

    default:
      reportData.message = `Report data for ${entityType} generated`;
  }

  // Add custom notes if provided
  if (config.customNotes) {
    reportData.notes = config.customNotes;
  }

  return reportData;
}

// Generate HTML report template
function generateHTMLReport(
  data: Record<string, unknown>,
  config: ReportConfig,
  entityName?: string
): string {
  const title = config.customTitle || `${entityName || 'SiteSync OS'} Report`;
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const styleClass = config.style === 'institutional' ? 'font-serif' : 'font-sans';
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body { font-family: ${config.style === 'institutional' ? 'Georgia, serif' : 'Arial, sans-serif'}; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { color: #1e3a5f; margin: 0; }
        .header .subtitle { color: #666; font-size: 14px; margin-top: 5px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #1e3a5f; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #1e3a5f; }
        .metric-label { font-size: 12px; color: #666; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: 600; }
        .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .status-active { background: #d4edda; color: #155724; }
        .status-completed { background: #cce5ff; color: #004085; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        .confidential { color: #dc3545; font-weight: bold; }
        @media print { body { margin: 20px; } }
      </style>
    </head>
    <body class="${styleClass}">
      <div class="header">
        <h1>${title}</h1>
        <div class="subtitle">
          Generated: ${date} | Style: ${config.style.replace('_', ' ').toUpperCase()}
          ${config.style === 'institutional' ? '<span class="confidential"> | CONFIDENTIAL</span>' : ''}
        </div>
      </div>
  `;

  // Add project overview
  if (data.project) {
    const project = data.project as Record<string, unknown>;
    html += `
      <div class="section">
        <h2>Project Overview</h2>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-value">${project.progress || 0}%</div>
            <div class="metric-label">Progress</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">$${((project.budget as number) || 0).toLocaleString()}</div>
            <div class="metric-label">Total Budget</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">$${((project.actualCost as number) || 0).toLocaleString()}</div>
            <div class="metric-label">Actual Cost</div>
          </div>
        </div>
        <table>
          <tr><th>Project Name</th><td>${project.name}</td></tr>
          <tr><th>Status</th><td><span class="status-badge status-${(project.status as string || '').toLowerCase()}">${project.status}</span></td></tr>
          <tr><th>Start Date</th><td>${project.startDate ? new Date(project.startDate as string).toLocaleDateString() : 'TBD'}</td></tr>
          <tr><th>End Date</th><td>${project.endDate ? new Date(project.endDate as string).toLocaleDateString() : 'TBD'}</td></tr>
        </table>
      </div>
    `;
  }

  // Add overview metrics
  if (data.overview) {
    const overview = data.overview as Record<string, number>;
    html += `
      <div class="section">
        <h2>Activity Summary</h2>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-value">${overview.totalRFIs || 0}</div>
            <div class="metric-label">RFIs</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${overview.totalSubmittals || 0}</div>
            <div class="metric-label">Submittals</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${overview.totalChangeOrders || 0}</div>
            <div class="metric-label">Change Orders</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${overview.totalPunchItems || 0}</div>
            <div class="metric-label">Punch Items</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${overview.totalDailyReports || 0}</div>
            <div class="metric-label">Daily Reports</div>
          </div>
        </div>
      </div>
    `;
  }

  // Add budget section
  if (data.budget && config.includeFinancials) {
    const budget = data.budget as Record<string, number>;
    const varianceClass = budget.variance > 0 ? 'color: #dc3545;' : 'color: #28a745;';
    html += `
      <div class="section">
        <h2>Financial Summary</h2>
        <table>
          <tr><th>Total Budget</th><td>$${(budget.totalBudget || 0).toLocaleString()}</td></tr>
          <tr><th>Actual Cost</th><td>$${(budget.actualCost || 0).toLocaleString()}</td></tr>
          <tr><th>Variance</th><td style="${varianceClass}">${budget.variance > 0 ? '+' : ''}${(budget.variance || 0).toFixed(1)}%</td></tr>
          <tr><th>Remaining Budget</th><td>$${(budget.remaining || 0).toLocaleString()}</td></tr>
        </table>
      </div>
    `;
  }

  // Add portfolio section
  if (data.portfolio) {
    const portfolio = data.portfolio as Record<string, number>;
    html += `
      <div class="section">
        <h2>Portfolio Overview</h2>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-value">${portfolio.totalProjects}</div>
            <div class="metric-label">Total Projects</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${portfolio.activeProjects}</div>
            <div class="metric-label">Active</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${(portfolio.averageProgress || 0).toFixed(0)}%</div>
            <div class="metric-label">Avg Progress</div>
          </div>
        </div>
        <table>
          <tr><th>Total Budget</th><td>$${(portfolio.totalBudget || 0).toLocaleString()}</td></tr>
          <tr><th>Total Actual</th><td>$${(portfolio.totalActual || 0).toLocaleString()}</td></tr>
          <tr><th>Budget Variance</th><td>${(portfolio.budgetVariance || 0).toFixed(1)}%</td></tr>
        </table>
      </div>
    `;
  }

  // Add notes if provided
  if (data.notes) {
    html += `
      <div class="section">
        <h2>Additional Notes</h2>
        <p>${data.notes}</p>
      </div>
    `;
  }

  html += `
      <div class="footer">
        <p>This report was generated by SiteSync OS on ${date}.</p>
        ${config.style === 'institutional' ? '<p>This document contains confidential information intended for authorized recipients only.</p>' : ''}
      </div>
    </body>
    </html>
  `;

  return html;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const { entityType, entityId, entityName, config } = await request.json();

    if (!entityType || !config) {
      return NextResponse.json(
        { error: 'entityType and config are required' },
        { status: 400 }
      );
    }

    // Generate report data
    const reportData = await generateReportData(entityType, entityId, config, user.id);

    // Generate HTML report
    const htmlContent = generateHTMLReport(reportData, config, entityName);

    // For now, return the HTML as a data URL
    // In production, you would convert this to PDF using the HTML2PDF API
    const base64Html = Buffer.from(htmlContent).toString('base64');
    const reportUrl = `data:text/html;base64,${base64Html}`;

    // Create report record
    const reportId = `RPT-${Date.now()}`;

    return NextResponse.json({
      success: true,
      reportId,
      reportUrl,
      reportData,
      format: config.format,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 }
    );
  }
}
