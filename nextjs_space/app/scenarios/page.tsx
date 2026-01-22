'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { BackButton } from '@/components/ui/back-button';
import {
  Play,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Calendar,
  Users,
  Shield,
  Zap,
  BarChart3,
  RefreshCw,
  Save,
  FileText,
  Target,
  Building2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  status: string;
  budget: number;
  startDate: string;
  endDate: string | null;
}

interface Template {
  id: string;
  name: string;
  description: string;
  params: {
    budgetVariance: number;
    scheduleDelay: number;
    resourceChange: number;
    riskFactor: string;
  };
}

interface SimulationResult {
  scenario: string;
  baseData: {
    budget: number;
    duration: number;
    projects: number;
  };
  projections: {
    budget: number;
    budgetChange: number;
    budgetChangePercent: number;
    timeline: number;
    timelineChange: number;
  };
  riskAssessment: {
    level: string;
    score: number;
    multiplier: number;
  };
  recommendations: string[];
  simulatedAt: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getRiskColor = (level: string) => {
  switch (level.toLowerCase()) {
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getRiskScoreColor = (score: number) => {
  if (score <= 25) return 'bg-green-500';
  if (score <= 50) return 'bg-yellow-500';
  if (score <= 75) return 'bg-orange-500';
  return 'bg-red-500';
};

export default function ScenariosPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [savedScenarios, setSavedScenarios] = useState<SimulationResult[]>([]);
  
  // Scenario parameters
  const [budgetVariance, setBudgetVariance] = useState(0);
  const [scheduleDelay, setScheduleDelay] = useState(0);
  const [resourceChange, setResourceChange] = useState(0);
  const [riskFactor, setRiskFactor] = useState('medium');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch projects
        const projectsRes = await fetch('/api/projects');
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          setProjects(projectsData.projects || projectsData || []);
        }

        // Fetch simulation templates
        const templatesRes = await fetch('/api/simulation');
        if (templatesRes.ok) {
          const templatesData = await templatesRes.json();
          setTemplates(templatesData.templates || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  const runSimulation = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetVariance,
          scheduleDelay,
          resourceChange,
          riskFactor,
          projectId: selectedProject !== 'all' ? selectedProject : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to run simulation');
      }
    } catch (error) {
      console.error('Error running simulation:', error);
      alert('Failed to run simulation');
    } finally {
      setRunning(false);
    }
  };

  const applyTemplate = (template: Template) => {
    setBudgetVariance(template.params.budgetVariance);
    setScheduleDelay(template.params.scheduleDelay);
    setResourceChange(template.params.resourceChange);
    setRiskFactor(template.params.riskFactor);
  };

  const resetParameters = () => {
    setBudgetVariance(0);
    setScheduleDelay(0);
    setResourceChange(0);
    setRiskFactor('medium');
    setResult(null);
  };

  const saveScenario = () => {
    if (result) {
      setSavedScenarios([...savedScenarios, result]);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-muted-foreground">Loading scenarios...</p>
        </div>
      </div>
    );
  }

