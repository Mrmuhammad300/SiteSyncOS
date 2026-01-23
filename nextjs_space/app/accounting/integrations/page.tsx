'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { DashboardNav } from '@/components/dashboard-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DollarSign,
  Plus,
  Settings,
  Trash2,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AccountingIntegration {
  id: string;
  provider: string;
  name: string;
  companyId?: string;
  isActive: boolean;
  autoSyncEnabled: boolean;
  syncFrequency?: string;
  lastSyncAt?: string;
  syncCount: number;
  lastError?: string;
  createdAt: string;
}

export default function AccountingIntegrationsPage() {
  const router = useRouter();
  const { data: session, status } = useSession() || {};
  const [integrations, setIntegrations] = useState<AccountingIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    provider: '',
    name: '',
    companyId: '',
    apiKey: '',
    apiSecret: '',
    webhookUrl: '',
    autoSyncEnabled: false,
    syncFrequency: 'daily'
  });
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      fetchIntegrations();
    }
  }, [status, router]);
  
  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/accounting/integrations');
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations || []);
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    
    try {
      const response = await fetch('/api/accounting/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create integration');
      }
      
      toast.success('Integration created successfully!');
      setDialogOpen(false);
      resetForm();
      fetchIntegrations();
    } catch (error: any) {
      console.error('Error creating integration:', error);
      toast.error(error.message || 'Failed to create integration');
    } finally {
      setFormLoading(false);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;
    
    try {
      const response = await fetch(`/api/accounting/integrations/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete integration');
      }
      
      toast.success('Integration deleted successfully');
      fetchIntegrations();
    } catch (error) {
      console.error('Error deleting integration:', error);
      toast.error('Failed to delete integration');
    }
  };
  
  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/accounting/integrations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update integration');
      }
      
      toast.success(isActive ? 'Integration activated' : 'Integration deactivated');
      fetchIntegrations();
    } catch (error) {
      console.error('Error updating integration:', error);
      toast.error('Failed to update integration');
    }
  };
  
  const resetForm = () => {
    setFormData({
      provider: '',
      name: '',
      companyId: '',
      apiKey: '',
      apiSecret: '',
      webhookUrl: '',
      autoSyncEnabled: false,
      syncFrequency: 'daily'
    });
  };
  
  const getProviderIcon = (provider: string) => {
    return <DollarSign className="w-5 h-5" />;
  };
  
  const getProviderColor = (provider: string) => {
    const colors: any = {
      QuickBooks: 'bg-green-500',
      Xero: 'bg-blue-500',
      FreshBooks: 'bg-orange-500',
      Sage: 'bg-teal-500',
      NetSuite: 'bg-red-500',
      Custom: 'bg-gray-500'
    };
    return colors[provider] || 'bg-gray-500';
  };
  
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-orange-50/50">
      <DashboardNav />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Accounting Integrations</h1>
              <p className="text-gray-600">Connect your accounting software</p>
            </div>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Integration
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Accounting Integration</DialogTitle>
                <DialogDescription>
                  Connect your accounting software to sync financial data
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">Accounting Software</Label>
                  <Select
                    value={formData.provider}
                    onValueChange={(value) => setFormData({ ...formData, provider: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select software" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="QuickBooks">QuickBooks Online</SelectItem>
                      <SelectItem value="Xero">Xero</SelectItem>
                      <SelectItem value="FreshBooks">FreshBooks</SelectItem>
                      <SelectItem value="Sage">Sage</SelectItem>
                      <SelectItem value="NetSuite">NetSuite</SelectItem>
                      <SelectItem value="Custom">Custom Integration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Integration Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Main Company Account"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="companyId">Company/Realm ID (Optional)</Label>
                  <Input
                    id="companyId"
                    placeholder="For multi-tenant systems"
                    value={formData.companyId}
                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Your API key"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">
                    Get your API key from your accounting software's developer portal
                  </p>
                </div>
                
                {formData.provider === 'Custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="webhookUrl">Webhook URL</Label>
                    <Input
                      id="webhookUrl"
                      placeholder="https://your-system.com/webhook"
                      value={formData.webhookUrl}
                      onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                    />
                  </div>
                )}
                
                <div className="flex items-center space-x-2 pt-4">
                  <Switch
                    id="autoSync"
                    checked={formData.autoSyncEnabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, autoSyncEnabled: checked })}
                  />
                  <Label htmlFor="autoSync">Enable Auto-Sync</Label>
                </div>
                
                {formData.autoSyncEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="syncFrequency">Sync Frequency</Label>
                    <Select
                      value={formData.syncFrequency}
                      onValueChange={(value) => setFormData({ ...formData, syncFrequency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Real-time</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={formLoading}
                    className="bg-gradient-to-r from-green-600 to-emerald-600"
                  >
                    {formLoading ? 'Creating...' : 'Create Integration'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Integrations Grid */}
        {integrations.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <DollarSign className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Integrations Yet
              </h3>
              <p className="text-sm text-gray-600 max-w-sm mb-6">
                Connect your accounting software to automatically sync financial data with SiteSync OS
              </p>
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-gradient-to-r from-green-600 to-emerald-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Integration
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map((integration) => (
              <Card key={integration.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 ${getProviderColor(integration.provider)} rounded-lg flex items-center justify-center`}>
                        {getProviderIcon(integration.provider)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <CardDescription>{integration.provider}</CardDescription>
                      </div>
                    </div>
                    {integration.isActive ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="w-3 h-3 mr-1" />
                        Inactive
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Sync Info */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Auto-Sync:</span>
                      <span className="font-medium">
                        {integration.autoSyncEnabled ? (
                          <Badge variant="outline" className="text-green-600">
                            Enabled ({integration.syncFrequency})
                          </Badge>
                        ) : (
                          <Badge variant="outline">Disabled</Badge>
                        )}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Syncs:</span>
                      <span className="font-medium">{integration.syncCount}</span>
                    </div>
                    
                    {integration.lastSyncAt && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Last Sync:</span>
                        <span className="font-medium">
                          {new Date(integration.lastSyncAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    
                    {integration.lastError && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        {integration.lastError}
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-2 pt-4 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(integration.id, !integration.isActive)}
                        className="flex-1"
                      >
                        {integration.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(integration.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">QuickBooks Online</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Sync invoices, expenses, and project costs automatically.
              </p>
              <Button size="sm" variant="outline" className="w-full">
                <ExternalLink className="w-4 h-4 mr-2" />
                Setup Guide
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Xero</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Connect to Xero for real-time financial synchronization.
              </p>
              <Button size="sm" variant="outline" className="w-full">
                <ExternalLink className="w-4 h-4 mr-2" />
                Setup Guide
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Custom Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Use webhooks to integrate with any accounting system.
              </p>
              <Button size="sm" variant="outline" className="w-full">
                <ExternalLink className="w-4 h-4 mr-2" />
                API Documentation
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
