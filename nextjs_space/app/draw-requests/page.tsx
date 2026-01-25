'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BackButton } from '@/components/ui/back-button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, Plus, Send, CheckCircle, Clock, AlertCircle, DollarSign, Download, 
  ShieldCheck, XCircle, Zap, Activity, Users, BookOpen, ArrowRight, RefreshCw
} from 'lucide-react';

interface DrawRequest {
  id: string;
  drawNumber: number;
  requestNumber: string;
  status: string;
  requestedAmount: number;
  approvedAmount?: number;
  fundedAmount?: number;
  retainage: number;
  retainagePercent: number;
  percentComplete: number;
  requestDate: string;
  submittedDate?: string;
  approvedDate?: string;
  fundedDate?: string;
  project: { id: string; name: string; projectNumber: string };
  submittedBy?: { firstName: string; lastName: string };
  approvedBy?: { firstName: string; lastName: string };
  approvalWorkflow?: {
    approvalStatus: string;
    evidenceComplete: boolean;
    policyValidated: boolean;
    riskScore?: number;
    conditions: string[];
  };
  _count: { items: number; documents: number; complianceChecks: number };
}

interface WorkflowEvent {
  id: string;
  eventType: string;
  occurredAt: string;
  data: Record<string, unknown>;
  processed: boolean;
}

interface Project {
  id: string;
  name: string;
  budget: number;
}

// Policy thresholds
const APPROVAL_THRESHOLDS = {
  AUTO_APPROVE_MAX: 25000,
  HITL_REQUIRED_MIN: 25001,
  COMMITTEE_REQUIRED_MIN: 250001,
};

