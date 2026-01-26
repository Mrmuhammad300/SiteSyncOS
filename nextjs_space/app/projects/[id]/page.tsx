'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BackButton } from '@/components/ui/back-button';
import { DocumentUpload } from '@/components/ui/document-upload';
import { ReportGenerator } from '@/components/ui/report-generator';
import { ArrowLeft, Edit, DollarSign, Calendar, MapPin, Users, MessageSquare, FileText, FileStack, Upload } from 'lucide-react';

type Project = {
  id: string;
  name: string;
  client: string;
  projectNumber: string;
  address: string;
  city?: string;
  state?: string;
  startDate: string;
  estimatedCompletion: string;
  actualCompletion?: string;
  budget: number;
  status: string;
  phase: string;
  description?: string;
  projectManager?: { firstName: string; lastName: string };
  superintendent?: { firstName: string; lastName: string };
  architect?: { firstName: string; lastName: string };
  engineer?: { firstName: string; lastName: string };
  team?: { user: { firstName: string; lastName: string; role: string } }[];
  _count?: { rfis: number; dailyReports: number; documents: number };
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params?.id) {
      fetch(`/api/projects/${params.id}`)
        .then(r => r.ok && r.json())
        .then(d => { setProject(d?.project); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [params?.id]);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-8 text-center">Loading...</div>;
  if (!project) return <div className="max-w-7xl mx-auto px-4 py-8 text-center">Project not found</div>;

  const getStatusColor = (s: string) => ({
    Active: 'bg-green-100 text-green-700',
    PreConstruction: 'bg-blue-100 text-blue-700',
    OnHold: 'bg-yellow-100 text-yellow-700',
    Completed: 'bg-gray-100 text-gray-700'
  }[s] ?? 'bg-gray-100 text-gray-700');

  const getPhaseColor = (p: string) => ({
    Planning: 'bg-slate-100 text-slate-700',
    Foundation: 'bg-blue-100 text-blue-700',
    Framing: 'bg-orange-100 text-orange-700',
    MEP: 'bg-purple-100 text-purple-700',
    Finishing: 'bg-green-100 text-green-700',
    Closeout: 'bg-gray-100 text-gray-700'
  }[p] ?? 'bg-gray-100 text-gray-700');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <BackButton fallbackUrl="/projects" />
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
          <div className="flex gap-2">
            <Badge className={getStatusColor(project.status)}>
              {project.status === 'PreConstruction' ? 'Pre-Construction' : project.status === 'OnHold' ? 'On Hold' : project.status}
            </Badge>
            <Badge className={getPhaseColor(project.phase)}>{project.phase}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <DocumentUpload 
            entityType="project" 
            entityId={project.id} 
            buttonText="Upload Files"
            onUploadComplete={() => router.refresh()}
          />
          <ReportGenerator 
            entityType="project" 
            entityId={project.id}
            entityName={project.name}
            buttonText="Generate Report"
          />
          <Button onClick={() => router.push(`/projects/${project.id}/edit`)} className="bg-gradient-to-r from-blue-600 to-orange-500">
            <Edit className="w-4 h-4 mr-2" />Edit
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Budget</p>
                <p className="text-2xl font-bold">${(project.budget / 1000000).toFixed(2)}M</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Open RFIs</p>
                <p className="text-2xl font-bold">{project._count?.rfis ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Daily Reports</p>
                <p className="text-2xl font-bold">{project._count?.dailyReports ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="rfis">RFIs</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader><CardTitle>Project Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div><p className="text-sm text-gray-600 mb-1">Client</p><p className="font-semibold flex items-center"><Users className="w-4 h-4 mr-2 text-gray-500" />{project.client}</p></div>
                <div><p className="text-sm text-gray-600 mb-1">Project Number</p><p className="font-semibold">{project.projectNumber}</p></div>
                <div><p className="text-sm text-gray-600 mb-1">Location</p><p className="font-semibold flex items-center"><MapPin className="w-4 h-4 mr-2 text-gray-500" />{project.address}{project.city && `, ${project.city}`}{project.state && `, ${project.state}`}</p></div>
                <div><p className="text-sm text-gray-600 mb-1">Timeline</p><p className="font-semibold flex items-center"><Calendar className="w-4 h-4 mr-2 text-gray-500" />{new Date(project.startDate).toLocaleDateString()} - {new Date(project.estimatedCompletion).toLocaleDateString()}</p></div>
              </div>
              {project.description && <div><p className="text-sm text-gray-600 mb-2">Description</p><p className="text-gray-700">{project.description}</p></div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader><CardTitle>Project Team</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Project Manager', member: project.projectManager },
                { label: 'Superintendent', member: project.superintendent },
                { label: 'Architect', member: project.architect },
                { label: 'Engineer', member: project.engineer }
              ].map(({ label, member }) => (
                <div key={label} className="flex justify-between items-center py-3 border-b last:border-0">
                  <span className="font-medium text-gray-700">{label}</span>
                  <span className="text-gray-900">{member ? `${member.firstName} ${member.lastName}` : 'Not assigned'}</span>
                </div>
              ))}
              {project.team && project.team.length > 0 && (
                <>
                  <div className="pt-4 mt-4 border-t"><h4 className="font-semibold mb-3">Additional Team Members</h4></div>
                  {project.team.map((t, i) => (
                    <div key={i} className="flex justify-between py-2">
                      <span className="text-gray-700">{t.user.firstName} {t.user.lastName}</span>
                      <Badge variant="outline">{t.user.role}</Badge>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rfis">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>RFIs</CardTitle>
              <Link href={`/rfis/new?project=${project.id}`}><Button>New RFI</Button></Link>
            </CardHeader>
            <CardContent><p className="text-gray-600">View all RFIs for this project on the <Link href={`/rfis?project=${project.id}`} className="text-blue-600 hover:underline">RFIs page</Link>.</p></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Daily Reports</CardTitle>
              <Link href={`/daily-reports/new?project=${project.id}`}><Button>New Report</Button></Link>
            </CardHeader>
            <CardContent><p className="text-gray-600">View all daily reports for this project on the <Link href={`/daily-reports?project=${project.id}`} className="text-blue-600 hover:underline">Daily Reports page</Link>.</p></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Documents</CardTitle>
              <Link href={`/documents?project=${project.id}`}><Button>Manage Documents</Button></Link>
            </CardHeader>
            <CardContent><p className="text-gray-600">View and manage all documents for this project on the <Link href={`/documents?project=${project.id}`} className="text-blue-600 hover:underline">Documents page</Link>.</p></CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
