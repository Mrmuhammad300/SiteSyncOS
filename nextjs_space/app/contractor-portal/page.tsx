'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BackButton } from '@/components/ui/back-button';
import { HardHat, FileText, Clock, CheckCircle, AlertCircle, Upload, MessageSquare, Plus } from 'lucide-react';

interface WorkOrder {
  id: string;
  workOrderNumber: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  project: { id: string; name: string };
  assignedTo?: { name: string };
  _count?: { photos: number };
}

export default function ContractorPortalPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      fetchWorkOrders();
    }
  }, [status, router]);

  const fetchWorkOrders = async (statusFilter?: string) => {
    try {
      const url = statusFilter && statusFilter !== 'all' 
        ? `/api/work-orders?status=${statusFilter}`
        : '/api/work-orders';
      const res = await fetch(url);
      const data = await res.json();
      setWorkOrders(data.workOrders || []);
    } catch (error) {
      console.error('Error fetching work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'ASSIGNED': 'bg-blue-100 text-blue-800',
      'IN_PROGRESS': 'bg-purple-100 text-purple-800',
      'ON_HOLD': 'bg-orange-100 text-orange-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'LOW': 'bg-green-100 text-green-800',
      'MEDIUM': 'bg-yellow-100 text-yellow-800',
      'HIGH': 'bg-orange-100 text-orange-800',
      'URGENT': 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const stats = {
    total: workOrders.length,
    pending: workOrders.filter(wo => wo.status === 'PENDING' || wo.status === 'ASSIGNED').length,
    inProgress: workOrders.filter(wo => wo.status === 'IN_PROGRESS').length,
    completed: workOrders.filter(wo => wo.status === 'COMPLETED').length
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
          <HardHat className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Contractor Portal</h1>
            <p className="text-muted-foreground">Manage work orders, submit documents, and track progress</p>
          </div>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Submission</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submit Daily Report</DialogTitle>
              <DialogDescription>Submit your daily work report and progress photos</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">Work Order</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select work order" /></SelectTrigger>
                  <SelectContent>
                    {workOrders.map(wo => (
                      <SelectItem key={wo.id} value={wo.id}>{wo.workOrderNumber} - {wo.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Progress Update</label>
                <Textarea placeholder="Describe today's work and progress..." rows={4} />
              </div>
              <div>
                <label className="text-sm font-medium">Progress Photos</label>
                <div className="mt-2 border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Drag and drop photos or click to upload</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
                <Button onClick={() => setShowNewDialog(false)}>Submit Report</Button>
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
                <p className="text-sm text-muted-foreground">Total Orders</p>
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
                <p className="text-sm text-muted-foreground">Pending</p>
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
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-500" />
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
          </CardContent>
        </Card>
      </div>

      {/* Work Orders Tabs */}
      <Tabs defaultValue="all" onValueChange={(val) => { setActiveTab(val); fetchWorkOrders(val); }}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="ASSIGNED">Assigned</TabsTrigger>
          <TabsTrigger value="IN_PROGRESS">In Progress</TabsTrigger>
          <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="grid gap-4">
            {workOrders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No work orders found</p>
                  <p className="text-muted-foreground">Work orders assigned to you will appear here</p>
                </CardContent>
              </Card>
            ) : (
              workOrders.map(order => (
                <Card key={order.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedOrder(order)}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono text-sm text-muted-foreground">{order.workOrderNumber}</span>
                          <Badge className={getStatusColor(order.status)}>{order.status.replace('_', ' ')}</Badge>
                          <Badge className={getPriorityColor(order.priority)}>{order.priority}</Badge>
                        </div>
                        <h3 className="font-semibold text-lg">{order.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{order.project?.name}</p>
                        {order.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{order.description}</p>
                        )}
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {order.scheduledStart && (
                          <p>Start: {new Date(order.scheduledStart).toLocaleDateString()}</p>
                        )}
                        {order.scheduledEnd && (
                          <p>End: {new Date(order.scheduledEnd).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Work Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl">
          {selectedOrder && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{selectedOrder.workOrderNumber}</span>
                  <Badge className={getStatusColor(selectedOrder.status)}>{selectedOrder.status.replace('_', ' ')}</Badge>
                </div>
                <DialogTitle className="text-xl">{selectedOrder.title}</DialogTitle>
                <DialogDescription>{selectedOrder.project?.name}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedOrder.description || 'No description provided'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Scheduled Start</h4>
                    <p className="text-sm">{selectedOrder.scheduledStart ? new Date(selectedOrder.scheduledStart).toLocaleDateString() : 'Not set'}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Scheduled End</h4>
                    <p className="text-sm">{selectedOrder.scheduledEnd ? new Date(selectedOrder.scheduledEnd).toLocaleDateString() : 'Not set'}</p>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button className="flex-1"><Upload className="h-4 w-4 mr-2" />Upload Photos</Button>
                  <Button variant="outline" className="flex-1"><MessageSquare className="h-4 w-4 mr-2" />Send Message</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
