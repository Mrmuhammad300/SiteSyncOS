'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard-nav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Bot,
  Brain,
  Shield,
  Eye,
  Zap,
  Network,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  Play,
  Pause,
  RefreshCw,
  ChevronRight,
  Users,
  FileText,
  TrendingUp,
  Lock,
  Sparkles,
  Target,
  Layers,
  GitBranch,
} from 'lucide-react';

// Agent type icons mapping
const AGENT_TYPE_ICONS: Record<string, typeof Bot> = {
  InterfaceAgent: Users,
  ReasoningAgent: Brain,
  GovernanceAgent: Shield,
  PolicyAgent: Lock,
  RiskAgent: AlertTriangle,
  AuditAgent: Eye,
  CoordinationAgent: Network,
  QualityControlAgent: CheckCircle,
  SimulationAgent: TrendingUp,
  ExecutionAgent: Zap,
  ConsensusAgent: Users,
  KnowledgeAgent: FileText,
  LearningAgent: Sparkles,
  VerificationAgent: Target,
  CreativeAgent: Sparkles,
  CommunicationAgent: FileText,
};

const AUTONOMY_LEVELS = {
  AdvisoryOnly: { label: 'Advisory Only', color: 'bg-gray-500', level: 0 },
  DraftWithApproval: { label: 'Draft + Approval', color: 'bg-blue-500', level: 1 },
  AutoExecuteThreshold: { label: 'Auto Execute', color: 'bg-amber-500', level: 2 },
  ContinuousOptimization: { label: 'Continuous', color: 'bg-green-500', level: 3 },
};

interface Agent {
  id: string;
  agentId: string;
  name: string;
  type: string;
  description: string;
  autonomyLevel: keyof typeof AUTONOMY_LEVELS;
  isActive: boolean;
  configuration: Record<string, unknown>;
  _count: { executions: number; decisions: number };
}

interface Execution {
  id: string;
  executionId: string;
  eventType: string;
  status: string;
  confidenceScore: number | null;
  startedAt: string;
  completedAt: string | null;
  reasoning: string | null;
  agent: { name: string; agentId: string };
  project: { id: string; name: string } | null;
}

interface Metrics {
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  pendingApprovals: number;
  successRate: string;
  avgConfidence: string;
}

