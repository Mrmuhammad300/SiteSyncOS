'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BackButton } from '@/components/ui/back-button';
import { DocumentUpload } from '@/components/ui/document-upload';
import { ReportGenerator } from '@/components/ui/report-generator';
import { ArrowLeft, Calendar, User, AlertCircle, MessageSquare, Send, Upload, FileText } from 'lucide-react';

type RFI = {
  id: string;
  rfiNumber: string;
  subject: string;
  question: string;
  drawingReference?: string;
  specSection?: string;
  priority: string;
  status: string;
  dueDate?: string;
  costImpact: boolean;
  scheduleImpact: boolean;
  estimatedDelayDays?: number;
  project: { name: string; projectNumber: string };
  submittedBy: { firstName: string; lastName: string; role: string };
  assignedTo?: { firstName: string; lastName: string; role: string };
  responses?: { response: string; isDraft: boolean; respondedBy: { firstName: string; lastName: string }; createdAt: string }[];
  comments?: { comment: string; author: { firstName: string; lastName: string; role: string }; createdAt: string }[];
};

export default function RFIDetailPage() {
  const params = useParams();
  const [rfi, setRfi] = useState<RFI | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    if (params?.id) fetch(`/api/rfis/${params.id}`).then(r => r.ok && r.json()).then(d => { setRfi(d?.rfi); setLoading(false); });
  }, [params?.id]);

  const handleComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await fetch(`/api/rfis/${params?.id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comment: newComment }) });
      if (res.ok) { setNewComment(''); window.location.reload(); }
    } catch (error) { console.error(error); }
  };

  const handleResponse = async (isDraft: boolean) => {
    if (!newResponse.trim()) return;
    setResponding(true);
    try {
      const res = await fetch(`/api/rfis/${params?.id}/responses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response: newResponse, isDraft }) });
      if (res.ok) window.location.reload();
    } catch (error) { console.error(error); } finally { setResponding(false); }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-8 text-center">Loading...</div>;
  if (!rfi) return <div className="max-w-7xl mx-auto px-4 py-8 text-center">RFI not found</div>;

  const getStatusColor = (s: string) => ({ Open: 'bg-blue-100 text-blue-700', InReview: 'bg-yellow-100 text-yellow-700', DraftResponse: 'bg-purple-100 text-purple-700', OfficialResponse: 'bg-green-100 text-green-700', Closed: 'bg-gray-100 text-gray-700' }[s] ?? 'bg-gray-100 text-gray-700');
  const getPriorityColor = (p: string) => ({ Low: 'bg-gray-100 text-gray-700', Normal: 'bg-blue-100 text-blue-700', High: 'bg-orange-100 text-orange-700', Critical: 'bg-red-100 text-red-700' }[p] ?? 'bg-gray-100 text-gray-700');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <BackButton fallbackUrl="/rfis" />
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">{rfi.rfiNumber}</h1>
            <Badge className={getPriorityColor(rfi.priority)}>{rfi.priority}</Badge>
            <Badge className={getStatusColor(rfi.status)}>{rfi.status === 'InReview' ? 'In Review' : rfi.status === 'DraftResponse' ? 'Draft Response' : rfi.status === 'OfficialResponse' ? 'Official Response' : rfi.status}</Badge>
          </div>
          <h2 className="text-xl text-gray-700">{rfi.subject}</h2>
        </div>
        <div className="flex gap-2">
          <DocumentUpload 
            entityType="rfi" 
            entityId={rfi.id} 
            buttonText="Attach Files"
            buttonSize="sm"
          />
          <ReportGenerator 
            entityType="rfi" 
            entityId={rfi.id}
            entityName={`RFI ${rfi.rfiNumber}`}
            buttonText="Export"
            buttonSize="sm"
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Question</CardTitle></CardHeader>
            <CardContent><p className="text-gray-700 whitespace-pre-wrap">{rfi.question}</p></CardContent>
          </Card>

          {rfi.responses && rfi.responses.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Responses</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {rfi.responses.map((resp, i) => (
                  <div key={i} className={`p-4 rounded-lg ${resp.isDraft ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                    {resp.isDraft && <Badge className="mb-2 bg-yellow-600">Draft</Badge>}
                    <p className="text-gray-700 whitespace-pre-wrap mb-3">{resp.response}</p>
                    <p className="text-sm text-gray-600">By {resp.respondedBy.firstName} {resp.respondedBy.lastName} on {new Date(resp.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Add Response</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={newResponse} onChange={(e) => setNewResponse(e.target.value)} placeholder="Type your response..." rows={5} className="mb-4" />
              <div className="flex gap-2">
                <Button onClick={() => handleResponse(false)} disabled={responding || !newResponse.trim()} className="bg-green-600 hover:bg-green-700">Submit Official Response</Button>
                <Button onClick={() => handleResponse(true)} disabled={responding || !newResponse.trim()} variant="outline">Save as Draft</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Comments ({rfi.comments?.length ?? 0})</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {rfi.comments?.map((comment, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700 mb-2">{comment.comment}</p>
                  <p className="text-sm text-gray-600">{comment.author.firstName} {comment.author.lastName} ({comment.author.role}) • {new Date(comment.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
              <div className="flex gap-2 mt-4">
                <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." rows={2} />
                <Button onClick={handleComment} disabled={!newComment.trim()}><Send className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><p className="text-sm text-gray-600">Project</p><p className="font-semibold">{rfi.project.name}</p><p className="text-sm text-gray-500">{rfi.project.projectNumber}</p></div>
              <div><p className="text-sm text-gray-600">Submitted By</p><p className="font-semibold">{rfi.submittedBy.firstName} {rfi.submittedBy.lastName}</p><p className="text-sm text-gray-500">{rfi.submittedBy.role}</p></div>
              {rfi.assignedTo && <div><p className="text-sm text-gray-600">Assigned To</p><p className="font-semibold">{rfi.assignedTo.firstName} {rfi.assignedTo.lastName}</p><p className="text-sm text-gray-500">{rfi.assignedTo.role}</p></div>}
              {rfi.dueDate && <div><p className="text-sm text-gray-600">Due Date</p><p className="font-semibold">{new Date(rfi.dueDate).toLocaleDateString()}</p></div>}
              {rfi.drawingReference && <div><p className="text-sm text-gray-600">Drawing Reference</p><p className="font-semibold">{rfi.drawingReference}</p></div>}
              {rfi.specSection && <div><p className="text-sm text-gray-600">Spec Section</p><p className="font-semibold">{rfi.specSection}</p></div>}
            </CardContent>
          </Card>

          {(rfi.costImpact || rfi.scheduleImpact) && (
            <Card>
              <CardHeader><CardTitle>Impacts</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {rfi.costImpact && <div className="flex items-center text-orange-700"><AlertCircle className="w-4 h-4 mr-2" />Cost Impact</div>}
                {rfi.scheduleImpact && <div className="flex items-center text-orange-700"><AlertCircle className="w-4 h-4 mr-2" />Schedule Impact</div>}
                {rfi.estimatedDelayDays && <p className="text-sm text-gray-600 mt-2">Est. delay: {rfi.estimatedDelayDays} days</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
