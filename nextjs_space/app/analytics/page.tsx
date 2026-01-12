'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BackButton } from '@/components/ui/back-button';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  FileText,
  MessageSquare,
  ClipboardCheck,
  CheckCircle,
  AlertTriangle,
  Download,
  Calendar,
  Clock,
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Metrics {
  projectHealth: any;
  rfiMetrics: any;
  submittalMetrics: any;
  changeOrderMetrics: any;
  punchItemMetrics: any;
  documentMetrics: any;
  timeTrackingMetrics: any;
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [metricsRes, trendsRes] = await Promise.all([
        fetch('/api/analytics/metrics'),
        fetch(`/api/analytics/trends?days=${dateRange}`),
      ]);

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      if (trendsRes.ok) {
        const trendsData = await trendsRes.json();
        setTrends(trendsData);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number | undefined) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.0%';
    }
    return `${value.toFixed(1)}%`;
  };

  // Chart colors
  const chartColors = {
    primary: 'rgb(59, 130, 246)',
    success: 'rgb(34, 197, 94)',
    warning: 'rgb(251, 146, 60)',
    danger: 'rgb(239, 68, 68)',
    purple: 'rgb(168, 85, 247)',
  };

  if (loading || !metrics || !trends) {
    return (
      <div className="space-y-6 p-6">
        {/* Back Button - Always visible */}
        <BackButton fallbackUrl="/dashboard" label="Back to Dashboard" />
        
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Prepare trend chart data
  const trendChartData = {
    labels: trends.trends.rfis.map((d: any) => d.date),
    datasets: [
      {
        label: 'RFIs',
        data: trends.trends.rfis.map((d: any) => d.count),
        borderColor: chartColors.primary,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Submittals',
        data: trends.trends.submittals.map((d: any) => d.count),
        borderColor: chartColors.purple,
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Change Orders',
        data: trends.trends.changeOrders.map((d: any) => d.count),
        borderColor: chartColors.warning,
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Project status chart
  const projectStatusData = {
    labels: metrics.projectHealth.projectsByStatus.map((s: any) => s.status),
    datasets: [
      {
        data: metrics.projectHealth.projectsByStatus.map((s: any) => s.count),
        backgroundColor: [
          chartColors.primary,
          chartColors.success,
          chartColors.warning,
          chartColors.danger,
        ],
      },
    ],
  };

  return (
    <div className="space-y-6 p-6">
      {/* Back Button - Prominent placement */}
      <div className="mb-2">
        <BackButton fallbackUrl="/dashboard" label="Back to Dashboard" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into project performance and metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => {
            // Generate and download CSV report
            const csvContent = [
              ['Category', 'Metric', 'Value'],
              ['Projects', 'Total', metrics?.projectHealth?.total || 0],
              ['Projects', 'Active', metrics?.projectHealth?.active || 0],
              ['Projects', 'Completed', metrics?.projectHealth?.completed || 0],
              ['RFIs', 'Total', metrics?.rfiMetrics?.total || 0],
              ['RFIs', 'Open', metrics?.rfiMetrics?.open || 0],
              ['Submittals', 'Total', metrics?.submittalMetrics?.total || 0],
              ['Submittals', 'Pending', metrics?.submittalMetrics?.pending || 0],
              ['Change Orders', 'Total', metrics?.changeOrderMetrics?.total || 0],
              ['Punch Items', 'Open', metrics?.punchItemMetrics?.open || 0]
            ].map(row => row.join(',')).join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
          }}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="rfis">RFIs</TabsTrigger>
          <TabsTrigger value="submittals">Submittals</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.projectHealth.activeProjects}</div>
                <p className="text-xs text-muted-foreground">
                  of {metrics.projectHealth.totalProjects} total projects
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On-Time Performance</CardTitle>
                {metrics.projectHealth.onTimePercentage >= 80 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPercentage(metrics.projectHealth.onTimePercentage)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics.projectHealth.onTimeCount} on time, {metrics.projectHealth.delayedCount}{' '}
                  delayed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Budget Variance</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    metrics.projectHealth.budgetVariance > 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {metrics.projectHealth.budgetVariance > 0 ? '+' : ''}
                  {formatPercentage(metrics.projectHealth.budgetVariance)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(metrics.projectHealth.totalActualCost)} actual cost
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">RFI Response Time</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.rfiMetrics.avgResponseTimeDays != null ? metrics.rfiMetrics.avgResponseTimeDays.toFixed(1) : '0.0'} days
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics.rfiMetrics.totalRFIs || 0} total RFIs
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Trends</CardTitle>
              <CardDescription>Daily activity over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <Line
                data={trendChartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        precision: 0,
                      },
                    },
                  },
                }}
              />
            </CardContent>
          </Card>

          {/* Additional Metrics */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ClipboardCheck className="h-5 w-5 mr-2 text-purple-600" />
                  Submittals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-medium">{metrics.submittalMetrics.totalSubmittals}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Approved</span>
                  <span className="font-medium text-green-600">
                    {metrics.submittalMetrics.approvedSubmittals}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Approval Rate</span>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    {formatPercentage(metrics.submittalMetrics.approvalRate)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-orange-600" />
                  Change Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-medium">{metrics.changeOrderMetrics.totalChangeOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Approved</span>
                  <span className="font-medium text-green-600">
                    {metrics.changeOrderMetrics.approvedChangeOrders}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Cost</span>
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    {formatCurrency(metrics.changeOrderMetrics.totalCost)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-red-600" />
                  Punch Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-medium">{metrics.punchItemMetrics.totalPunchItems}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Open</span>
                  <span className="font-medium text-red-600">
                    {metrics.punchItemMetrics.openPunchItems}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Completion Rate</span>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    {formatPercentage(metrics.punchItemMetrics.completionRate)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Project Status Distribution</CardTitle>
                <CardDescription>Breakdown of projects by status</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <div className="w-64 h-64">
                  <Doughnut
                    data={projectStatusData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          position: 'bottom' as const,
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Project Health Summary</CardTitle>
                <CardDescription>Key project health indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Budget</span>
                    <span className="text-lg font-bold">
                      {formatCurrency(metrics.projectHealth.totalBudget)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Actual Cost</span>
                    <span className="text-lg font-bold">
                      {formatCurrency(metrics.projectHealth.totalActualCost)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Variance</span>
                    <span
                      className={`text-lg font-bold ${
                        metrics.projectHealth.budgetVariance > 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {formatCurrency(
                        metrics.projectHealth.totalActualCost - metrics.projectHealth.totalBudget
                      )}
                    </span>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Schedule Performance</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">On Time</span>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        {metrics.projectHealth.onTimeCount}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Delayed</span>
                      <Badge variant="outline" className="text-red-600 border-red-600">
                        {metrics.projectHealth.delayedCount}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rfis" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>RFI Performance Metrics</CardTitle>
                <CardDescription>Request for Information statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium">Total RFIs</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {metrics.rfiMetrics.totalRFIs}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">Resolved RFIs</span>
                  <span className="text-2xl font-bold text-green-600">
                    {metrics.rfiMetrics.resolvedRFIs}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <span className="text-sm font-medium">Open RFIs</span>
                  <span className="text-2xl font-bold text-orange-600">
                    {metrics.rfiMetrics.openRFIs}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm font-medium">Response Rate</span>
                  <Badge className="bg-purple-600 text-white">
                    {formatPercentage(metrics.rfiMetrics.responseRate)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>RFI Response Times</CardTitle>
                <CardDescription>Average time to respond to RFIs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-blue-600" />
                      <span className="text-sm font-medium">Average Response Time</span>
                    </div>
                    <span className="text-xl font-bold">
                      {metrics.rfiMetrics.avgResponseTimeDays != null ? metrics.rfiMetrics.avgResponseTimeDays.toFixed(1) : '0.0'} days
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{
                        width: `${Math.min(
                          ((metrics.rfiMetrics.avgResponseTimeDays || 0) / 10) * 100,
                          100
                        )}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Target: ≤ 5 days for optimal performance
                  </p>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <h4 className="text-sm font-semibold">RFI Status Breakdown</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Open</span>
                      <span className="font-medium">{metrics.rfiMetrics.openRFIs}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">In Progress</span>
                      <span className="font-medium">
                        {metrics.rfiMetrics.totalRFIs - metrics.rfiMetrics.resolvedRFIs - metrics.rfiMetrics.openRFIs}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Resolved</span>
                      <span className="font-medium text-green-600">
                        {metrics.rfiMetrics.resolvedRFIs}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>RFI Activity Trends</CardTitle>
              <CardDescription>RFI creation and resolution over time</CardDescription>
            </CardHeader>
            <CardContent>
              <Bar
                data={{
                  labels: trends.trends.rfis.map((d: any) => d.date),
                  datasets: [
                    {
                      label: 'RFIs Created',
                      data: trends.trends.rfis.map((d: any) => d.count),
                      backgroundColor: 'rgba(59, 130, 246, 0.5)',
                      borderColor: 'rgb(59, 130, 246)',
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        precision: 0,
                      },
                    },
                  },
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submittals" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Submittal Performance</CardTitle>
                <CardDescription>Submittal approval metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm font-medium">Total Submittals</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {metrics.submittalMetrics.totalSubmittals}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium">Approved</span>
                  <span className="text-2xl font-bold text-green-600">
                    {metrics.submittalMetrics.approvedSubmittals}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <span className="text-sm font-medium">Rejected</span>
                  <span className="text-2xl font-bold text-red-600">
                    {metrics.submittalMetrics.rejectedSubmittals}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <span className="text-sm font-medium">Pending Review</span>
                  <span className="text-2xl font-bold text-orange-600">
                    {metrics.submittalMetrics.pendingSubmittals}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Approval Rate & Timeline</CardTitle>
                <CardDescription>Success metrics for submittal approvals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Approval Rate</span>
                    <Badge
                      className={`${
                        metrics.submittalMetrics.approvalRate >= 80
                          ? 'bg-green-600'
                          : metrics.submittalMetrics.approvalRate >= 60
                          ? 'bg-orange-600'
                          : 'bg-red-600'
                      } text-white`}
                    >
                      {formatPercentage(metrics.submittalMetrics.approvalRate)}
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${
                        metrics.submittalMetrics.approvalRate >= 80
                          ? 'bg-green-600'
                          : metrics.submittalMetrics.approvalRate >= 60
                          ? 'bg-orange-600'
                          : 'bg-red-600'
                      }`}
                      style={{ width: `${metrics.submittalMetrics.approvalRate}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Target: ≥ 80% approval rate for optimal workflow
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-3">Submittal Distribution</h4>
                  <div className="h-48 flex items-center justify-center">
                    <Doughnut
                      data={{
                        labels: ['Approved', 'Pending', 'Rejected'],
                        datasets: [
                          {
                            data: [
                              metrics.submittalMetrics.approvedSubmittals,
                              metrics.submittalMetrics.pendingSubmittals,
                              metrics.submittalMetrics.rejectedSubmittals,
                            ],
                            backgroundColor: [
                              'rgb(34, 197, 94)',
                              'rgb(251, 146, 60)',
                              'rgb(239, 68, 68)',
                            ],
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                          legend: {
                            position: 'bottom' as const,
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Submittal Activity Trends</CardTitle>
              <CardDescription>Submittal submissions over time</CardDescription>
            </CardHeader>
            <CardContent>
              <Line
                data={{
                  labels: trends.trends.submittals.map((d: any) => d.date),
                  datasets: [
                    {
                      label: 'Submittals',
                      data: trends.trends.submittals.map((d: any) => d.count),
                      borderColor: 'rgb(168, 85, 247)',
                      backgroundColor: 'rgba(168, 85, 247, 0.1)',
                      tension: 0.4,
                      fill: true,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        precision: 0,
                      },
                    },
                  },
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                  Total Budget
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(metrics.projectHealth.totalBudget)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Across all active projects
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
                  Actual Cost
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {formatCurrency(metrics.projectHealth.totalActualCost)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Current spending to date
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-orange-600" />
                  Variance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${
                    metrics.projectHealth.budgetVariance > 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {formatCurrency(
                    metrics.projectHealth.totalActualCost - metrics.projectHealth.totalBudget
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {metrics.projectHealth.budgetVariance > 0 ? 'Over' : 'Under'} budget by{' '}
                  {formatPercentage(Math.abs(metrics.projectHealth.budgetVariance))}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Change Order Financial Impact</CardTitle>
                <CardDescription>Cost analysis of change orders</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="text-sm font-medium">Total Change Orders</span>
                    <span className="text-xl font-bold text-orange-600">
                      {metrics.changeOrderMetrics.totalChangeOrders}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">Total Cost Impact</span>
                    <span className="text-xl font-bold text-blue-600">
                      {formatCurrency(metrics.changeOrderMetrics.totalCost)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium">Approved Cost</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(metrics.changeOrderMetrics.approvedCost)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <span className="text-sm font-medium">Pending Cost</span>
                    <span className="text-xl font-bold text-yellow-600">
                      {formatCurrency(metrics.changeOrderMetrics.pendingCost)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Budget Performance by Project</CardTitle>
                <CardDescription>Top projects by budget variance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.projectHealth.projectsByStatus.slice(0, 5).map((project: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{project.status}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.count} project{project.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Badge variant="outline">{project.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Change Order Cost Trends</CardTitle>
              <CardDescription>Change order cost impact over time</CardDescription>
            </CardHeader>
            <CardContent>
              <Bar
                data={{
                  labels: trends.trends.changeOrders.map((d: any) => d.date),
                  datasets: [
                    {
                      label: 'Change Order Count',
                      data: trends.trends.changeOrders.map((d: any) => d.count),
                      backgroundColor: 'rgba(251, 146, 60, 0.5)',
                      borderColor: 'rgb(251, 146, 60)',
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        precision: 0,
                      },
                    },
                  },
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
