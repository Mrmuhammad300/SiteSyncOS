'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/ui/back-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentUpload } from '@/components/ui/document-upload';
import { ReportGenerator } from '@/components/ui/report-generator';
import { ArrowLeft, Download, FileText, MessageSquare, CheckCircle2, Clock, AlertCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Submittal {
  id: string;
  submittalNumber: string;
  title: string;
  description: string;
  type: string;
  specSection: string;
  status: string;
  priority: string;
  dueDate: string | null;
  submittedDate: string;
  project: {
    id: string;
    name: string;
    projectNumber: string;
  };
  submittedBy: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  } | null;
  responses: SubmittalResponse[];
  comments: SubmittalComment[];
}

interface SubmittalResponse {
  id: string;
  reviewStatus: string;
  response: string;
  createdAt: string;
  respondedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface SubmittalComment {
  id: string;
  comment: string;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export default function SubmittalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession() || {};
  const [submittal, setSubmittal] = useState<Submittal | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  
  const [responseForm, setResponseForm] = useState({
    reviewStatus: 'Approved',
    response: ''
  });

  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    if (params?.id) {
      fetchSubmittal();
    }
  }, [params?.id]);

  const fetchSubmittal = async () => {
    try {
      const res = await fetch(`/api/submittals/${params?.id}`);
      if (res.ok) {
        const data = await res.json();
        setSubmittal(data.submittal || data);
      } else {
        toast.error('Failed to load submittal');
        router.push('/submittals');
      }
    } catch (error) {
      console.error('Failed to fetch submittal:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!responseForm.response) {
      toast.error('Please provide review response');
      return;
    }

    setSubmittingResponse(true);

    try {
      const res = await fetch(`/api/submittals/${params?.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(responseForm),
      });

      if (res.ok) {
        toast.success('Response submitted successfully');
        setResponseForm({ reviewStatus: 'Approved', response: '' });
        fetchSubmittal();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to submit response');
      }
    } catch (error) {
      console.error('Response error:', error);
      toast.error('An error occurred');
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setSubmittingComment(true);

    try {
      const res = await fetch(`/api/submittals/${params?.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: commentText }),
      });

      if (res.ok) {
        toast.success('Comment added successfully');
        setCommentText('');
        fetchSubmittal();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Comment error:', error);
      toast.error('An error occurred');
    } finally {
      setSubmittingComment(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ContractorReview: 'bg-blue-100 text-blue-800',
      SubmittedToArchitect: 'bg-purple-100 text-purple-800',
      ArchitectReview: 'bg-yellow-100 text-yellow-800',
      Approved: 'bg-green-100 text-green-800',
      Rejected: 'bg-red-100 text-red-800',
      Resubmitted: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getReviewStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Approved: 'bg-green-100 text-green-800',
      ApprovedAsNoted: 'bg-blue-100 text-blue-800',
      ReviseAndResubmit: 'bg-orange-100 text-orange-800',
      Rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      Low: 'bg-gray-100 text-gray-800',
      Medium: 'bg-blue-100 text-blue-800',
      High: 'bg-orange-100 text-orange-800',
      Critical: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const formatStatus = (status: string | null | undefined) => {
    if (!status) return 'N/A';
    return status.replace(/([A-Z])/g, ' $1').trim();
  };

  const formatDate = (date: string | null | undefined, formatStr: string = 'MMM dd, yyyy') => {
    if (!date) return 'N/A';
    try {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) return 'Invalid Date';
      return format(parsedDate, formatStr);
    } catch (error) {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!submittal) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Submittal not found</div>
        </div>
      </div>
    );
  }

  const canReview = session?.user && 
    submittal.assignedTo?.id === (session.user as any).id &&
    ['SubmittedToArchitect', 'ArchitectReview', 'EngineerReview', 'OwnerReview'].includes(submittal.status);

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <BackButton fallbackUrl="/submittals" label="Back to Submittals" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">{submittal.submittalNumber}</h1>
                    <Badge className={getStatusColor(submittal.status)}>
                      {formatStatus(submittal.status)}
                    </Badge>
                    <Badge className={getPriorityColor(submittal.priority)}>
                      {submittal.priority}
                    </Badge>
                  </div>
                  <h2 className="text-xl text-muted-foreground">{submittal.title}</h2>
                </div>
                <div className="flex gap-2">
                  <DocumentUpload 
                    entityType="submittal" 
                    entityId={submittal.id} 
                    buttonText="Upload"
                    buttonSize="sm"
                  />
                  <ReportGenerator 
                    entityType="submittal" 
                    entityId={submittal.id}
                    entityName={`Submittal ${submittal.submittalNumber}`}
                    buttonText="Export"
                    buttonSize="sm"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  {submittal.description || 'No description provided'}
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <p className="mt-1 text-sm">{formatStatus(submittal.type)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Spec Section</Label>
                  <p className="mt-1 text-sm">{submittal.specSection || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Submitted Date</Label>
                  <p className="mt-1 text-sm">
                    {formatDate(submittal.submittedDate)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Due Date</Label>
                  <p className="mt-1 text-sm">
                    {formatDate(submittal.dueDate) !== 'N/A' ? formatDate(submittal.dueDate) : 'Not set'}
                  </p>
                </div>
              </div>


            </CardContent>
          </Card>

          {/* Tabs for Responses and Comments */}
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="responses" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="responses">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Responses ({submittal.responses?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="comments">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Comments ({submittal.comments?.length || 0})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="responses" className="space-y-4 mt-6">
                  {/* Review Form - Only for assigned reviewer */}
                  {canReview && (
                    <Card className="border-primary">
                      <CardHeader>
                        <CardTitle className="text-lg">Submit Review</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleSubmitResponse} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="reviewStatus">Review Status *</Label>
                            <Select
                              value={responseForm.reviewStatus}
                              onValueChange={(value) => setResponseForm(prev => ({ ...prev, reviewStatus: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Approved">Approved</SelectItem>
                                <SelectItem value="ApprovedAsNoted">Approved As Noted</SelectItem>
                                <SelectItem value="ReviseAndResubmit">Revise and Resubmit</SelectItem>
                                <SelectItem value="Rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="response">Review Response *</Label>
                            <Textarea
                              id="response"
                              value={responseForm.response}
                              onChange={(e) => setResponseForm(prev => ({ ...prev, response: e.target.value }))}
                              placeholder="Enter your review response"
                              rows={4}
                              required
                            />
                          </div>

                          <Button type="submit" disabled={submittingResponse}>
                            {submittingResponse ? 'Submitting...' : 'Submit Review'}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  )}

                  {/* Responses List */}
                  {submittal.responses && submittal.responses.length > 0 ? (
                    <div className="space-y-4">
                      {submittal.responses.map((response) => (
                        <Card key={response.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div>
                                  <p className="font-medium">{response.respondedBy.firstName} {response.respondedBy.lastName}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge className={getReviewStatusColor(response.reviewStatus)}>
                                  {formatStatus(response.reviewStatus)}
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDate(response.createdAt, 'MMM dd, yyyy h:mm a')}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm mt-2">{response.response}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No responses yet</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="comments" className="space-y-4 mt-6">
                  {/* Comment Form */}
                  <Card>
                    <CardContent className="pt-6">
                      <form onSubmit={handleSubmitComment} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="comment">Add Comment</Label>
                          <Textarea
                            id="comment"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Enter your comment"
                            rows={3}
                          />
                        </div>
                        <Button type="submit" disabled={submittingComment}>
                          {submittingComment ? 'Adding...' : 'Add Comment'}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Comments List */}
                  {submittal.comments && submittal.comments.length > 0 ? (
                    <div className="space-y-4">
                      {submittal.comments.map((comment) => (
                        <Card key={comment.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div>
                                  <p className="font-medium">{comment.author.firstName} {comment.author.lastName}</p>
                                  <p className="text-sm text-muted-foreground">{comment.author.role}</p>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(comment.createdAt, 'MMM dd, yyyy h:mm a')}
                              </p>
                            </div>
                            <p className="text-sm">{comment.comment}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No comments yet</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Project</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{submittal.project.name}</p>
              <p className="text-sm text-muted-foreground">{submittal.project.projectNumber}</p>
            </CardContent>
          </Card>

          {/* Submitter Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Submitted By</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{submittal.submittedBy.firstName} {submittal.submittedBy.lastName}</p>
              <p className="text-sm text-muted-foreground">{submittal.submittedBy.role}</p>
            </CardContent>
          </Card>

          {/* Assigned To Info */}
          {submittal.assignedTo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assigned Reviewer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{submittal.assignedTo.firstName} {submittal.assignedTo.lastName}</p>
                <p className="text-sm text-muted-foreground">{submittal.assignedTo.role}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
