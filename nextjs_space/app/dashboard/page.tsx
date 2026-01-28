'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  FolderKanban,
  MessageSquare,
  FileText,
  DollarSign,
  Users,
  AlertCircle,
  TrendingUp,
  Plus,
  ArrowRight,
  Calculator,
  BarChart3,
  Activity,
  Shield,
  PlayCircle,
  Settings,
  Target,
  Gauge,
  Zap,
  Brain,
  LineChart,
  PieChart,
  Clock,
  Home,
  Layers,
  Building2,
  Wallet,
  Wrench,
  Database,
  Lock,
  Sparkles,
  Network,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { isMasterAdmin, isManagement, isContractor, isLender, getRoleDisplayName, getRoleBadgeColor } from '@/lib/roles';
import { ReportGenerator } from '@/components/ui/report-generator';

type Project = {
  id: string;
  name: string;
  client: string;
  projectNumber: string;
  status: string;
  phase: string;
  budget: number;
  startDate: string;
};

type DashboardStats = {
  totalProjects: number;
  activeProjects: number;
  openRFIs: number;
  recentReports: number;
  totalBudget: number;
  criticalRFIs: number;
};

type SimulationResult = {
  scenario: string;
  projectedBudget: number;
  projectedTimeline: number;
  riskLevel: string;
  recommendations: string[];
};