export default function AIAssistantPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [feedback, setFeedback] = useState('');
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/login');
      return;
    }
    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [agentsRes, executionsRes, metricsRes] = await Promise.all([
        fetch('/api/agents?type=agents'),
        fetch('/api/agents?type=executions&limit=20'),
        fetch('/api/agents?type=metrics'),
      ]);

      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgents(data.agents || []);
      }
      if (executionsRes.ok) {
        const data = await executionsRes.json();
        setExecutions(data.executions || []);
      }
      if (metricsRes.ok) {
        const data = await metricsRes.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeSystem = async () => {
    setInitializing(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize' }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error initializing:', error);
    } finally {
      setInitializing(false);
    }
  };

  const toggleAgent = async (agentId: string, isActive: boolean) => {
    try {
      const res = await fetch('/api/agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_agent', agentId, isActive }),
      });
      if (res.ok) {
        setAgents(prev =>
          prev.map(a => (a.agentId === agentId ? { ...a, isActive } : a))
        );
      }
    } catch (error) {
      console.error('Error toggling agent:', error);
    }
  };

  const approveExecution = async (executionId: string, approved: boolean) => {
    try {
      const res = await fetch('/api/agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_execution',
          executionId,
          approved,
          feedback,
        }),
      });
      if (res.ok) {
        setSelectedExecution(null);
        setFeedback('');
        await fetchData();
      }
    } catch (error) {
      console.error('Error approving execution:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Pending: 'bg-gray-100 text-gray-800',
      Running: 'bg-blue-100 text-blue-800',
      AwaitingApproval: 'bg-amber-100 text-amber-800',
      Approved: 'bg-green-100 text-green-800',
      Rejected: 'bg-red-100 text-red-800',
      Completed: 'bg-green-100 text-green-800',
      Failed: 'bg-red-100 text-red-800',
      Escalated: 'bg-purple-100 text-purple-800',
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Brain className="w-8 h-8 text-blue-600" />
              AI Agent Orchestrator
            </h1>
            <p className="text-gray-600 mt-1">
              Multi-agent system with autonomous decision-making and human oversight
            </p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={initializeSystem} disabled={initializing}>
              {initializing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Initialize System
            </Button>
          </div>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Agents</p>
                  <p className="text-2xl font-bold">
                    {agents.filter(a => a.isActive).length}/{agents.length}
                  </p>
                </div>
                <Bot className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Executions</p>
                  <p className="text-2xl font-bold">{metrics?.totalExecutions || 0}</p>
                </div>
                <Activity className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{metrics?.successRate || 'N/A'}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Approvals</p>
                  <p className="text-2xl font-bold">{metrics?.pendingApprovals || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="agents" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Agents
            </TabsTrigger>
            <TabsTrigger value="executions" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Executions
            </TabsTrigger>
            <TabsTrigger value="approvals" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Approvals
            </TabsTrigger>
            <TabsTrigger value="graph" className="flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Dependency Graph
            </TabsTrigger>
          </TabsList>

          {/* Agents Tab */}
          <TabsContent value="agents">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map(agent => {
                const Icon = AGENT_TYPE_ICONS[agent.type] || Bot;
                const autonomy = AUTONOMY_LEVELS[agent.autonomyLevel];
                return (
                  <Card key={agent.id} className={!agent.isActive ? 'opacity-60' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${agent.isActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
                            <Icon className={`w-5 h-5 ${agent.isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                          </div>
                          <div>
                            <CardTitle className="text-base">{agent.name}</CardTitle>
                            <Badge variant="outline" className="text-xs mt-1">
                              {agent.type.replace('Agent', '')}
                            </Badge>
                          </div>
                        </div>
                        <Switch
                          checked={agent.isActive}
                          onCheckedChange={(checked) => toggleAgent(agent.agentId, checked)}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {agent.description}
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Autonomy</span>
                          <Badge className={`${autonomy.color} text-white`}>
                            Level {autonomy.level}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Executions</span>
                          <span className="font-medium">{agent._count.executions}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Decisions</span>
                          <span className="font-medium">{agent._count.decisions}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-4"
                        onClick={() => setSelectedAgent(agent)}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Configure
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Executions Tab */}
          <TabsContent value="executions">
            <Card>
              <CardHeader>
                <CardTitle>Recent Executions</CardTitle>
                <CardDescription>Agent execution history across all pipelines</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {executions.map(exec => (
                      <div
                        key={exec.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedExecution(exec)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Bot className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{exec.agent.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {exec.eventType.replace(/([A-Z])/g, ' $1').trim()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {exec.project && (
                            <Badge variant="outline">{exec.project.name}</Badge>
                          )}
                          {exec.confidenceScore && (
                            <span className="text-sm text-muted-foreground">
                              {(exec.confidenceScore * 100).toFixed(0)}% conf.
                            </span>
                          )}
                          {getStatusBadge(exec.status)}
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    ))}
                    {executions.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No executions yet</p>
                        <p className="text-sm">Agent executions will appear here</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals">
            <Card>
              <CardHeader>
                <CardTitle>Pending Approvals</CardTitle>
                <CardDescription>Agent outputs requiring human oversight</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {executions
                      .filter(e => e.status === 'AwaitingApproval')
                      .map(exec => (
                        <div
                          key={exec.id}
                          className="p-4 border rounded-lg border-amber-200 bg-amber-50"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <AlertTriangle className="w-5 h-5 text-amber-600" />
                              <div>
                                <p className="font-medium">{exec.agent.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {exec.eventType.replace(/([A-Z])/g, ' $1').trim()}
                                </p>
                              </div>
                            </div>
                            {exec.confidenceScore && (
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Confidence</p>
                                <Progress
                                  value={exec.confidenceScore * 100}
                                  className="w-24 h-2"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  {(exec.confidenceScore * 100).toFixed(0)}%
                                </p>
                              </div>
                            )}
                          </div>
                          {exec.reasoning && (
                            <p className="text-sm text-gray-600 mb-3 p-2 bg-white rounded">
                              {exec.reasoning}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setSelectedExecution(exec);
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Review & Approve
                            </Button>
                          </div>
                        </div>
                      ))}
                    {executions.filter(e => e.status === 'AwaitingApproval').length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No pending approvals</p>
                        <p className="text-sm">All agent outputs have been processed</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dependency Graph Tab */}
          <TabsContent value="graph">
            <Card>
              <CardHeader>
                <CardTitle>Agent Dependency Graph</CardTitle>
                <CardDescription>Visualization of agent relationships and routing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Agent Types */}
                  <div>
                    <h3 className="font-semibold mb-4">Agent Types</h3>
                    <div className="space-y-2">
                      {Object.entries(AGENT_TYPE_ICONS).map(([type, Icon]) => {
                        const count = agents.filter(a => a.type === type).length;
                        if (count === 0) return null;
                        return (
                          <div key={type} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                            <Icon className="w-5 h-5 text-blue-600" />
                            <span className="flex-1">{type.replace('Agent', ' Agent')}</span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Autonomy Distribution */}
                  <div>
                    <h3 className="font-semibold mb-4">Autonomy Distribution</h3>
                    <div className="space-y-3">
                      {Object.entries(AUTONOMY_LEVELS).map(([key, value]) => {
                        const count = agents.filter(a => a.autonomyLevel === key).length;
                        const percentage = agents.length > 0 ? (count / agents.length) * 100 : 0;
                        return (
                          <div key={key}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm">{value.label}</span>
                              <span className="text-sm text-muted-foreground">{count} agents</span>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Routing Paths */}
                <div className="mt-8">
                  <h3 className="font-semibold mb-4">Key Routing Paths</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Decision Flow</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">Orchestrator</Badge>
                        <ChevronRight className="w-4 h-4" />
                        <Badge variant="outline">Decision Advisor</Badge>
                        <ChevronRight className="w-4 h-4" />
                        <Badge variant="outline">Risk Sentinel</Badge>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Escalation Path</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">Risk Sentinel</Badge>
                        <ChevronRight className="w-4 h-4" />
                        <Badge variant="outline">Ethics Council</Badge>
                        <ChevronRight className="w-4 h-4" />
                        <Badge variant="outline">Human Liaison</Badge>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Quality Control</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">Meta Reasoning</Badge>
                        <ChevronRight className="w-4 h-4" />
                        <Badge variant="outline">Truth Validator</Badge>
                        <ChevronRight className="w-4 h-4" />
                        <Badge variant="outline">Memory Curator</Badge>
                      </div>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Execution Path</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">Workflow Engine</Badge>
                        <ChevronRight className="w-4 h-4" />
                        <Badge variant="outline">AI Overseer</Badge>
                        <ChevronRight className="w-4 h-4" />
                        <Badge variant="outline">Transparency</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Agent Configuration Dialog */}
        <Dialog open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {selectedAgent && (
                  <>
                    {(() => {
                      const Icon = AGENT_TYPE_ICONS[selectedAgent.type] || Bot;
                      return <Icon className="w-6 h-6 text-blue-600" />;
                    })()}
                    {selectedAgent.name}
                  </>
                )}
              </DialogTitle>
              <DialogDescription>{selectedAgent?.description}</DialogDescription>
            </DialogHeader>
            {selectedAgent && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <p className="text-sm mt-1">{selectedAgent.type}</p>
                  </div>
                  <div>
                    <Label>Autonomy Level</Label>
                    <p className="text-sm mt-1">
                      {AUTONOMY_LEVELS[selectedAgent.autonomyLevel].label}
                    </p>
                  </div>
                </div>
                <div>
                  <Label>Configuration</Label>
                  <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs overflow-auto max-h-48">
                    {JSON.stringify(selectedAgent.configuration, null, 2)}
                  </pre>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch
                    checked={selectedAgent.isActive}
                    onCheckedChange={(checked) => {
                      toggleAgent(selectedAgent.agentId, checked);
                      setSelectedAgent({ ...selectedAgent, isActive: checked });
                    }}
                  />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Execution Approval Dialog */}
        <Dialog
          open={!!selectedExecution && selectedExecution.status === 'AwaitingApproval'}
          onOpenChange={() => {
            setSelectedExecution(null);
            setFeedback('');
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Agent Output</DialogTitle>
              <DialogDescription>
                {selectedExecution?.agent.name} - {selectedExecution?.eventType}
              </DialogDescription>
            </DialogHeader>
            {selectedExecution && (
              <div className="space-y-4">
                <div>
                  <Label>Reasoning</Label>
                  <p className="mt-2 p-3 bg-gray-100 rounded-lg text-sm">
                    {selectedExecution.reasoning || 'No reasoning provided'}
                  </p>
                </div>
                {selectedExecution.confidenceScore && (
                  <div>
                    <Label>Confidence Score</Label>
                    <div className="mt-2">
                      <Progress value={selectedExecution.confidenceScore * 100} className="h-3" />
                      <p className="text-sm text-muted-foreground mt-1">
                        {(selectedExecution.confidenceScore * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                )}
                <div>
                  <Label>Feedback (optional)</Label>
                  <Textarea
                    className="mt-2"
                    placeholder="Provide feedback for the agent..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button
                variant="destructive"
                onClick={() => selectedExecution && approveExecution(selectedExecution.id, false)}
              >
                Reject
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => selectedExecution && approveExecution(selectedExecution.id, true)}
              >
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
