'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BackButton } from '@/components/ui/back-button';
import { toast } from 'sonner';
import {
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Download,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  Draft: 'bg-gray-500',
  Submitted: 'bg-blue-500',
  AIProcessing: 'bg-purple-500',
  UnderReview: 'bg-yellow-500',
  ClientReview: 'bg-orange-500',
  RevisionRequired: 'bg-red-500',
  Approved: 'bg-green-500',
  InDesign: 'bg-indigo-500',
  Rendering: 'bg-cyan-500',
  Completed: 'bg-emerald-500',
  Cancelled: 'bg-gray-400',
};

const taskStatusIcons: Record<string, any> = {
  Pending: Clock,
  Queued: Clock,
  Processing: Loader2,
  Completed: CheckCircle2,
  Failed: XCircle,
  Cancelled: XCircle,
};

export default function DesignRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [designRequest, setDesignRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTaskTypes, setSelectedTaskTypes] = useState<string[]>([]);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null);

  const availableTaskTypes = [
    { type: 'Architectural', label: 'Architectural Design', description: 'Complete architectural design drawings and plans' },
    { type: 'Structural', label: 'Structural Engineering', description: 'Structural analysis and engineering' },
    { type: 'MEPDesign', label: 'MEP Design', description: 'Mechanical, Electrical, and Plumbing design' },
    { type: 'InteriorDesign', label: 'Interior Design', description: 'Interior space planning and design' },
    { type: 'Landscaping', label: 'Landscape Design', description: 'Exterior and landscape architecture' },
    { type: 'Rendering', label: '3D Rendering', description: 'Photorealistic 3D visualization' },
    { type: 'ThreeD_Modeling', label: '3D Modeling', description: 'Detailed 3D models and BIM' },
    { type: 'Documentation', label: 'Construction Documentation', description: 'Complete construction document set' },
  ];

  useEffect(() => {
    fetchDesignRequest();
  }, [params.id]);

  const fetchDesignRequest = async () => {
    try {
      const response = await fetch(`/api/design-requests/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setDesignRequest(data);
      } else {
        toast.error('Failed to load design request');
      }
    } catch (error) {
      console.error('Error fetching design request:', error);
      toast.error('Failed to load design request');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTasks = async () => {
    if (selectedTaskTypes.length === 0) {
      toast.error('Please select at least one task type');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/design-requests/${params.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskTypes: selectedTaskTypes.map(type => ({ type })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit tasks');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success(`${result.tasksCreated} task(s) submitted to AI design platform`);
        setSelectedTaskTypes([]);
        fetchDesignRequest();
      } else if (result.errors && result.errors.length > 0) {
        toast.error(`${result.tasksFailed} task(s) failed to submit`);
        fetchDesignRequest();
      }
    } catch (error: any) {
      console.error('Error submitting tasks:', error);
      toast.error(error.message || 'Failed to submit tasks');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'RevisionRequired' && revisionNotes) {
        updateData.revisionNotes = revisionNotes;
      }

      const response = await fetch(`/api/design-requests/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      toast.success('Status updated successfully');
      fetchDesignRequest();
      setRevisionNotes('');
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleRetryAllFailed = async () => {
    setRetrying(true);
    try {
      const response = await fetch(`/api/design-requests/${params.id}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`${result.succeeded} task(s) retried successfully`);
        if (result.failed > 0) {
          toast.warning(`${result.failed} task(s) still failed after retry`);
        }
      } else {
        toast.error(result.error || 'Failed to retry tasks');
      }
      fetchDesignRequest();
    } catch (error: any) {
      toast.error(error.message || 'Failed to retry tasks');
    } finally {
      setRetrying(false);
    }
  };

  const handleRetrySingleTask = async (taskId: string) => {
    setRetryingTaskId(taskId);
    try {
      const response = await fetch(`/api/design-requests/${params.id}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds: [taskId] }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Task retried successfully');
      } else {
        toast.error(result.errors?.[0]?.error || result.error || 'Retry failed');
      }
      fetchDesignRequest();
    } catch (error: any) {
      toast.error(error.message || 'Failed to retry task');
    } finally {
      setRetryingTaskId(null);
    }
  };

  const failedTaskCount = designRequest?.tasks?.filter((t: any) => t.status === 'Failed').length || 0;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading design request...</p>
        </div>
      </div>
    );
  }

  if (!designRequest) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Design request not found</p>
            <Button onClick={() => router.push('/design-services')} className="mt-4">
              Back to Design Services
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <BackButton fallbackUrl="/design-services" />
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold">{designRequest.projectName}</h1>
            <p className="text-muted-foreground mt-1">
              Request #{designRequest.requestNumber}
            </p>
          </div>
          <Badge className={`${statusColors[designRequest.status]} text-white text-sm px-3 py-1`}>
            {designRequest.status}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({designRequest.tasks?.length || 0})</TabsTrigger>
          <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Project Type</p>
                  <p className="text-base">{designRequest.projectType}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Timeline</p>
                  <p className="text-base">{designRequest.timeline}</p>
                </div>
                {designRequest.budget && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Budget</p>
                    <p className="text-base">${designRequest.budget.toLocaleString()}</p>
                  </div>
                )}
                {designRequest.project && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Linked Project</p>
                    <p className="text-base">
                      {designRequest.project.name} ({designRequest.project.projectNumber})
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                <p className="text-base whitespace-pre-wrap">{designRequest.description}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Requirements</p>
                <p className="text-base whitespace-pre-wrap">{designRequest.requirements}</p>
              </div>

              {designRequest.siteDetails && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Site Details</p>
                  <p className="text-base whitespace-pre-wrap">{designRequest.siteDetails}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-base">{designRequest.clientName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-base">{designRequest.clientEmail}</p>
              </div>
              {designRequest.clientPhone && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p className="text-base">{designRequest.clientPhone}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-6">
          {/* Submit New Tasks */}
          {designRequest.status === 'Draft' || designRequest.status === 'Submitted' ? (
            <Card>
              <CardHeader>
                <CardTitle>Submit Design Tasks to AI Platform</CardTitle>
                <CardDescription>
                  Select the design services you need. Tasks will be sent to the AI design and rendering platform.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableTaskTypes.map((taskType) => (
                    <div key={taskType.type} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={taskType.type}
                        checked={selectedTaskTypes.includes(taskType.type)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTaskTypes([...selectedTaskTypes, taskType.type]);
                          } else {
                            setSelectedTaskTypes(selectedTaskTypes.filter(t => t !== taskType.type));
                          }
                        }}
                      />
                      <div className="flex-1">
                        <Label htmlFor={taskType.type} className="font-medium cursor-pointer">
                          {taskType.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">{taskType.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmitTasks}
                    disabled={submitting || selectedTaskTypes.length === 0}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Submit {selectedTaskTypes.length} Task(s) to AI Platform
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Existing Tasks */}
          {designRequest.tasks && designRequest.tasks.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Active Tasks</CardTitle>
                    <CardDescription>
                      Tasks currently being processed by the AI design platform
                    </CardDescription>
                  </div>
                  {failedTaskCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetryAllFailed}
                      disabled={retrying}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      {retrying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Retry All Failed ({failedTaskCount})
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {designRequest.tasks.map((task: any) => {
                    const StatusIcon = taskStatusIcons[task.status] || Clock;
                    return (
                      <div key={task.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{task.title}</h4>
                              <Badge variant="outline">{task.taskType}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                          </div>
                          <Badge className={`ml-4 ${task.status === 'Completed' ? 'bg-green-500' : task.status === 'Failed' ? 'bg-red-500' : 'bg-blue-500'}`}>
                            <StatusIcon className={`h-3 w-3 mr-1 ${task.status === 'Processing' ? 'animate-spin' : ''}`} />
                            {task.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-muted-foreground mt-3">
                          {task.externalTaskId && (
                            <div>
                              <span className="font-medium">External ID:</span> {task.externalTaskId}
                            </div>
                          )}
                          {task.createdAt && (
                            <div>
                              <span className="font-medium">Created:</span> {format(new Date(task.createdAt), 'PP')}
                            </div>
                          )}
                          {task.startedAt && (
                            <div>
                              <span className="font-medium">Started:</span> {format(new Date(task.startedAt), 'PP')}
                            </div>
                          )}
                          {task.completedAt && (
                            <div>
                              <span className="font-medium">Completed:</span> {format(new Date(task.completedAt), 'PP')}
                            </div>
                          )}
                        </div>

                        {task.resultUrl && (
                          <div className="mt-3">
                            <Button size="sm" variant="outline" asChild>
                              <a href={task.resultUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Result
                              </a>
                            </Button>
                          </div>
                        )}

                        {task.errorMessage && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 text-sm text-red-600 font-medium">
                                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                  <span>Task Failed</span>
                                  {task.retryCount > 0 && (
                                    <span className="text-red-400">
                                      (Retried {task.retryCount} time{task.retryCount > 1 ? 's' : ''})
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-red-500 mt-1 ml-6">{task.errorMessage}</p>
                              </div>
                              {task.status === 'Failed' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRetrySingleTask(task.id)}
                                  disabled={retryingTaskId === task.id}
                                  className="ml-3 text-red-600 border-red-300 hover:bg-red-100 flex-shrink-0"
                                >
                                  {retryingTaskId === task.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <RefreshCw className="h-3 w-3 mr-1" />
                                      Retry
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">No tasks submitted yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          {designRequest.aiAnalysisCompleted ? (
            <>
              {designRequest.designConcept && (
                <Card>
                  <CardHeader>
                    <CardTitle>Design Concept</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{designRequest.designConcept}</p>
                  </CardContent>
                </Card>
              )}

              {designRequest.styleRecommendations && (
                <Card>
                  <CardHeader>
                    <CardTitle>Style Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{designRequest.styleRecommendations}</p>
                  </CardContent>
                </Card>
              )}

              {designRequest.spatialLayout && (
                <Card>
                  <CardHeader>
                    <CardTitle>Spatial Layout</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{designRequest.spatialLayout}</p>
                  </CardContent>
                </Card>
              )}

              {designRequest.materialSuggestions && (
                <Card>
                  <CardHeader>
                    <CardTitle>Material Suggestions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{designRequest.materialSuggestions}</p>
                  </CardContent>
                </Card>
              )}

              {designRequest.sustainabilityFeatures && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sustainability Features</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{designRequest.sustainabilityFeatures}</p>
                  </CardContent>
                </Card>
              )}

              {designRequest.budgetConsiderations && (
                <Card>
                  <CardHeader>
                    <CardTitle>Budget Considerations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap">{designRequest.budgetConsiderations}</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">AI analysis not yet completed</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Submit tasks to initiate AI analysis
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Update Request Status</CardTitle>
              <CardDescription>
                Change the status of this design request
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {['Draft', 'Submitted', 'UnderReview', 'ClientReview', 'Approved', 'InDesign', 'Rendering', 'Completed', 'Cancelled'].map(status => (
                  <Button
                    key={status}
                    variant={designRequest.status === status ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusUpdate(status)}
                    disabled={designRequest.status === status}
                  >
                    {status}
                  </Button>
                ))}
              </div>

              {designRequest.status === 'RevisionRequired' && (
                <div className="mt-4">
                  <Label htmlFor="revisionNotes">Revision Notes</Label>
                  <Textarea
                    id="revisionNotes"
                    value={revisionNotes}
                    onChange={(e) => setRevisionNotes(e.target.value)}
                    placeholder="Describe what needs to be revised..."
                    rows={4}
                    className="mt-2"
                  />
                  <Button
                    onClick={() => handleStatusUpdate('RevisionRequired')}
                    className="mt-2"
                    disabled={!revisionNotes}
                  >
                    Save Revision Notes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {designRequest.revisionNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Revision History</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{designRequest.revisionNotes}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Revision Count: {designRequest.revisionCount}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
