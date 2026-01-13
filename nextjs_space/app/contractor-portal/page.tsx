'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { BackButton } from '@/components/ui/back-button';
import {
  HardHat,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  MessageSquare,
  Plus,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Target,
  Home,
  ArrowRight,
  PlayCircle,
  Pause,
  Eye,
  Download,
  Filter,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface WorkOrder {
  id: string;
  workOrderNumber: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  estimatedCost?: number;
  actualCost?: number;
  project: { id: string; name: string };
  assignedTo?: { name: string };
  _count?: { photos: number };
}

interface DailyReport {
  id: string;
  reportDate: string;
  project: { name: string };
  weatherCondition: string;
  workCompleted: string;
  crewSize: number;
}

interface ContractorStats {
  totalOrders: number;
  completedOrders: number;
  inProgressOrders: number;
  totalEarnings: number;
  pendingPayments: number;
  onTimeDeliveryRate: number;
  avgCompletionTime: number;
  weeklyProgress: number;
}

export default function ContractorPortalPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [recentReports, setRecentReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      fetchAllData();
    }
  }, [status, router]);

  const fetchAllData = async () => {
    setRefreshing(true);
    try {
      const [ordersRes, reportsRes] = await Promise.all([
        fetch('/api/work-orders'),
        fetch('/api/daily-reports?limit=5'),
      ]);
      
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        setWorkOrders(data.workOrders || []);
      }
      
      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setRecentReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const stats = useMemo<ContractorStats>(() => {
    const completed = workOrders.filter(wo => wo.status === 'COMPLETED');
    const inProgress = workOrders.filter(wo => wo.status === 'IN_PROGRESS');
    const totalEarnings = completed.reduce((sum, wo) => sum + (wo.actualCost || wo.estimatedCost || 0), 0);
    const pendingPayments = inProgress.reduce((sum, wo) => sum + (wo.estimatedCost || 0), 0);
    
    // Calculate on-time delivery
    const onTimeDeliveries = completed.filter(wo => {
      if (!wo.actualEnd || !wo.scheduledEnd) return true;
      return new Date(wo.actualEnd) <= new Date(wo.scheduledEnd);
    });
    
    return {
      totalOrders: workOrders.length,
      completedOrders: completed.length,
      inProgressOrders: inProgress.length,
      totalEarnings,
      pendingPayments,
      onTimeDeliveryRate: completed.length > 0 ? Math.round((onTimeDeliveries.length / completed.length) * 100) : 100,
      avgCompletionTime: 5, // placeholder
      weeklyProgress: 75, // placeholder
    };
  }, [workOrders]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'ASSIGNED': 'bg-blue-100 text-blue-800',
      'IN_PROGRESS': 'bg-purple-100 text-purple-800',
      'ON_HOLD': 'bg-orange-100 text-orange-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'LOW': 'bg-green-100 text-green-800',
      'MEDIUM': 'bg-yellow-100 text-yellow-800',
      'HIGH': 'bg-orange-100 text-orange-800',
      'URGENT': 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Get upcoming deadlines
  const upcomingDeadlines = useMemo(() => {
    return workOrders
      .filter(wo => wo.scheduledEnd && wo.status !== 'COMPLETED' && wo.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.scheduledEnd!).getTime() - new Date(b.scheduledEnd!).getTime())
      .slice(0, 5);
  }, [workOrders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <BackButton fallbackUrl="/dashboard" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center">
            <HardHat className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Contractor Portal</h1>
            <p className="text-muted-foreground">Welcome back, {session?.user?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchAllData} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> New Submission</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Submit Daily Report</DialogTitle>
                <DialogDescription>Submit your daily work report and progress photos</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium">Work Order</label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Select work order" /></SelectTrigger>
                    <SelectContent>
                      {workOrders.map(wo => (
                        <SelectItem key={wo.id} value={wo.id}>{wo.workOrderNumber} - {wo.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Progress Update</label>
                  <Textarea placeholder="Describe today's work and progress..." rows={4} />
                </div>
                <div>
                  <label className="text-sm font-medium">Progress Photos</label>
                  <div className="mt-2 border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Drag and drop photos or click to upload</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
                  <Button onClick={() => setShowNewDialog(false)}>Submit Report</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 gap-4 bg-transparent p-0">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
            <Home className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="timeline" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
            <Calendar className="h-4 w-4 mr-2" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="financials" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
            <DollarSign className="h-4 w-4 mr-2" />
            Financials
          </TabsTrigger>
          <TabsTrigger value="work-orders" className="data-[state=active]:bg-primary data-[state=active]:text-white rounded-lg">
            <FileText className="h-4 w-4 mr-2" />
            Work Orders
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{stats.totalOrders}</p>
                    <p className="text-xs text-green-600 mt-1">+12% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-2xl font-bold">{stats.inProgressOrders}</p>
                    <Progress value={stats.weeklyProgress} className="h-2 mt-2 w-24" />
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Activity className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{stats.completedOrders}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stats.onTimeDeliveryRate}% on time</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Earnings</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.totalEarnings)}</p>
                    <p className="text-xs text-green-600 mt-1">+8% from last month</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions & Deadlines */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/daily-reports/new">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Submit Daily Report
                  </Button>
                </Link>
                <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('work-orders')}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Work Orders
                </Button>
                <Link href="/documents">
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Access Documents
                  </Button>
                </Link>
                <Link href="/rfis">
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    View RFIs
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  Upcoming Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingDeadlines.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No upcoming deadlines</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingDeadlines.map(order => (
                      <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium text-sm">{order.title}</p>
                          <p className="text-xs text-muted-foreground">{order.project?.name}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs">
                            {order.scheduledEnd ? new Date(order.scheduledEnd).toLocaleDateString() : 'No date'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Work Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workOrders.slice(0, 5).map(order => (
                  <div key={order.id} className="flex items-center justify-between p-4 rounded-lg border hover:shadow-sm transition-shadow">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-muted-foreground">{order.workOrderNumber}</span>
                        <Badge className={getStatusColor(order.status)}>{order.status.replace('_', ' ')}</Badge>
                        <Badge className={getPriorityColor(order.priority)}>{order.priority}</Badge>
                      </div>
                      <h3 className="font-semibold">{order.title}</h3>
                      <p className="text-sm text-muted-foreground">{order.project?.name}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Project Timeline
              </CardTitle>
              <CardDescription>Scheduled work orders and milestones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workOrders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No scheduled work orders</p>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                    
                    {workOrders.map((order, index) => (
                      <div key={order.id} className="relative pl-10 pb-8 last:pb-0">
                        {/* Timeline dot */}
                        <div className={`absolute left-2 w-4 h-4 rounded-full border-2 border-white ${order.status === 'COMPLETED' ? 'bg-green-500' : order.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                        
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getStatusColor(order.status)}>
                                    {order.status.replace('_', ' ')}
                                  </Badge>
                                  <span className="font-mono text-sm text-muted-foreground">
                                    {order.workOrderNumber}
                                  </span>
                                </div>
                                <h3 className="font-semibold text-lg">{order.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1">{order.project?.name}</p>
                                {order.description && (
                                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{order.description}</p>
                                )}
                              </div>
                              <div className="text-right text-sm">
                                {order.scheduledStart && (
                                  <p className="text-muted-foreground">
                                    Start: {new Date(order.scheduledStart).toLocaleDateString()}
                                  </p>
                                )}
                                {order.scheduledEnd && (
                                  <p className="font-medium">
                                    Due: {new Date(order.scheduledEnd).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative h-40 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-5xl font-bold text-green-600">{stats.onTimeDeliveryRate}%</p>
                    <p className="text-sm text-muted-foreground mt-2">On-Time Delivery Rate</p>
                  </div>
                </div>
                <Progress value={stats.onTimeDeliveryRate} className="h-2 mt-4" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Completed</span>
                    <span className="font-bold text-green-600">{stats.completedOrders}</span>
                  </div>
                  <Progress value={(stats.completedOrders / stats.totalOrders) * 100} className="h-2 bg-green-100" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">In Progress</span>
                    <span className="font-bold text-blue-600">{stats.inProgressOrders}</span>
                  </div>
                  <Progress value={(stats.inProgressOrders / stats.totalOrders) * 100} className="h-2 bg-blue-100" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Pending</span>
                    <span className="font-bold text-yellow-600">
                      {stats.totalOrders - stats.completedOrders - stats.inProgressOrders}
                    </span>
                  </div>
                  <Progress 
                    value={((stats.totalOrders - stats.completedOrders - stats.inProgressOrders) / stats.totalOrders) * 100} 
                    className="h-2 bg-yellow-100" 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Monthly Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="text-sm">Earnings</span>
                    </div>
                    <span className="font-bold text-green-600">+8%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      <span className="text-sm">Orders</span>
                    </div>
                    <span className="font-bold text-blue-600">+12%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-amber-600" />
                      <span className="text-sm">Efficiency</span>
                    </div>
                    <span className="font-bold text-amber-600">95%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <Card>
            <CardHeader>
              <CardTitle>Work Order Distribution by Project</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(
                  workOrders.reduce((acc, wo) => {
                    const projectName = wo.project?.name || 'Unknown';
                    acc[projectName] = (acc[projectName] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([project, count]) => (
                  <div key={project} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{project}</span>
                      <span className="font-medium">{count} orders</span>
                    </div>
                    <Progress value={(count / workOrders.length) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financials Tab */}
        <TabsContent value="financials" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-lg text-green-800">Total Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-700">{formatCurrency(stats.totalEarnings)}</p>
                <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  +8% from last month
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg text-blue-800">Pending Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-700">{formatCurrency(stats.pendingPayments)}</p>
                <p className="text-sm text-blue-600 mt-2">
                  {stats.inProgressOrders} work orders in progress
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
              <CardHeader>
                <CardTitle className="text-lg text-purple-800">Avg Order Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-700">
                  {stats.completedOrders > 0 
                    ? formatCurrency(stats.totalEarnings / stats.completedOrders)
                    : '$0.00'
                  }
                </p>
                <p className="text-sm text-purple-600 mt-2">
                  Based on {stats.completedOrders} completed orders
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Recent payments and pending invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workOrders.filter(wo => wo.actualCost || wo.estimatedCost).slice(0, 10).map(order => (
                  <div key={order.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">{order.title}</p>
                      <p className="text-sm text-muted-foreground">{order.project?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {formatCurrency(order.actualCost || order.estimatedCost || 0)}
                      </p>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status === 'COMPLETED' ? 'Paid' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Work Orders Tab */}
        <TabsContent value="work-orders" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Work Orders</CardTitle>
                  <CardDescription>Manage and track all assigned work orders</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No work orders found</p>
                    <p className="text-muted-foreground">Work orders assigned to you will appear here</p>
                  </div>
                ) : (
                  workOrders.map(order => (
                    <Card key={order.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedOrder(order)}>
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-mono text-sm text-muted-foreground">{order.workOrderNumber}</span>
                              <Badge className={getStatusColor(order.status)}>{order.status.replace('_', ' ')}</Badge>
                              <Badge className={getPriorityColor(order.priority)}>{order.priority}</Badge>
                            </div>
                            <h3 className="font-semibold text-lg">{order.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{order.project?.name}</p>
                            {order.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{order.description}</p>
                            )}
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            {order.scheduledStart && (
                              <p>Start: {new Date(order.scheduledStart).toLocaleDateString()}</p>
                            )}
                            {order.scheduledEnd && (
                              <p>End: {new Date(order.scheduledEnd).toLocaleDateString()}</p>
                            )}
                            {(order.estimatedCost || order.actualCost) && (
                              <p className="font-semibold text-foreground mt-2">
                                {formatCurrency(order.actualCost || order.estimatedCost || 0)}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Work Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl">
          {selectedOrder && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{selectedOrder.workOrderNumber}</span>
                  <Badge className={getStatusColor(selectedOrder.status)}>{selectedOrder.status.replace('_', ' ')}</Badge>
                </div>
                <DialogTitle className="text-xl">{selectedOrder.title}</DialogTitle>
                <DialogDescription>{selectedOrder.project?.name}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedOrder.description || 'No description provided'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Scheduled Start</h4>
                    <p className="text-sm">{selectedOrder.scheduledStart ? new Date(selectedOrder.scheduledStart).toLocaleDateString() : 'Not set'}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Scheduled End</h4>
                    <p className="text-sm">{selectedOrder.scheduledEnd ? new Date(selectedOrder.scheduledEnd).toLocaleDateString() : 'Not set'}</p>
                  </div>
                </div>
                {(selectedOrder.estimatedCost || selectedOrder.actualCost) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Estimated Cost</h4>
                      <p className="text-sm">{selectedOrder.estimatedCost ? formatCurrency(selectedOrder.estimatedCost) : 'Not set'}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Actual Cost</h4>
                      <p className="text-sm">{selectedOrder.actualCost ? formatCurrency(selectedOrder.actualCost) : 'Pending'}</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-4">
                  <Button className="flex-1"><Upload className="h-4 w-4 mr-2" />Upload Photos</Button>
                  <Button variant="outline" className="flex-1"><MessageSquare className="h-4 w-4 mr-2" />Send Message</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Back to Dashboard Link for Navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-center"
      >
        <Link href="/dashboard">
          <Button variant="outline" className="gap-2">
            <Home className="h-4 w-4" />
            Back to Main Dashboard
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
