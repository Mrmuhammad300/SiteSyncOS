'use client';

import { useState } from 'react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Progress } from './progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from './dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Checkbox } from './checkbox';
import { Label } from './label';
import { Input } from './input';
import { Textarea } from './textarea';
import {
  FileText,
  Download,
  Mail,
  Loader2,
  FileSpreadsheet,
  Presentation,
  Building2,
  BarChart3,
  Shield,
  DollarSign,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

export interface ReportConfig {
  type: 'executive_summary' | 'detailed_progress' | 'financial' | 'compliance' | 'risk_assessment' | 'custom';
  style: 'institutional' | 'internal' | 'client_facing' | 'board_presentation';
  format: 'pdf' | 'excel' | 'word' | 'powerpoint';
  sections: string[];
  dateRange?: { start: Date; end: Date };
  includeCharts: boolean;
  includePhotos: boolean;
  includeFinancials: boolean;
  recipientEmail?: string;
  customTitle?: string;
  customNotes?: string;
}

export interface ReportGeneratorProps {
  entityType: 'project' | 'portfolio' | 'property' | 'draw_request' | 'rfi' | 'submittal' | 'daily_report';
  entityId?: string;
  entityName?: string;
  onReportGenerated?: (reportUrl: string) => void;
  buttonVariant?: 'default' | 'outline' | 'secondary';
  buttonSize?: 'default' | 'sm' | 'lg';
  buttonText?: string;
}

const REPORT_TYPES = [
  { id: 'executive_summary', name: 'Executive Summary', icon: Presentation, description: 'High-level overview for leadership' },
  { id: 'detailed_progress', name: 'Detailed Progress Report', icon: BarChart3, description: 'Comprehensive project status' },
  { id: 'financial', name: 'Financial Report', icon: DollarSign, description: 'Budget, costs, and forecasts' },
  { id: 'compliance', name: 'Compliance Report', icon: Shield, description: 'Regulatory and audit documentation' },
  { id: 'risk_assessment', name: 'Risk Assessment', icon: TrendingUp, description: 'Risk analysis and mitigation' },
  { id: 'custom', name: 'Custom Report', icon: FileText, description: 'Build your own report' },
];

const REPORT_STYLES = [
  { id: 'institutional', name: 'Institutional Grade', description: 'Formal, comprehensive, suitable for lenders/investors' },
  { id: 'internal', name: 'Internal Review', description: 'Detailed operational focus for team use' },
  { id: 'client_facing', name: 'Client Facing', description: 'Professional, clear, suitable for clients' },
  { id: 'board_presentation', name: 'Board Presentation', description: 'Strategic summary for board meetings' },
];

const REPORT_FORMATS = [
  { id: 'pdf', name: 'PDF', icon: FileText },
  { id: 'excel', name: 'Excel', icon: FileSpreadsheet },
  { id: 'word', name: 'Word', icon: FileText },
  { id: 'powerpoint', name: 'PowerPoint', icon: Presentation },
];

const SECTION_OPTIONS: Record<string, { id: string; name: string; default: boolean }[]> = {
  project: [
    { id: 'overview', name: 'Project Overview', default: true },
    { id: 'timeline', name: 'Timeline & Milestones', default: true },
    { id: 'budget', name: 'Budget Summary', default: true },
    { id: 'progress', name: 'Progress Metrics', default: true },
    { id: 'issues', name: 'Issues & Risks', default: true },
    { id: 'rfis', name: 'RFI Summary', default: false },
    { id: 'submittals', name: 'Submittal Status', default: false },
    { id: 'change_orders', name: 'Change Orders', default: false },
    { id: 'punch_list', name: 'Punch List', default: false },
    { id: 'photos', name: 'Progress Photos', default: false },
    { id: 'safety', name: 'Safety Records', default: false },
    { id: 'team', name: 'Team & Resources', default: false },
  ],
  portfolio: [
    { id: 'overview', name: 'Portfolio Overview', default: true },
    { id: 'performance', name: 'Performance Metrics', default: true },
    { id: 'financials', name: 'Financial Summary', default: true },
    { id: 'projects', name: 'Project Status Summary', default: true },
    { id: 'risks', name: 'Portfolio Risks', default: true },
    { id: 'forecasts', name: 'Cash Flow Forecasts', default: false },
    { id: 'comparisons', name: 'Project Comparisons', default: false },
  ],
  draw_request: [
    { id: 'summary', name: 'Draw Summary', default: true },
    { id: 'line_items', name: 'Line Item Details', default: true },
    { id: 'backup', name: 'Supporting Documentation', default: true },
    { id: 'compliance', name: 'Compliance Checklist', default: true },
    { id: 'lien_waivers', name: 'Lien Waivers', default: false },
    { id: 'inspections', name: 'Inspection Reports', default: false },
  ],
  property: [
    { id: 'overview', name: 'Property Overview', default: true },
    { id: 'financials', name: 'Financial Performance', default: true },
    { id: 'tenants', name: 'Tenant Summary', default: false },
    { id: 'maintenance', name: 'Maintenance History', default: false },
    { id: 'valuations', name: 'Valuation Analysis', default: false },
  ],
  rfi: [
    { id: 'summary', name: 'RFI Summary', default: true },
    { id: 'details', name: 'Question & Response', default: true },
    { id: 'timeline', name: 'Response Timeline', default: true },
    { id: 'attachments', name: 'Attachments', default: false },
  ],
  submittal: [
    { id: 'summary', name: 'Submittal Summary', default: true },
    { id: 'review_history', name: 'Review History', default: true },
    { id: 'documents', name: 'Submitted Documents', default: true },
    { id: 'comments', name: 'Review Comments', default: false },
  ],
  daily_report: [
    { id: 'summary', name: 'Daily Summary', default: true },
    { id: 'weather', name: 'Weather Conditions', default: true },
    { id: 'labor', name: 'Labor Report', default: true },
    { id: 'equipment', name: 'Equipment Usage', default: false },
    { id: 'materials', name: 'Materials Delivered', default: false },
    { id: 'safety', name: 'Safety Observations', default: false },
    { id: 'photos', name: 'Site Photos', default: false },
  ],
};

export function ReportGenerator({
  entityType,
  entityId,
  entityName,
  onReportGenerated,
  buttonVariant = 'outline',
  buttonSize = 'default',
  buttonText = 'Generate Report',
}: ReportGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('type');
  
  const sectionOptions = SECTION_OPTIONS[entityType] || SECTION_OPTIONS.project;
  
  const [config, setConfig] = useState<ReportConfig>({
    type: 'executive_summary',
    style: 'institutional',
    format: 'pdf',
    sections: sectionOptions.filter(s => s.default).map(s => s.id),
    includeCharts: true,
    includePhotos: false,
    includeFinancials: true,
  });

  const toggleSection = (sectionId: string) => {
    setConfig(prev => ({
      ...prev,
      sections: prev.sections.includes(sectionId)
        ? prev.sections.filter(s => s !== sectionId)
        : [...prev.sections, sectionId],
    }));
  };

  const generateReport = async () => {
    setGenerating(true);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 90));
      }, 500);

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          entityName,
          config,
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const { reportUrl, reportId } = await response.json();
      setProgress(100);

      toast.success('Report generated successfully!');
      onReportGenerated?.(reportUrl);

      // If email recipient specified, send email
      if (config.recipientEmail) {
        await fetch('/api/reports/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportId,
            recipientEmail: config.recipientEmail,
          }),
        });
        toast.success(`Report sent to ${config.recipientEmail}`);
      }

      // Download the report
      window.open(reportUrl, '_blank');
      
      setTimeout(() => {
        setOpen(false);
        setProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Report generation error:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize}>
          <FileText className="w-4 h-4 mr-2" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Generate Report
          </DialogTitle>
          <DialogDescription>
            Create an institutional-grade report for {entityName || entityType.replace('_', ' ')}
          </DialogDescription>
        </DialogHeader>

        {generating ? (
          <div className="py-8">
            <div className="text-center mb-4">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-lg font-medium">Generating Report...</p>
              <p className="text-sm text-muted-foreground">Compiling data and creating document</p>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-center text-sm text-muted-foreground mt-2">{progress}% complete</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="type">Report Type</TabsTrigger>
              <TabsTrigger value="style">Style</TabsTrigger>
              <TabsTrigger value="sections">Sections</TabsTrigger>
              <TabsTrigger value="options">Options</TabsTrigger>
            </TabsList>

            {/* Report Type Tab */}
            <TabsContent value="type" className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {REPORT_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <Card
                      key={type.id}
                      className={`cursor-pointer transition-colors ${
                        config.type === type.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setConfig(prev => ({ ...prev, type: type.id as ReportConfig['type'] }))}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${config.type === type.id ? 'bg-primary/10' : 'bg-muted'}`}>
                            <Icon className={`w-5 h-5 ${config.type === type.id ? 'text-primary' : ''}`} />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{type.name}</p>
                            <p className="text-xs text-muted-foreground">{type.description}</p>
                          </div>
                          {config.type === type.id && (
                            <CheckCircle className="w-4 h-4 text-primary ml-auto" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Style Tab */}
            <TabsContent value="style" className="space-y-4">
              <div className="space-y-3">
                {REPORT_STYLES.map(style => (
                  <Card
                    key={style.id}
                    className={`cursor-pointer transition-colors ${
                      config.style === style.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setConfig(prev => ({ ...prev, style: style.id as ReportConfig['style'] }))}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{style.name}</p>
                        <p className="text-sm text-muted-foreground">{style.description}</p>
                      </div>
                      {config.style === style.id && (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="pt-4">
                <Label className="text-sm font-medium">Output Format</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {REPORT_FORMATS.map(format => {
                    const Icon = format.icon;
                    return (
                      <Button
                        key={format.id}
                        variant={config.format === format.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setConfig(prev => ({ ...prev, format: format.id as ReportConfig['format'] }))}
                      >
                        <Icon className="w-4 h-4 mr-1" />
                        {format.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* Sections Tab */}
            <TabsContent value="sections" className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {sectionOptions.map(section => (
                  <div
                    key={section.id}
                    className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50"
                  >
                    <Checkbox
                      id={section.id}
                      checked={config.sections.includes(section.id)}
                      onCheckedChange={() => toggleSection(section.id)}
                    />
                    <Label htmlFor={section.id} className="text-sm cursor-pointer">
                      {section.name}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfig(prev => ({ ...prev, sections: sectionOptions.map(s => s.id) }))}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfig(prev => ({ ...prev, sections: sectionOptions.filter(s => s.default).map(s => s.id) }))}
                >
                  Reset to Default
                </Button>
              </div>
            </TabsContent>

            {/* Options Tab */}
            <TabsContent value="options" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="charts"
                    checked={config.includeCharts}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeCharts: !!checked }))}
                  />
                  <Label htmlFor="charts">Include Charts & Visualizations</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="photos"
                    checked={config.includePhotos}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includePhotos: !!checked }))}
                  />
                  <Label htmlFor="photos">Include Progress Photos</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="financials"
                    checked={config.includeFinancials}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeFinancials: !!checked }))}
                  />
                  <Label htmlFor="financials">Include Financial Data</Label>
                </div>
              </div>

              <div className="pt-4 space-y-4">
                <div>
                  <Label htmlFor="title">Custom Report Title (optional)</Label>
                  <Input
                    id="title"
                    placeholder="Leave blank for default title"
                    value={config.customTitle || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, customTitle: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Additional Notes (optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Notes to include in the report..."
                    value={config.customNotes || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, customNotes: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Report To (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="recipient@example.com"
                    value={config.recipientEmail || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, recipientEmail: e.target.value }))}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {!generating && (
          <DialogFooter className="gap-2">
            <div className="flex-1">
              <Badge variant="outline" className="mr-2">
                {REPORT_TYPES.find(t => t.id === config.type)?.name}
              </Badge>
              <Badge variant="outline" className="mr-2">
                {config.format.toUpperCase()}
              </Badge>
              <Badge variant="outline">
                {config.sections.length} sections
              </Badge>
            </div>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={generateReport} disabled={config.sections.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ReportGenerator;
