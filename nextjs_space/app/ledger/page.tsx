'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BackButton } from '@/components/ui/back-button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  BookOpen, DollarSign, CheckCircle, Clock, AlertCircle, Activity, 
  TrendingUp, TrendingDown, RefreshCw, FileCheck, ArrowUpRight, ArrowDownRight,
  Shield, Database, Zap, Scale
} from 'lucide-react';

interface LedgerEntry {
  id: string;
  entryNumber: string;
  entryType: 'Debit' | 'Credit';
  accountCode: string;
  accountName: string;
  description: string;
  amount: number;
  reconciled: boolean;
  reconciledAt?: string;
  createdAt: string;
  project: { id: string; name: string };
  event?: { eventType: string; occurredAt: string };
}

interface ProjectEvent {
  id: string;
  eventType: string;
  occurredAt: string;
  processed: boolean;
  processedAt?: string;
  confidence: number;
  data: Record<string, unknown>;
  project: { id: string; name: string };
}

interface Project {
  id: string;
  name: string;
  budget: number;
}

interface LedgerSummary {
  totalDebits: number;
  totalCredits: number;
  balance: number;
  accountCodes: Record<string, string>;
}

const ACCOUNT_CODES = {
  '1100': 'Construction Draws',
  '1200': 'Retainage',
  '2100': 'Accounts Payable',
  '5100': 'Construction Expense',
  '5200': 'Contingency',
};

export default function LedgerPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('entries');
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [reconciledFilter, setReconciledFilter] = useState<string>('all');
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      fetchProjects();
      fetchLedgerEntries();
      fetchEvents();
    }
  }, [status, router]);

  useEffect(() => {
    fetchLedgerEntries();
  }, [selectedProject, accountFilter, reconciledFilter]);

  useEffect(() => {
    fetchEvents();
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects?limit=100');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchLedgerEntries = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedProject !== 'all') params.append('projectId', selectedProject);
      if (accountFilter !== 'all') params.append('accountCode', accountFilter);
      if (reconciledFilter !== 'all') params.append('reconciled', reconciledFilter);
      params.append('limit', '100');

      const res = await fetch(`/api/ledger?${params.toString()}`);
      const data = await res.json();
      setLedgerEntries(data.entries || []);
      setSummary({
        totalDebits: data.totalDebits || 0,
        totalCredits: data.totalCredits || 0,
        balance: data.balance || 0,
        accountCodes: data.accountCodes || ACCOUNT_CODES,
      });
    } catch (error) {
      console.error('Error fetching ledger entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedProject !== 'all') params.append('projectId', selectedProject);
      params.append('limit', '50');

      const res = await fetch(`/api/events?${params.toString()}`);
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleReconcile = async (reconcile: boolean) => {
    if (selectedEntries.length === 0) return;
    setReconciling(true);

    try {
      const res = await fetch('/api/ledger', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryIds: selectedEntries, reconcile }),
      });

      if (res.ok) {
        setSelectedEntries([]);
        fetchLedgerEntries();
      }
    } catch (error) {
      console.error('Error reconciling entries:', error);
    } finally {
      setReconciling(false);
    }
  };

  const toggleEntry = (id: string) => {
    setSelectedEntries(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedEntries.length === ledgerEntries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(ledgerEntries.map(e => e.id));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      'MilestoneCompleted': <CheckCircle className="h-4 w-4 text-green-500" />,
      'CapitalDrawRequested': <DollarSign className="h-4 w-4 text-blue-500" />,
      'DrawApproved': <CheckCircle className="h-4 w-4 text-green-500" />,
      'DrawDenied': <AlertCircle className="h-4 w-4 text-red-500" />,
      'PaymentProcessed': <Zap className="h-4 w-4 text-purple-500" />,
      'InspectionCompleted': <FileCheck className="h-4 w-4 text-teal-500" />,
    };
    return icons[type] || <Activity className="h-4 w-4 text-gray-500" />;
  };

  const reconciledCount = ledgerEntries.filter(e => e.reconciled).length;
  const unreconciledCount = ledgerEntries.filter(e => !e.reconciled).length;

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
          <BookOpen className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Quantum Ledger</h1>
            <p className="text-muted-foreground">Event-driven treasury with immutable audit trails</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => { fetchLedgerEntries(); fetchEvents(); }}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Debits</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary?.totalDebits || 0)}
                </p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Credits</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary?.totalCredits || 0)}
                </p>
              </div>
              <ArrowDownRight className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Balance</p>
                <p className={`text-2xl font-bold ${(summary?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary?.balance || 0)}
                </p>
              </div>
              <Scale className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reconciliation</p>
                <p className="text-2xl font-bold">
                  {reconciledCount}/{ledgerEntries.length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="entries">
            <Database className="h-4 w-4 mr-2" /> Journal Entries
          </TabsTrigger>
          <TabsTrigger value="events">
            <Activity className="h-4 w-4 mr-2" /> Event Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entries">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {Object.entries(ACCOUNT_CODES).map(([code, name]) => (
                  <SelectItem key={code} value={code}>{code} - {name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={reconciledFilter} onValueChange={setReconciledFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Reconciled</SelectItem>
                <SelectItem value="false">Unreconciled</SelectItem>
              </SelectContent>
            </Select>

            {selectedEntries.length > 0 && (
              <div className="flex gap-2 ml-auto">
                <Button
                  size="sm"
                  onClick={() => handleReconcile(true)}
                  disabled={reconciling}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Reconcile ({selectedEntries.length})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReconcile(false)}
                  disabled={reconciling}
                >
                  Unreconcile
                </Button>
              </div>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedEntries.length === ledgerEntries.length && ledgerEntries.length > 0}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Entry #</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No ledger entries</p>
                        <p className="text-muted-foreground">Entries are created automatically from events</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    ledgerEntries.map(entry => (
                      <TableRow key={entry.id} className={entry.reconciled ? 'bg-green-50/50' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selectedEntries.includes(entry.id)}
                            onCheckedChange={() => toggleEntry(entry.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{entry.entryNumber}</TableCell>
                        <TableCell className="font-medium">{entry.project?.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.accountCode}</Badge>
                          <span className="ml-2 text-sm">{entry.accountName}</span>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{entry.description}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          {entry.entryType === 'Debit' ? formatCurrency(entry.amount) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {entry.entryType === 'Credit' ? formatCurrency(entry.amount) : '-'}
                        </TableCell>
                        <TableCell>
                          {entry.reconciled ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />Reconciled
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(entry.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <div className="flex gap-4 mb-4">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" /> Event Spine
              </CardTitle>
              <CardDescription>
                Immutable audit trail of all project events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No events recorded</p>
                  <p className="text-muted-foreground">Events are emitted when milestones complete or draws are processed</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map(event => (
                    <div key={event.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50">
                      <div className="flex-shrink-0 mt-1">
                        {getEventIcon(event.eventType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{event.eventType}</span>
                          <Badge variant="outline" className="text-xs">
                            {event.project?.name}
                          </Badge>
                          {event.processed ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">Processed</Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800 text-xs">Pending</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(event.occurredAt)}
                          {event.processedAt && ` • Processed ${formatDate(event.processedAt)}`}
                        </p>
                        <div className="mt-2 p-2 bg-muted rounded text-xs font-mono overflow-x-auto">
                          {JSON.stringify(event.data, null, 2).slice(0, 200)}...
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground">Confidence</span>
                        <p className="font-medium">{(event.confidence * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