export default function DrawRequestsPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [drawRequests, setDrawRequests] = useState<DrawRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDraw, setSelectedDraw] = useState<DrawRequest | null>(null);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [workflowEvents, setWorkflowEvents] = useState<WorkflowEvent[]>([]);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [actionNotes, setActionNotes] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      fetchProjects();
      fetchDrawRequests();
    }
  }, [status, router]);

  useEffect(() => {
    fetchDrawRequests();
  }, [selectedProject, statusFilter]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchDrawRequests = async () => {
    try {
      let url = '/api/draw-requests';
      const params = new URLSearchParams();
      if (selectedProject && selectedProject !== 'all') params.append('projectId', selectedProject);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();
      setDrawRequests(data.drawRequests || []);
    } catch (error) {
      console.error('Error fetching draw requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const openWorkflowDialog = async (draw: DrawRequest) => {
    setSelectedDraw(draw);
    setShowWorkflowDialog(true);
    setWorkflowLoading(true);
    
    try {
      const res = await fetch(`/api/draw-requests/${draw.id}/workflow`);
      const data = await res.json();
      setWorkflowEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching workflow:', error);
    } finally {
      setWorkflowLoading(false);
    }
  };

  const initiateWorkflow = async () => {
    if (!selectedDraw) return;
    setWorkflowLoading(true);
    
    try {
      const res = await fetch(`/api/draw-requests/${selectedDraw.id}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initiate' }),
      });
      const data = await res.json();
      alert(data.message || 'Workflow initiated');
      fetchDrawRequests();
      openWorkflowDialog(selectedDraw);
    } catch (error) {
      console.error('Error initiating workflow:', error);
    } finally {
      setWorkflowLoading(false);
    }
  };

  const handleWorkflowAction = async (action: 'approve' | 'deny') => {
    if (!selectedDraw) return;
    setWorkflowLoading(true);
    
    try {
      const res = await fetch(`/api/draw-requests/${selectedDraw.id}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, decisionNotes: actionNotes }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || 'Action failed');
        return;
      }
      
      alert(data.message || `Draw ${action}d successfully`);
      setShowWorkflowDialog(false);
      setActionNotes('');
      fetchDrawRequests();
    } catch (error) {
      console.error('Error processing action:', error);
    } finally {
      setWorkflowLoading(false);
    }
  };

  const getApprovalBadge = (amount: number) => {
    if (amount <= APPROVAL_THRESHOLDS.AUTO_APPROVE_MAX) {
      return <Badge className="bg-green-100 text-green-800"><Zap className="h-3 w-3 mr-1" />Auto-Approve</Badge>;
    }
    if (amount >= APPROVAL_THRESHOLDS.COMMITTEE_REQUIRED_MIN) {
      return <Badge className="bg-red-100 text-red-800"><Users className="h-3 w-3 mr-1" />Committee Required</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800"><ShieldCheck className="h-3 w-3 mr-1" />HITL Required</Badge>;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'DRAFT': 'bg-gray-100 text-gray-800',
      'SUBMITTED': 'bg-blue-100 text-blue-800',
      'UNDER_REVIEW': 'bg-yellow-100 text-yellow-800',
      'APPROVED': 'bg-green-100 text-green-800',
      'REJECTED': 'bg-red-100 text-red-800',
      'FUNDED': 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      'DRAFT': <FileText className="h-4 w-4" />,
      'SUBMITTED': <Send className="h-4 w-4" />,
      'UNDER_REVIEW': <Clock className="h-4 w-4" />,
      'APPROVED': <CheckCircle className="h-4 w-4" />,
      'FUNDED': <DollarSign className="h-4 w-4" />
    };
    return icons[status] || <AlertCircle className="h-4 w-4" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const stats = {
    total: drawRequests.length,
    totalAmount: drawRequests.reduce((sum, dr) => sum + (dr.requestedAmount || 0), 0),
    pending: drawRequests.filter(dr => dr.status === 'Submitted' || dr.status === 'UnderReview').length,
    approved: drawRequests.filter(dr => dr.status === 'Approved' || dr.status === 'Funded').length
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
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Draw Request Automation</h1>
            <p className="text-muted-foreground">Automated lender package generation and compliance tracking</p>
          </div>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Draw Request</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Draw Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">Project</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Draw Number</label>
                  <Input type="number" placeholder="1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Period End</label>
                  <Input type="date" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea placeholder="Draw request description..." rows={3} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
                <Button onClick={() => setShowNewDialog(false)}>Create Draft</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Draws</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved/Funded</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="FUNDED">Funded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Draw Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Quantum Ledger Integration
          </CardTitle>
          <CardDescription>
            Draw requests with automated policy enforcement and audit trails
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Draw #</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Policy</TableHead>
                <TableHead className="text-right">Requested</TableHead>
                <TableHead className="text-right">Approved</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drawRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No draw requests found</p>
                    <p className="text-muted-foreground">Create a new draw request to get started</p>
                  </TableCell>
                </TableRow>
              ) : (
                drawRequests.map(dr => (
                  <TableRow key={dr.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openWorkflowDialog(dr)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(dr.status)}
                        <span className="font-medium">Draw #{dr.drawNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{dr.project?.name}</p>
                        <p className="text-xs text-muted-foreground">{dr.requestNumber}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(dr.status)}>{dr.status?.replace('_', ' ') || 'Draft'}</Badge>
                    </TableCell>
                    <TableCell>{getApprovalBadge(dr.requestedAmount || 0)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(dr.requestedAmount || 0)}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {dr.approvedAmount ? formatCurrency(dr.approvedAmount) : '-'}
                    </TableCell>
                    <TableCell>
                      {dr.approvalWorkflow ? (
                        <div className="flex items-center gap-1">
                          {dr.approvalWorkflow.evidenceComplete ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="text-xs">{dr.approvalWorkflow.approvalStatus}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not started</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openWorkflowDialog(dr); }}>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Workflow Dialog */}
      <Dialog open={showWorkflowDialog} onOpenChange={setShowWorkflowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Draw Workflow - {selectedDraw?.requestNumber}
            </DialogTitle>
            <DialogDescription>
              Capital draw approval workflow with Quantum Ledger integration
            </DialogDescription>
          </DialogHeader>

          {selectedDraw && (
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="events">Event Timeline</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Amount and Policy */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Request Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Requested Amount</p>
                        <p className="text-xl font-bold">{formatCurrency(selectedDraw.requestedAmount || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Policy Classification</p>
                        <div className="mt-1">{getApprovalBadge(selectedDraw.requestedAmount || 0)}</div>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Approval Thresholds</p>
                      <div className="flex gap-2 flex-wrap text-xs">
                        <span className="px-2 py-1 bg-green-50 rounded">Auto: ≤${APPROVAL_THRESHOLDS.AUTO_APPROVE_MAX.toLocaleString()}</span>
                        <span className="px-2 py-1 bg-yellow-50 rounded">HITL: ${APPROVAL_THRESHOLDS.HITL_REQUIRED_MIN.toLocaleString()}+</span>
                        <span className="px-2 py-1 bg-red-50 rounded">Committee: ${APPROVAL_THRESHOLDS.COMMITTEE_REQUIRED_MIN.toLocaleString()}+</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Workflow Status */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Workflow Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedDraw.approvalWorkflow ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span>Approval Status</span>
                          <Badge>{selectedDraw.approvalWorkflow.approvalStatus}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Evidence Complete</span>
                          {selectedDraw.approvalWorkflow.evidenceComplete ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Policy Validated</span>
                          {selectedDraw.approvalWorkflow.policyValidated ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                        {selectedDraw.approvalWorkflow.conditions.length > 0 && (
                          <div>
                            <span className="text-sm text-muted-foreground">Conditions:</span>
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {selectedDraw.approvalWorkflow.conditions.map((c, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Workflow not initiated</p>
                        <Button className="mt-3" onClick={initiateWorkflow} disabled={workflowLoading}>
                          {workflowLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                          Initiate Workflow
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="events" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Event Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {workflowLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin" />
                      </div>
                    ) : workflowEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No events recorded yet</p>
                    ) : (
                      <div className="space-y-3">
                        {workflowEvents.map((event) => (
                          <div key={event.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                            <div className={`w-2 h-2 rounded-full mt-2 ${event.processed ? 'bg-green-500' : 'bg-yellow-500'}`} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">{event.eventType}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(event.occurredAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {JSON.stringify(event.data).slice(0, 100)}...
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Approval Actions</CardTitle>
                    <CardDescription>
                      Separation of duties: Cannot approve your own requests
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Decision Notes</label>
                      <Textarea
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        placeholder="Enter notes for the decision..."
                        rows={3}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleWorkflowAction('approve')}
                        disabled={workflowLoading || !selectedDraw.approvalWorkflow}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve Draw
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleWorkflowAction('deny')}
                        disabled={workflowLoading || !selectedDraw.approvalWorkflow}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Deny Draw
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