export default function DashboardPage() {
  const { data: session } = useSession() || {};
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const userRole = (session?.user as any)?.role;
  const isAdmin = isMasterAdmin(userRole);
  const isManager = isManagement(userRole);
  
  // Simulation state
  const [showSimulation, setShowSimulation] = useState(false);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [simulationParams, setSimulationParams] = useState({
    budgetVariance: 0,
    scheduleDelay: 0,
    resourceChange: 0,
    riskFactor: 'medium',
  });
  const [simulationResults, setSimulationResults] = useState<SimulationResult | null>(null);
  const [runningSimulation, setRunningSimulation] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, projectsRes, allProjectsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/projects?limit=5'),
        fetch('/api/projects?limit=100'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setRecentProjects(projectsData?.projects ?? []);
      }

      if (allProjectsRes.ok) {
        const allProjectsData = await allProjectsRes.json();
        setAllProjects(allProjectsData?.projects ?? []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = async () => {
    setRunningSimulation(true);
    try {
      const res = await fetch('/api/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetVariance: simulationParams.budgetVariance,
          scheduleDelay: simulationParams.scheduleDelay,
          resourceChange: simulationParams.resourceChange,
          riskFactor: simulationParams.riskFactor,
          projectId: selectedProjectId !== 'all' ? selectedProjectId : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSimulationResults({
          scenario: data.scenario,
          projectedBudget: data.projections.budget,
          projectedTimeline: data.projections.timeline,
          riskLevel: data.riskAssessment.level,
          recommendations: data.recommendations,
        });
      } else {
        // Fallback to local calculation if API fails
        const baseBudget = selectedProjectId !== 'all' 
          ? (allProjects.find(p => p.id === selectedProjectId)?.budget || 10000000)
          : (stats?.totalBudget || 10000000);
        const budgetImpact = baseBudget * (simulationParams.budgetVariance / 100);
        const riskMultipliers: Record<string, number> = { low: 0.8, medium: 1.0, high: 1.3, critical: 1.6 };
        const riskMultiplier = riskMultipliers[simulationParams.riskFactor] || 1.0;
        const resourceImpact = simulationParams.resourceChange * 0.02;
        const projectedBudget = baseBudget + budgetImpact + (baseBudget * resourceImpact * riskMultiplier);
        const projectedTimeline = Math.max(0, 12 + simulationParams.scheduleDelay + Math.round(riskMultiplier * 2));
        
        const recommendations: string[] = [];
        if (simulationParams.budgetVariance > 10) recommendations.push('Consider value engineering to reduce costs');
        if (simulationParams.scheduleDelay > 2) recommendations.push('Implement schedule compression techniques');
        if (simulationParams.resourceChange < -10) recommendations.push('Review resource allocation for critical path activities');
        if (['high', 'critical'].includes(simulationParams.riskFactor)) {
          recommendations.push('Increase contingency reserves');
          recommendations.push('Implement additional risk monitoring measures');
        }
        if (recommendations.length === 0) recommendations.push('Current parameters within acceptable tolerances');
        
        setSimulationResults({
          scenario: `Budget ${simulationParams.budgetVariance >= 0 ? '+' : ''}${simulationParams.budgetVariance}%, Schedule ${simulationParams.scheduleDelay >= 0 ? '+' : ''}${simulationParams.scheduleDelay} months, Risk: ${simulationParams.riskFactor}`,
          projectedBudget,
          projectedTimeline,
          riskLevel: simulationParams.riskFactor,
          recommendations,
        });
      }
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setRunningSimulation(false);
    }
  };

  const statCards = [
    {
      title: 'Active Projects',
      value: stats?.activeProjects ?? 0,
      total: stats?.totalProjects ?? 0,
      icon: FolderKanban,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Open RFIs',
      value: stats?.openRFIs ?? 0,
      subtitle: `${stats?.criticalRFIs ?? 0} critical`,
      icon: MessageSquare,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
    {
      title: 'Daily Reports',
      value: stats?.recentReports ?? 0,
      subtitle: 'this week',
      icon: FileText,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Total Budget',
      value: `$${((stats?.totalBudget ?? 0) / 1000000).toFixed(1)}M`,
      subtitle: 'across projects',
      icon: DollarSign,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-700';
      case 'PreConstruction':
        return 'bg-blue-100 text-blue-700';
      case 'OnHold':
        return 'bg-yellow-100 text-yellow-700';
      case 'Completed':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPhaseColor = (phase: string) => {
    const colors: { [key: string]: string } = {
      Planning: 'bg-slate-100 text-slate-700',
      Foundation: 'bg-blue-100 text-blue-700',
      Framing: 'bg-orange-100 text-orange-700',
      MEP: 'bg-purple-100 text-purple-700',
      Finishing: 'bg-green-100 text-green-700',
      Closeout: 'bg-gray-100 text-gray-700',
    };
    return colors[phase] ?? 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome back, {session?.user?.name?.split(' ')[0]}</h1>
              {isAdmin && (
                <Badge className="bg-purple-100 text-purple-800">
                  <Shield className="w-3 h-3 mr-1" />
                  {getRoleDisplayName(userRole)}
                </Badge>
              )}
            </div>
            <p className="text-gray-600">Asset Management Intelligence</p>
          </div>

          {/* Admin-only Quick Actions */}
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <ReportGenerator 
                entityType="portfolio" 
                entityName="Portfolio Overview"
                buttonText="Portfolio Report"
                buttonVariant="outline"
              />
              <Dialog open={showSimulation} onOpenChange={setShowSimulation}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                    <Brain className="w-4 h-4 mr-2" />
                    Run Simulation
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-600" />
                      Project Scenario Simulation
                    </DialogTitle>
                    <DialogDescription>
                      Model different outcomes by adjusting project parameters. This feature is available only to administrators.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-6">
                      {/* Project Selection Dropdown */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <FolderKanban className="w-4 h-4" />
                          Target Project
                        </Label>
                        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Projects (Portfolio)</SelectItem>
                            {allProjects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                <span className="flex items-center gap-2">
                                  {project.name}
                                  <span className="text-xs text-muted-foreground">
                                    ${((project.budget || 0) / 1000000).toFixed(1)}M
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {selectedProjectId !== 'all' 
                            ? `Running scenario on: ${allProjects.find(p => p.id === selectedProjectId)?.name}`
                            : 'Run scenario across all projects'}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="flex items-center justify-between">
                          <span>Budget Variance (%)</span>
                          <span className="font-mono text-sm text-muted-foreground">
                            {simulationParams.budgetVariance >= 0 ? '+' : ''}{simulationParams.budgetVariance}%
                          </span>
                        </Label>
                        <Slider
                          value={[simulationParams.budgetVariance]}
                          onValueChange={([v]) => setSimulationParams(p => ({ ...p, budgetVariance: v }))}
                          min={-30}
                          max={50}
                          step={1}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">Adjust expected budget change</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="flex items-center justify-between">
                          <span>Schedule Delay (months)</span>
                          <span className="font-mono text-sm text-muted-foreground">
                            {simulationParams.scheduleDelay >= 0 ? '+' : ''}{simulationParams.scheduleDelay} mo
                          </span>
                        </Label>
                        <Slider
                          value={[simulationParams.scheduleDelay]}
                          onValueChange={([v]) => setSimulationParams(p => ({ ...p, scheduleDelay: v }))}
                          min={-6}
                          max={12}
                          step={1}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">Simulate schedule compression or delays</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="flex items-center justify-between">
                          <span>Resource Change (%)</span>
                          <span className="font-mono text-sm text-muted-foreground">
                            {simulationParams.resourceChange >= 0 ? '+' : ''}{simulationParams.resourceChange}%
                          </span>
                        </Label>
                        <Slider
                          value={[simulationParams.resourceChange]}
                          onValueChange={([v]) => setSimulationParams(p => ({ ...p, resourceChange: v }))}
                          min={-50}
                          max={50}
                          step={5}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">Adjust workforce/equipment levels</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Risk Factor</Label>
                        <Select
                          value={simulationParams.riskFactor}
                          onValueChange={(v) => setSimulationParams(p => ({ ...p, riskFactor: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low Risk</SelectItem>
                            <SelectItem value="medium">Medium Risk</SelectItem>
                            <SelectItem value="high">High Risk</SelectItem>
                            <SelectItem value="critical">Critical Risk</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Overall project risk assessment</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="rounded-lg border p-4 bg-slate-50">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Simulation Results
                        </h4>
                        
                        {simulationResults ? (
                          <div className="space-y-3">
                            <div className="p-3 rounded-lg bg-white border">
                              <p className="text-xs text-muted-foreground mb-1">Scenario</p>
                              <p className="text-sm font-medium">{simulationResults.scenario}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 rounded-lg bg-white border">
                                <p className="text-xs text-muted-foreground mb-1">Projected Budget</p>
                                <p className="text-lg font-bold text-blue-600">
                                  ${(simulationResults.projectedBudget / 1000000).toFixed(2)}M
                                </p>
                              </div>
                              <div className="p-3 rounded-lg bg-white border">
                                <p className="text-xs text-muted-foreground mb-1">Timeline</p>
                                <p className="text-lg font-bold text-orange-600">
                                  {simulationResults.projectedTimeline} months
                                </p>
                              </div>
                            </div>
                            
                            <div className="p-3 rounded-lg bg-white border">
                              <p className="text-xs text-muted-foreground mb-2">Recommendations</p>
                              <ul className="space-y-1">
                                {simulationResults.recommendations.map((rec, i) => (
                                  <li key={i} className="text-sm flex items-start gap-2">
                                    <Zap className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <PlayCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Adjust parameters and run simulation</p>
                          </div>
                        )}
                      </div>
                      
                      <Button
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600"
                        onClick={runSimulation}
                        disabled={runningSimulation}
                      >
                        {runningSimulation ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Running Simulation...
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Run Simulation
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Link href="/analytics">
                <Button variant="outline">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
              </Link>
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${stat.textColor}`} />
                    </div>
                    {stat.subtitle && (
                      <Badge variant="outline" className="text-xs">
                        {stat.subtitle}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  {stat.total && (
                    <p className="text-xs text-gray-500 mt-1">of {stat.total} total</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* SiteSync OS Modules */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-gray-900">SiteSync OS Modules</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* SiteSync Vault™ */}
          <Card className="border-2 border-slate-200 hover:border-slate-400 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <CardTitle className="text-base">SiteSync Vault™</CardTitle>
                  <CardDescription className="text-xs">Acquisition Module</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link href="/properties" className="flex items-center justify-between p-2 rounded hover:bg-slate-50 text-sm">
                  <span>Properties</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </Link>
                <Link href="/roi-calculator" className="flex items-center justify-between p-2 rounded hover:bg-slate-50 text-sm">
                  <span>ROI Calculator</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </Link>
                <Link href="/lender-portal" className="flex items-center justify-between p-2 rounded hover:bg-slate-50 text-sm">
                  <span>Lender Portal</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* SiteSync Build™ */}
          <Card className="border-2 border-blue-200 hover:border-blue-400 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FolderKanban className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-base">SiteSync Build™</CardTitle>
                  <CardDescription className="text-xs">Project Milestones</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link href="/projects" className="flex items-center justify-between p-2 rounded hover:bg-blue-50 text-sm">
                  <span>Projects</span>
                  <ArrowRight className="w-4 h-4 text-blue-400" />
                </Link>
                <Link href="/gantt" className="flex items-center justify-between p-2 rounded hover:bg-blue-50 text-sm">
                  <span>Timeline / Gantt</span>
                  <ArrowRight className="w-4 h-4 text-blue-400" />
                </Link>
                <Link href="/rfis" className="flex items-center justify-between p-2 rounded hover:bg-blue-50 text-sm">
                  <span>RFIs & Submittals</span>
                  <ArrowRight className="w-4 h-4 text-blue-400" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* SiteSync Ops™ */}
          <Card className="border-2 border-emerald-200 hover:border-emerald-400 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">SiteSync Ops™</CardTitle>
                  <CardDescription className="text-xs">Invoices & Expenses</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link href="/budgeting" className="flex items-center justify-between p-2 rounded hover:bg-emerald-50 text-sm">
                  <span>Budgeting</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </Link>
                <Link href="/draw-requests" className="flex items-center justify-between p-2 rounded hover:bg-emerald-50 text-sm">
                  <span>Draw Requests</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </Link>
                <Link href="/maintenance" className="flex items-center justify-between p-2 rounded hover:bg-emerald-50 text-sm">
                  <span>Maintenance</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* SiteSync Design & Spatial Intelligence */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.27 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Design & Spatial Intelligence</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Massing / Parametric Engine */}
          <Card className="border-2 border-indigo-200 hover:border-indigo-400 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Layers className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Spatial Workbench</CardTitle>
                  <CardDescription className="text-xs">Parametric Detail Engine</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link href="/spatial-workbench" className="flex items-center justify-between p-2 rounded hover:bg-indigo-50 text-sm">
                  <span>Parametric Generator</span>
                  <ArrowRight className="w-4 h-4 text-indigo-400" />
                </Link>
                <Link href="/spatial-workbench" className="flex items-center justify-between p-2 rounded hover:bg-indigo-50 text-sm">
                  <span>Floor Plans</span>
                  <ArrowRight className="w-4 h-4 text-indigo-400" />
                </Link>
                <Link href="/spatial-workbench" className="flex items-center justify-between p-2 rounded hover:bg-indigo-50 text-sm">
                  <span>Deliverables</span>
                  <ArrowRight className="w-4 h-4 text-indigo-400" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Design Services */}
          <Card className="border-2 border-purple-200 hover:border-purple-400 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Design Services</CardTitle>
                  <CardDescription className="text-xs">Aesthetics & Rendering</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link href="/design-services" className="flex items-center justify-between p-2 rounded hover:bg-purple-50 text-sm">
                  <span>Design Requests</span>
                  <ArrowRight className="w-4 h-4 text-purple-400" />
                </Link>
                <Link href="/design-services/new" className="flex items-center justify-between p-2 rounded hover:bg-purple-50 text-sm">
                  <span>New Rendering</span>
                  <ArrowRight className="w-4 h-4 text-purple-400" />
                </Link>
                <Link href="/gis" className="flex items-center justify-between p-2 rounded hover:bg-purple-50 text-sm">
                  <span>GIS / Site Map</span>
                  <ArrowRight className="w-4 h-4 text-purple-400" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Ecosystem Pipeline */}
          <Card className="border-2 border-teal-200 hover:border-teal-400 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                  <Network className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Ecosystem Pipeline</CardTitle>
                  <CardDescription className="text-xs">Massing to Construction</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2 p-1.5 rounded bg-gray-50">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <span>Massing Tool</span>
                  <ArrowRight className="w-3 h-3 text-gray-400 ml-auto" />
                  <span className="text-muted-foreground">GLB Blocks</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 rounded bg-gray-50">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span>Parametric Engine</span>
                  <ArrowRight className="w-3 h-3 text-gray-400 ml-auto" />
                  <span className="text-muted-foreground">LOD 300</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 rounded bg-gray-50">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  <span>Design Services</span>
                  <ArrowRight className="w-3 h-3 text-gray-400 ml-auto" />
                  <span className="text-muted-foreground">Renders</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 rounded bg-gray-50">
                  <div className="w-2 h-2 rounded-full bg-teal-400" />
                  <span>Spatial Workbench</span>
                  <ArrowRight className="w-3 h-3 text-gray-400 ml-auto" />
                  <span className="text-muted-foreground">2D/3D Plans</span>
                </div>
                <div className="flex items-center gap-2 p-1.5 rounded bg-green-50">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="font-medium">SiteSync OS</span>
                  <ArrowRight className="w-3 h-3 text-gray-400 ml-auto" />
                  <span className="text-muted-foreground">Construction Docs</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Zenflow & Quantum Ledger Integration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="mb-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Zenflow AI */}
          <Card className="border border-cyan-200 bg-gradient-to-br from-cyan-50/50 to-blue-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      ZENFLOW
                      <Badge variant="outline" className="text-xs bg-cyan-50 text-cyan-700 border-cyan-200">AI</Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">AI Insights & Risk Analysis</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">Coming Soon</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-white/60">
                  <TrendingUp className="w-5 h-5 mx-auto text-cyan-600 mb-1" />
                  <p className="text-xs text-muted-foreground">Predictive Alerts</p>
                </div>
                <div className="p-3 rounded-lg bg-white/60">
                  <LineChart className="w-5 h-5 mx-auto text-cyan-600 mb-1" />
                  <p className="text-xs text-muted-foreground">Cash Flow Forecasts</p>
                </div>
                <div className="p-3 rounded-lg bg-white/60">
                  <Target className="w-5 h-5 mx-auto text-cyan-600 mb-1" />
                  <p className="text-xs text-muted-foreground">Risk Assessment</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quantum Ledger */}
          <Card className="border border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      QUANTUM LEDGER
                      <Lock className="w-3 h-3 text-slate-500" />
                    </CardTitle>
                    <CardDescription className="text-xs">Unified Financial Infrastructure</CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">Coming Soon</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-white/60">
                  <Shield className="w-5 h-5 mx-auto text-slate-600 mb-1" />
                  <p className="text-xs text-muted-foreground">Capital Governance</p>
                </div>
                <div className="p-3 rounded-lg bg-white/60">
                  <Network className="w-5 h-5 mx-auto text-slate-600 mb-1" />
                  <p className="text-xs text-muted-foreground">Audit Trail</p>
                </div>
                <div className="p-3 rounded-lg bg-white/60">
                  <FileText className="w-5 h-5 mx-auto text-slate-600 mb-1" />
                  <p className="text-xs text-muted-foreground">Compliance Engine</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Admin Control Panel */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                Admin Control Panel
              </CardTitle>
              <CardDescription>Administrative tools and system monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/analytics">
                  <div className="p-4 rounded-lg bg-white border hover:shadow-md transition-shadow cursor-pointer">
                    <PieChart className="w-6 h-6 text-blue-600 mb-2" />
                    <h4 className="font-semibold text-sm">System Analytics</h4>
                    <p className="text-xs text-muted-foreground">View all metrics</p>
                  </div>
                </Link>
                <Link href="/budgeting">
                  <div className="p-4 rounded-lg bg-white border hover:shadow-md transition-shadow cursor-pointer">
                    <DollarSign className="w-6 h-6 text-green-600 mb-2" />
                    <h4 className="font-semibold text-sm">Financial Overview</h4>
                    <p className="text-xs text-muted-foreground">Budget tracking</p>
                  </div>
                </Link>
                <Link href="/gantt">
                  <div className="p-4 rounded-lg bg-white border hover:shadow-md transition-shadow cursor-pointer">
                    <Clock className="w-6 h-6 text-orange-600 mb-2" />
                    <h4 className="font-semibold text-sm">Timeline Control</h4>
                    <p className="text-xs text-muted-foreground">Project schedules</p>
                  </div>
                </Link>
                <div
                  className="p-4 rounded-lg bg-white border hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setShowSimulation(true)}
                >
                  <Brain className="w-6 h-6 text-purple-600 mb-2" />
                  <h4 className="font-semibold text-sm">Run Simulation</h4>
                  <p className="text-xs text-muted-foreground">Model scenarios</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recent Projects */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Your latest construction projects</CardDescription>
            </div>
            {isManager && (
              <Link href="/projects/new">
                <Button className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading projects...</div>
            ) : recentProjects?.length === 0 ? (
              <div className="text-center py-8">
                <FolderKanban className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No projects yet</p>
                {isManager && (
                  <Link href="/projects/new">
                    <Button>Create your first project</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {recentProjects?.map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all bg-white group">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {project.name}
                          </h3>
                          <Badge className={getStatusColor(project.status)}>
                            {project.status === 'PreConstruction' ? 'Pre-Construction' : project.status === 'OnHold' ? 'On Hold' : project.status}
                          </Badge>
                          <Badge variant="outline" className={getPhaseColor(project.phase)}>
                            {project.phase}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <Users className="w-4 h-4 mr-1" />
                            {project.client}
                          </span>
                          <span className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1" />
                            ${(project.budget / 1000000).toFixed(1)}M
                          </span>
                          <span className="text-gray-500">{project.projectNumber}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                ))}
                {recentProjects?.length > 0 && (
                  <Link href="/projects">
                    <Button variant="outline" className="w-full">
                      View All Projects
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8"
      >
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          <Link href="/rfis">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group h-full">
              <CardContent className="p-4 sm:p-6">
                <MessageSquare className="w-6 sm:w-8 h-6 sm:h-8 text-orange-600 mb-2 sm:mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">View RFIs</h3>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Manage requests for information</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/daily-reports">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group h-full">
              <CardContent className="p-4 sm:p-6">
                <FileText className="w-6 sm:w-8 h-6 sm:h-8 text-green-600 mb-2 sm:mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1 group-hover:text-green-600 transition-colors">Daily Reports</h3>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Submit and view field reports</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/documents">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group h-full">
              <CardContent className="p-4 sm:p-6">
                <FileText className="w-6 sm:w-8 h-6 sm:h-8 text-blue-600 mb-2 sm:mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">Documents</h3>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Access project documentation</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/roi-calculator">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 h-full">
              <CardContent className="p-4 sm:p-6">
                <Calculator className="w-6 sm:w-8 h-6 sm:h-8 text-green-600 mb-2 sm:mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1 group-hover:text-green-600 transition-colors">ROI Calculator</h3>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Calculate cost savings</p>
              </CardContent>
            </Card>
          </Link>
          {isManager && (
            <Link href="/accounting/integrations">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer group border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 h-full">
                <CardContent className="p-4 sm:p-6">
                  <DollarSign className="w-6 sm:w-8 h-6 sm:h-8 text-purple-600 mb-2 sm:mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">Accounting</h3>
                  <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Connect accounting software</p>
                </CardContent>
              </Card>
            </Link>
          )}
          <Link href="/analytics">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 h-full">
              <CardContent className="p-4 sm:p-6">
                <BarChart3 className="w-6 sm:w-8 h-6 sm:h-8 text-blue-600 mb-2 sm:mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">Analytics</h3>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">View insights and metrics</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </motion.div>

      {/* Recent Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-8"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest updates across all projects</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/analytics">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <RecentActivityFeed />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// Activity Feed Component
function RecentActivityFeed() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/activities?limit=10');
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, any> = {
      PROJECT_CREATED: FolderKanban,
      PROJECT_UPDATED: FolderKanban,
      RFI_SUBMITTED: MessageSquare,
      RFI_RESPONSE_ADDED: MessageSquare,
      SUBMITTAL_SUBMITTED: FileText,
      CHANGE_ORDER_CREATED: DollarSign,
      PUNCH_ITEM_CREATED: AlertCircle,
      DAILY_REPORT_SUBMITTED: FileText,
      DOCUMENT_UPLOADED: FileText,
    };
    return icons[type] || Activity;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start space-x-3 animate-pulse">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity: any) => {
        const Icon = getActivityIcon(activity.type);
        return (
          <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b last:border-0">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Icon className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">
                <span className="font-medium">
                  {activity.user.firstName} {activity.user.lastName}
                </span>{' '}
                {activity.description}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                {activity.project && (
                  <Badge variant="secondary" className="text-xs">
                    {activity.project.name}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatTimeAgo(activity.createdAt)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
