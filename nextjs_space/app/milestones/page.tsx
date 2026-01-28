'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { BackButton } from '@/components/ui/back-button';
import { 
  Target, CheckCircle, Clock, AlertCircle, Play, Award, DollarSign,
  Calendar, FileCheck, Plus, RefreshCw, Camera, Link2, Milestone as MilestoneIcon
} from 'lucide-react';

interface Milestone {
  id: string;
  name: string;
  description?: string;
  milestoneType: string;
  status: string;
  scheduledDate: string;
  completedDate?: string;
  verifiedDate?: string;
  percentComplete: number;
  budgetedCost: number;
  actualCost?: number;
  drawEligible: boolean;
  evidenceLinks: string[];
  verificationMethod?: string;
  project: { id: string; name: string };
  verifiedBy?: { firstName: string; lastName: string };
}

interface Project {
  id: string;
  name: string;
  budget: number;
}

const MILESTONE_TYPES = [
  { value: 'SitePrep', label: 'Site Preparation' },
  { value: 'FoundationComplete', label: 'Foundation Complete' },
  { value: 'FramingComplete', label: 'Framing Complete' },
  { value: 'RoughIns', label: 'Rough-Ins (MEP)' },
  { value: 'DrywallComplete', label: 'Drywall Complete' },
  { value: 'FinishesStart', label: 'Finishes Start' },
  { value: 'FinishesComplete', label: 'Finishes Complete' },
  { value: 'FinalInspection', label: 'Final Inspection' },
  { value: 'CertificateOfOccupancy', label: 'Certificate of Occupancy' },
  { value: 'Closeout', label: 'Project Closeout' },
];

