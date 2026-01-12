'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BackButton } from '@/components/ui/back-button';
import { Building2, DollarSign, FileText, AlertTriangle, CheckCircle, TrendingUp, Eye } from 'lucide-react';

interface LenderProject {
  id: string;
  name: string;
  status: string;
  startDate?: string;
  endDate?: string;
  budget: number;
  metrics: {
    totalBudget: number;
    totalSpent: number;
    budgetUtilization: number;
    pendingDraws: number;
    approvedDraws: number;
    totalDraws: number;
    openRFIs: number;
    changeOrders: number;
  };
  drawRequests: Array<{
    id: string;
    drawNumber: number;
    status: string;
    totalAmount: number;
    netAmount: number;
    _count: { items: number; documents: number };
  }>;
}

export default function LenderPortalPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [projects, setProjects] = useState<LenderProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<LenderProject | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      fetchLenderData();
    }
  }, [status, router]);

  const fetchLenderData = async () => {
    try {
      const res = await fetch('/api/lender');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching lender data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Planning': 'bg-blue-100 text-blue-800',
      'Active': 'bg-green-100 text-green-800',
      'On Hold': 'bg-yellow-100 text-yellow-800',
      'Completed': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getRiskLevel = (utilization: number) => {
    if (utilization > 95) return { level: 'High', color: 'text-red-500', icon: AlertTriangle };
    if (utilization > 80) return { level: 'Medium', color: 'text-yellow-500', icon: AlertTriangle };
    return { level: 'Low', color: 'text-green-500', icon: CheckCircle };
  };

  const totalStats = {
    totalLoanAmount: projects.reduce((sum, p) => sum + (p.metrics?.totalBudget || 0), 0),
    totalDrawn: projects.reduce((sum, p) => sum + (p.metrics?.totalSpent || 0), 0),
    pendingDraws: projects.reduce((sum, p) => sum + (p.metrics?.pendingDraws || 0), 0),
    activeProjects: projects.filter(p => p.status === 'Active').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <BackButton fallbackUrl="/dashboard" />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Lender Dashboard</h1>
            <p className="text-muted-foreground">Real-time loan compliance and draw tracking</p>
          </div>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Loan Exposure</p>
                <p className="text-2xl font-bold">{formatCurrency(totalStats.totalLoanAmount)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Drawn</p>
                <p className="text-2xl font-bold">{formatCurrency(totalStats.totalDrawn)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
            <Progress value={(totalStats.totalDrawn / totalStats.totalLoanAmount) * 100} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Draws</p>
                <p className="text-2xl font-bold">{totalStats.pendingDraws}</p>
              </div>
              <FileText className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Projects</p>
                <p className="text-2xl font-bold">{totalStats.activeProjects}</p>
              </div>
              <Building2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <Card>
        <CardHeader>
          <CardTitle>Loan Portfolio</CardTitle>
          <CardDescription>Monitor all financed construction projects</CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No projects assigned</p>
              <p className="text-muted-foreground">Projects with lender access will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map(project => {
                const risk = getRiskLevel(project.metrics?.budgetUtilization || 0);
                const RiskIcon = risk.icon;
                
                return (
                  <Card key={project.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{project.name}</h3>
                            <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                            <div className={`flex items-center gap-1 ${risk.color}`}>
                              <RiskIcon className="h-4 w-4" />
                              <span className="text-sm">{risk.level} Risk</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Loan Amount</p>
                              <p className="font-semibold">{formatCurrency(project.metrics?.totalBudget || 0)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Drawn to Date</p>
                              <p className="font-semibold">{formatCurrency(project.metrics?.totalSpent || 0)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Budget Utilization</p>
                              <div className="flex items-center gap-2">
                                <Progress value={project.metrics?.budgetUtilization || 0} className="flex-1" />
                                <span className="text-sm font-medium">{project.metrics?.budgetUtilization || 0}%</span>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Pending Draws</p>
                              <p className="font-semibold">{project.metrics?.pendingDraws || 0}</p>
                            </div>
                          </div>

                          {/* Recent Draws */}
                          {project.drawRequests?.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                              <p className="text-sm font-medium mb-2">Recent Draw Requests</p>
                              <div className="flex gap-2">
                                {project.drawRequests.slice(0, 3).map(dr => (
                                  <Badge key={dr.id} variant="outline">
                                    Draw #{dr.drawNumber}: {formatCurrency(dr.netAmount)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setSelectedProject(project)}>
                          <Eye className="h-4 w-4 mr-2" /> View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