  const userRole = (session?.user as any)?.role;
  if (!['SuperAdmin', 'Admin', 'ProjectManager'].includes(userRole)) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Access Restricted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">You need Admin or Project Manager access to run scenarios.</p>
            <Button className="mt-4" onClick={() => router.push('/dashboard')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-2">
        <BackButton fallbackUrl="/dashboard" />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-blue-600" />
            Scenario Planner
          </h1>
          <p className="text-muted-foreground mt-1">
            Run live what-if scenarios on your projects to forecast outcomes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={resetParameters}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          {result && (
            <Button variant="outline" onClick={saveScenario}>
              <Save className="h-4 w-4 mr-2" />
              Save Scenario
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="run" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="run">Run Scenario</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="saved" className="relative">
            Saved
            {savedScenarios.length > 0 && (
              <span className="ml-1 bg-blue-600 text-white text-xs px-1.5 rounded-full">
                {savedScenarios.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Run Scenario Tab */}
        <TabsContent value="run" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Configuration Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Scenario Configuration
                </CardTitle>
                <CardDescription>
                  Select a project and adjust parameters to model different outcomes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Project Selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Target Project
                  </Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Projects (Portfolio)</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          <div className="flex items-center gap-2">
                            <span>{project.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {project.status}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedProject !== 'all' && (
                    <p className="text-xs text-muted-foreground">
                      Budget: {formatCurrency(projects.find(p => p.id === selectedProject)?.budget || 0)}
                    </p>
                  )}
                </div>

                {/* Budget Variance */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Budget Variance
                    </Label>
                    <Badge variant={budgetVariance > 0 ? 'destructive' : budgetVariance < 0 ? 'default' : 'secondary'}>
                      {budgetVariance >= 0 ? '+' : ''}{budgetVariance}%
                    </Badge>
                  </div>
                  <Slider
                    value={[budgetVariance]}
                    onValueChange={([val]) => setBudgetVariance(val)}
                    min={-30}
                    max={50}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Under budget (-30%)</span>
                    <span>Over budget (+50%)</span>
                  </div>
                </div>

                {/* Schedule Delay */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Schedule Adjustment
                    </Label>
                    <Badge variant={scheduleDelay > 0 ? 'destructive' : scheduleDelay < 0 ? 'default' : 'secondary'}>
                      {scheduleDelay >= 0 ? '+' : ''}{scheduleDelay} months
                    </Badge>
                  </div>
                  <Slider
                    value={[scheduleDelay]}
                    onValueChange={([val]) => setScheduleDelay(val)}
                    min={-6}
                    max={12}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Ahead (-6 mo)</span>
                    <span>Delayed (+12 mo)</span>
                  </div>
                </div>

                {/* Resource Change */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Resource Availability
                    </Label>
                    <Badge variant={resourceChange < -10 ? 'destructive' : resourceChange > 10 ? 'default' : 'secondary'}>
                      {resourceChange >= 0 ? '+' : ''}{resourceChange}%
                    </Badge>
                  </div>
                  <Slider
                    value={[resourceChange]}
                    onValueChange={([val]) => setResourceChange(val)}
                    min={-50}
                    max={30}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Constrained (-50%)</span>
                    <span>Increased (+30%)</span>
                  </div>
                </div>

                {/* Risk Factor */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Risk Level
                  </Label>
                  <Select value={riskFactor} onValueChange={setRiskFactor}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          Low Risk
                        </span>
                      </SelectItem>
                      <SelectItem value="medium">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-500" />
                          Medium Risk
                        </span>
                      </SelectItem>
                      <SelectItem value="high">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-500" />
                          High Risk
                        </span>
                      </SelectItem>
                      <SelectItem value="critical">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          Critical Risk
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Run Button */}
                <Button
                  className="w-full bg-gradient-to-r from-slate-800 to-blue-600 hover:from-slate-700 hover:to-blue-500"
                  size="lg"
                  onClick={runSimulation}
                  disabled={running}
                >
                  {running ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Running Simulation...
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Run Scenario
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results Panel */}
            <div className="space-y-6">
              {result ? (
                <>
                  {/* Projections Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Projected Outcomes
                      </CardTitle>
                      <CardDescription>
                        Simulated at {new Date(result.simulatedAt).toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Budget Projection */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Projected Budget</span>
                          <div className="flex items-center gap-2">
                            {result.projections.budgetChange > 0 ? (
                              <TrendingUp className="h-4 w-4 text-red-500" />
                            ) : result.projections.budgetChange < 0 ? (
                              <TrendingDown className="h-4 w-4 text-green-500" />
                            ) : null}
                            <span className={`text-sm ${result.projections.budgetChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {result.projections.budgetChange >= 0 ? '+' : ''}
                              {formatCurrency(result.projections.budgetChange)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">
                            {formatCurrency(result.projections.budget)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            from {formatCurrency(result.baseData.budget)}
                          </span>
                        </div>
                        <Progress
                          value={Math.min(100, Math.max(0, 50 + result.projections.budgetChangePercent))}
                          className="h-2"
                        />
                      </div>

                      {/* Timeline Projection */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Projected Timeline</span>
                          <Badge variant={result.projections.timelineChange > 0 ? 'destructive' : 'default'}>
                            {result.projections.timelineChange >= 0 ? '+' : ''}
                            {result.projections.timelineChange} months
                          </Badge>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold">
                            {result.projections.timeline} months
                          </span>
                          <span className="text-sm text-muted-foreground">
                            from {result.baseData.duration} months base
                          </span>
                        </div>
                      </div>

                      {/* Risk Score */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Risk Score</span>
                          <Badge className={getRiskColor(result.riskAssessment.level)}>
                            {result.riskAssessment.level.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <Progress
                              value={result.riskAssessment.score}
                              className={`h-3 ${getRiskScoreColor(result.riskAssessment.score)}`}
                            />
                          </div>
                          <span className="text-2xl font-bold">
                            {result.riskAssessment.score}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recommendations Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        AI Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {result.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="h-full flex items-center justify-center min-h-[400px] border-dashed">
                  <CardContent className="text-center">
                    <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-medium">No Scenario Results</h3>
                    <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                      Configure your parameters and click "Run Scenario" to see projected outcomes
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id} className="hover:border-blue-300 transition-colors cursor-pointer" onClick={() => applyTemplate(template)}>
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>Budget: {template.params.budgetVariance >= 0 ? '+' : ''}{template.params.budgetVariance}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Schedule: {template.params.scheduleDelay >= 0 ? '+' : ''}{template.params.scheduleDelay} mo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>Resources: {template.params.resourceChange >= 0 ? '+' : ''}{template.params.resourceChange}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">Risk: {template.params.riskFactor}</span>
                    </div>
                  </div>
                  <Button className="w-full mt-4" variant="outline">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Apply Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Saved Scenarios Tab */}
        <TabsContent value="saved" className="space-y-6">
          {savedScenarios.length > 0 ? (
            <div className="space-y-4">
              {savedScenarios.map((scenario, idx) => (
                <Card key={idx}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{scenario.scenario}</CardTitle>
                      <Badge className={getRiskColor(scenario.riskAssessment.level)}>
                        Risk: {scenario.riskAssessment.score}
                      </Badge>
                    </div>
                    <CardDescription>
                      Simulated: {new Date(scenario.simulatedAt).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Projected Budget</p>
                        <p className="text-xl font-bold">{formatCurrency(scenario.projections.budget)}</p>
                        <p className={`text-sm ${scenario.projections.budgetChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {scenario.projections.budgetChange >= 0 ? '+' : ''}
                          {formatCurrency(scenario.projections.budgetChange)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Projected Timeline</p>
                        <p className="text-xl font-bold">{scenario.projections.timeline} months</p>
                        <p className={`text-sm ${scenario.projections.timelineChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {scenario.projections.timelineChange >= 0 ? '+' : ''}
                          {scenario.projections.timelineChange} months
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Key Recommendations</p>
                        <p className="text-sm">{scenario.recommendations[0]}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">No Saved Scenarios</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Run a scenario and click "Save" to store it for comparison
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
