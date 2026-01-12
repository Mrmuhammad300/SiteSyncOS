'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BackButton } from '@/components/ui/back-button';
import { Users, Building, DollarSign, FileText, Plus, Mail, Phone, CreditCard, AlertCircle } from 'lucide-react';

interface Tenant {
  id: string;
  companyName?: string;
  contactName: string;
  email: string;
  phone?: string;
  type: string;
  status: string;
  property: { id: string; name: string; address: string };
  units: Array<{ unit: { id: string; unitNumber: string; floor?: number } }>;
  leases: Array<{ id: string; monthlyRent: number; startDate: string; endDate: string; status: string }>;
  payments: Array<{ id: string; amount: number; dueDate: string; status: string }>;
  _count: { payments: number; communications: number };
}

interface Property {
  id: string;
  name: string;
}

export default function TenantManagementPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      fetchProperties();
      fetchTenants();
    }
  }, [status, router]);

  useEffect(() => {
    fetchTenants();
  }, [selectedProperty, statusFilter]);

  const fetchProperties = async () => {
    try {
      const res = await fetch('/api/properties');
      const data = await res.json();
      setProperties(data.properties || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchTenants = async () => {
    try {
      let url = '/api/tenants';
      const params = new URLSearchParams();
      if (selectedProperty) params.append('propertyId', selectedProperty);
      if (statusFilter) params.append('status', statusFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();
      setTenants(data.tenants || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'PROSPECT': 'bg-blue-100 text-blue-800',
      'APPLICANT': 'bg-yellow-100 text-yellow-800',
      'ACTIVE': 'bg-green-100 text-green-800',
      'NOTICE': 'bg-orange-100 text-orange-800',
      'FORMER': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getOverduePayments = (payments: Tenant['payments']) => {
    return payments.filter(p => p.status === 'OVERDUE' || (p.status === 'PENDING' && new Date(p.dueDate) < new Date())).length;
  };

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.status === 'ACTIVE').length,
    prospects: tenants.filter(t => t.status === 'PROSPECT' || t.status === 'APPLICANT').length,
    monthlyRevenue: tenants.reduce((sum, t) => sum + (t.leases?.[0]?.monthlyRent || 0), 0)
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
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Tenant Management</h1>
            <p className="text-muted-foreground">Lease tracking, payment history, and tenant communications</p>
          </div>
        </div>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Tenant</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Tenant</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">Property</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Company Name</label>
                  <Input placeholder="Company name (optional)" />
                </div>
                <div>
                  <label className="text-sm font-medium">Contact Name *</label>
                  <Input placeholder="Full name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Email *</label>
                  <Input type="email" placeholder="email@example.com" />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <Input placeholder="(555) 123-4567" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Tenant Type</label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                    <SelectItem value="Residential">Residential</SelectItem>
                    <SelectItem value="Industrial">Industrial</SelectItem>
                    <SelectItem value="Retail">Retail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
                <Button onClick={() => setShowNewDialog(false)}>Add Tenant</Button>
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
                <p className="text-sm text-muted-foreground">Total Tenants</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Leases</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
              <FileText className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Prospects</p>
                <p className="text-2xl font-bold">{stats.prospects}</p>
              </div>
              <Building className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <Select value={selectedProperty} onValueChange={setSelectedProperty}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="All Properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Properties</SelectItem>
            {properties.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="PROSPECT">Prospect</SelectItem>
            <SelectItem value="APPLICANT">Applicant</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="NOTICE">Notice</SelectItem>
            <SelectItem value="FORMER">Former</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tenants Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Property / Unit</TableHead>
                <TableHead>Lease</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Monthly Rent</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No tenants found</p>
                    <p className="text-muted-foreground">Add your first tenant to get started</p>
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map(tenant => {
                  const overdueCount = getOverduePayments(tenant.payments || []);
                  const currentLease = tenant.leases?.[0];
                  
                  return (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{tenant.companyName || tenant.contactName}</p>
                          {tenant.companyName && <p className="text-sm text-muted-foreground">{tenant.contactName}</p>}
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {tenant.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{tenant.property?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {tenant.units?.map(u => `Unit ${u.unit.unitNumber}`).join(', ') || 'No unit assigned'}
                        </p>
                      </TableCell>
                      <TableCell>
                        {currentLease ? (
                          <div className="text-sm">
                            <p>{new Date(currentLease.startDate).toLocaleDateString()}</p>
                            <p className="text-muted-foreground">to {new Date(currentLease.endDate).toLocaleDateString()}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No lease</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(tenant.status)}>{tenant.status}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {currentLease ? formatCurrency(currentLease.monthlyRent) : '-'}
                      </TableCell>
                      <TableCell>
                        {overdueCount > 0 ? (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>{overdueCount} overdue</span>
                          </div>
                        ) : (
                          <span className="text-green-600">Current</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">View</Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