export default function MilestonesPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [evidenceLinks, setEvidenceLinks] = useState<string>('');
  const [verificationMethod, setVerificationMethod] = useState<string>('');
  const [actualCost, setActualCost] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      fetchProjects();
      fetchMilestones();
    }
  }, [status, router]);

  useEffect(() => {
    fetchMilestones();
  }, [selectedProject, statusFilter]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects?limit=100');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchMilestones = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedProject !== 'all') params.append('projectId', selectedProject);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/milestones?${params.toString()}`);
      const data = await res.json();
      setMilestones(data.milestones || []);
    } catch (error) {
      console.error('Error fetching milestones:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCompleteDialog = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
    setActualCost(milestone.budgetedCost?.toString() || '');
    setEvidenceLinks('');
    setShowCompleteDialog(true);
  };

  const openVerifyDialog = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
    setVerificationMethod('');
    setEvidenceLinks(milestone.evidenceLinks?.join('\n') || '');
    setShowVerifyDialog(true);
  };

  const handleComplete = async () => {
    if (!selectedMilestone) return;
    setActionLoading(true);

    try {
      const links = evidenceLinks.split('\n').filter(l => l.trim());
      const res = await fetch('/api/milestones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneId: selectedMilestone.id,
          action: 'complete',
          actualCost: parseFloat(actualCost) || selectedMilestone.budgetedCost,
          evidenceLinks: links,
        }),
      });

      if (res.ok) {
        setShowCompleteDialog(false);
        fetchMilestones();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to complete milestone');
      }
    } catch (error) {
      console.error('Error completing milestone:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedMilestone) return;
    setActionLoading(true);

    try {
      const links = evidenceLinks.split('\n').filter(l => l.trim());
      const res = await fetch('/api/milestones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          milestoneId: selectedMilestone.id,
          action: 'verify',
          verificationMethod,
          evidenceLinks: links,
        }),
      });

      if (res.ok) {
        setShowVerifyDialog(false);
        fetchMilestones();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to verify milestone');
      }
    } catch (error) {
      console.error('Error verifying milestone:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string, drawEligible: boolean) => {
    if (drawEligible) {
      return <Badge className="bg-green-100 text-green-800"><DollarSign className="h-3 w-3 mr-1" />Draw Eligible</Badge>;
    }
    const badges: Record<string, React.ReactNode> = {
      'Scheduled': <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Scheduled</Badge>,
      'InProgress': <Badge className="bg-blue-100 text-blue-800"><Play className="h-3 w-3 mr-1" />In Progress</Badge>,
      'Completed': <Badge className="bg-yellow-100 text-yellow-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>,
      'Verified': <Badge className="bg-green-100 text-green-800"><Award className="h-3 w-3 mr-1" />Verified</Badge>,
    };
    return badges[status] || <Badge variant="outline">{status}</Badge>;
  };

  const getMilestoneTypeLabel = (type: string) => {
    return MILESTONE_TYPES.find(t => t.value === type)?.label || type;
  };

  const stats = {
    total: milestones.length,
    completed: milestones.filter(m => m.status === 'Completed' || m.status === 'Verified').length,
    verified: milestones.filter(m => m.status === 'Verified').length,
    drawEligible: milestones.filter(m => m.drawEligible).length,
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Target className="h-8 w-8 text-primary flex-shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Project Milestones</h1>
            <p className="text-sm text-muted-foreground">Track progress and trigger draw eligibility</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchMilestones} className="self-start sm:self-auto">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Milestones</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <MilestoneIcon className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <Progress value={(stats.completed / stats.total) * 100} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold">{stats.verified}</p>
              </div>
              <Award className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Draw Eligible</p>
                <p className="text-2xl font-bold text-green-600">{stats.drawEligible}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-full sm:w-[220px]">
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
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Scheduled">Scheduled</SelectItem>
            <SelectItem value="InProgress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Verified">Verified</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Milestones Grid */}
      {milestones.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No milestones found</p>
            <p className="text-muted-foreground">Milestones are created when projects are set up</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {milestones.map(milestone => (
            <Card key={milestone.id} className={milestone.drawEligible ? 'border-green-300 bg-green-50/30' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{milestone.name}</CardTitle>
                    <CardDescription>{getMilestoneTypeLabel(milestone.milestoneType)}</CardDescription>
                  </div>
                  {getStatusBadge(milestone.status, milestone.drawEligible)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  {milestone.project?.name}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{milestone.percentComplete}%</span>
                </div>
                <Progress value={milestone.percentComplete} />

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Scheduled</span>
                    <p className="font-medium">{formatDate(milestone.scheduledDate)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Completed</span>
                    <p className="font-medium">{formatDate(milestone.completedDate)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Budgeted</span>
                    <p className="font-medium">{formatCurrency(milestone.budgetedCost || 0)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Actual</span>
                    <p className="font-medium">{milestone.actualCost ? formatCurrency(milestone.actualCost) : '-'}</p>
                  </div>
                </div>

                {milestone.verifiedBy && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Verified by: </span>
                    <span className="font-medium">
                      {milestone.verifiedBy.firstName} {milestone.verifiedBy.lastName}
                    </span>
                  </div>
                )}

                {milestone.evidenceLinks?.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Link2 className="h-3 w-3" />
                    {milestone.evidenceLinks.length} evidence link(s)
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {milestone.status === 'Scheduled' || milestone.status === 'InProgress' ? (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => openCompleteDialog(milestone)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" /> Complete
                    </Button>
                  ) : milestone.status === 'Completed' && !milestone.verifiedDate ? (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => openVerifyDialog(milestone)}
                    >
                      <FileCheck className="h-4 w-4 mr-1" /> Verify
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="flex-1" disabled>
                      <Award className="h-4 w-4 mr-1" /> Verified
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Complete Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Milestone</DialogTitle>
            <DialogDescription>
              Mark "{selectedMilestone?.name}" as completed. This will emit a MilestoneCompleted event.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Actual Cost</label>
              <Input
                type="number"
                value={actualCost}
                onChange={e => setActualCost(e.target.value)}
                placeholder="Enter actual cost"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Evidence Links (one per line)</label>
              <Textarea
                value={evidenceLinks}
                onChange={e => setEvidenceLinks(e.target.value)}
                placeholder="https://i.ytimg.com/vi/KhXRCpds2YA/sddefault.jpg?sqp=-oaymwEmCIAFEOAD8quKqQMa8AEB-AHUBoAC3gOKAgwIABABGGUgZShlMA8=&rs=AOn4CLDSkfgWJN4N3DciV20FB691paYjGA"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>Cancel</Button>
            <Button onClick={handleComplete} disabled={actionLoading}>
              {actionLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Complete Milestone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Milestone</DialogTitle>
            <DialogDescription>
              Verify "{selectedMilestone?.name}" to enable draw eligibility. This will emit an InspectionCompleted event.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Verification Method</label>
              <Select value={verificationMethod} onValueChange={setVerificationMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SITE_INSPECTION">Site Inspection</SelectItem>
                  <SelectItem value="PHOTO_VERIFICATION">Photo Verification</SelectItem>
                  <SelectItem value="THIRD_PARTY_INSPECTION">Third-Party Inspection</SelectItem>
                  <SelectItem value="ENGINEER_CERTIFICATION">Engineer Certification</SelectItem>
                  <SelectItem value="PERMIT_APPROVAL">Permit Approval</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Evidence Links (one per line)</label>
              <Textarea
                value={evidenceLinks}
                onChange={e => setEvidenceLinks(e.target.value)}
                placeholder="https://storage.example.com/inspection-report.pdf"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerifyDialog(false)}>Cancel</Button>
            <Button onClick={handleVerify} disabled={actionLoading || !verificationMethod}>
              {actionLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Verify & Enable Draw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
