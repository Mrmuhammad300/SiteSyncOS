'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BackButton } from '@/components/ui/back-button';
import { Calendar, ChevronLeft, ChevronRight, Plus, Flag, Link2, ZoomIn, ZoomOut } from 'lucide-react';

interface GanttTask {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  progress: number;
  status: string;
  isMilestone: boolean;
  wbsCode?: string;
  assignee?: { id: string; name: string };
  dependencies?: Array<{ id: string; predecessorTask: { id: string; name: string } }>;
}

interface Project {
  id: string;
  name: string;
}

export default function GanttChartPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = days, 2 = weeks, 3 = months
  const chartRef = useRef<HTMLDivElement>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({ 
    start: new Date(), 
    end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) 
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      fetchProjects();
    }
  }, [status, router]);

  useEffect(() => {
    const projectId = searchParams?.get('projectId');
    if (projectId) {
      setSelectedProject(projectId);
      fetchTasks(projectId);
    }
  }, [searchParams]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data.projects || []);
      if (data.projects?.length > 0 && !selectedProject) {
        const firstProject = data.projects[0].id;
        setSelectedProject(firstProject);
        fetchTasks(firstProject);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async (projectId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/gantt?projectId=${projectId}`);
      const data = await res.json();
      setTasks(data.tasks || []);
      
      // Calculate date range from tasks
      if (data.tasks?.length > 0) {
        const dates = data.tasks.flatMap((t: GanttTask) => [new Date(t.startDate), new Date(t.endDate)]);
        const minDate = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
        minDate.setDate(minDate.getDate() - 7);
        maxDate.setDate(maxDate.getDate() + 14);
        setDateRange({ start: minDate, end: maxDate });
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'NOT_STARTED': 'bg-gray-400',
      'IN_PROGRESS': 'bg-blue-500',
      'COMPLETED': 'bg-green-500',
      'ON_HOLD': 'bg-yellow-500',
      'DELAYED': 'bg-red-500'
    };
    return colors[status] || 'bg-gray-400';
  };

  const getDaysBetween = (start: Date, end: Date) => {
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getTaskPosition = (task: GanttTask) => {
    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.endDate);
    const totalDays = getDaysBetween(dateRange.start, dateRange.end);
    const startOffset = getDaysBetween(dateRange.start, taskStart);
    const duration = getDaysBetween(taskStart, taskEnd);
    
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`
    };
  };

  const generateDateHeaders = () => {
    const headers: Date[] = [];
    const current = new Date(dateRange.start);
    while (current <= dateRange.end) {
      headers.push(new Date(current));
      current.setDate(current.getDate() + (zoomLevel === 1 ? 1 : zoomLevel === 2 ? 7 : 30));
    }
    return headers;
  };

  if (loading && !tasks.length) {
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
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Gantt Chart</h1>
            <p className="text-muted-foreground">Interactive project timeline with milestones and dependencies</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedProject} onValueChange={(val) => { setSelectedProject(val); fetchTasks(val); }}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setZoomLevel(Math.max(1, zoomLevel - 1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setZoomLevel(Math.min(3, zoomLevel + 1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium">Task Name</label>
                  <Input placeholder="Enter task name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Start Date</label>
                    <Input type="date" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">End Date</label>
                    <Input type="date" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="milestone" />
                  <label htmlFor="milestone" className="text-sm">Mark as Milestone</label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
                  <Button onClick={() => setShowNewDialog(false)}>Create Task</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-400" />
          <span>Not Started</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500" />
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-500" />
          <span>On Hold</span>
        </div>
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-purple-500" />
          <span>Milestone</span>
        </div>
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-orange-500" />
          <span>Dependency</span>
        </div>
      </div>

      {/* Gantt Chart */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto" ref={chartRef}>
            {/* Date Header */}
            <div className="flex border-b bg-muted/30 sticky top-0">
              <div className="w-64 min-w-64 p-3 font-medium border-r">Task Name</div>
              <div className="flex-1 flex">
                {generateDateHeaders().map((date, idx) => (
                  <div key={idx} className="flex-1 min-w-[40px] text-center text-xs py-2 border-r">
                    {zoomLevel === 1 
                      ? date.getDate()
                      : zoomLevel === 2 
                        ? `W${Math.ceil(date.getDate() / 7)}`
                        : date.toLocaleDateString('en-US', { month: 'short' })
                    }
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks */}
            {tasks.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No tasks found</p>
                <p className="text-muted-foreground">Add tasks to see them on the Gantt chart</p>
              </div>
            ) : (
              tasks.map((task, idx) => (
                <div key={task.id} className="flex border-b hover:bg-muted/20">
                  <div className="w-64 min-w-64 p-3 border-r">
                    <div className="flex items-center gap-2">
                      {task.isMilestone && <Flag className="h-4 w-4 text-purple-500" />}
                      <div>
                        <p className="font-medium text-sm truncate">{task.name}</p>
                        {task.wbsCode && <p className="text-xs text-muted-foreground">{task.wbsCode}</p>}
                      </div>
                    </div>
                    {task.assignee && (
                      <p className="text-xs text-muted-foreground mt-1">{task.assignee.name}</p>
                    )}
                  </div>
                  <div className="flex-1 relative py-2 px-1">
                    {/* Task Bar */}
                    <div 
                      className={`absolute top-1/2 -translate-y-1/2 h-6 rounded ${task.isMilestone ? 'w-4 h-4 rotate-45 bg-purple-500' : getStatusColor(task.status)}`}
                      style={task.isMilestone ? { left: getTaskPosition(task).left } : getTaskPosition(task)}
                    >
                      {!task.isMilestone && (
                        <>
                          {/* Progress Bar */}
                          <div 
                            className="absolute left-0 top-0 h-full bg-black/20 rounded-l"
                            style={{ width: `${task.progress}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-medium">
                            {task.progress}%
                          </span>
                        </>
                      )}
                    </div>
                    {/* Dependencies */}
                    {task.dependencies?.map(dep => (
                      <div key={dep.id} className="absolute top-0 left-0 w-full h-full pointer-events-none">
                        {/* Dependency lines would be drawn here with SVG */}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
