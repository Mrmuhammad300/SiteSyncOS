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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Calculator, TrendingUp, DollarSign, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/roi-calculator';
import { toast } from 'react-hot-toast';

export default function ROICalculatorPage() {
  const router = useRouter();
  const { data: session, status } = useSession() || {};
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  
  // Form inputs
  const [formData, setFormData] = useState({
    projectId: '',
    totalProjectCost: '1000000',
    projectDurationMonths: '12',
    numberOfDrawingRevisions: '10',
    avgRFIChangeOrderVolume: '15',
    avgLaborCostPerHour: '75',
    teamSize: '15',
    reworkPercentage: '4',
    takeoffErrorRate: '3',
    scheduleSlippageWeeks: '2',
    claimsDisputesProbability: 'Medium' as 'Low' | 'Medium' | 'High',
    calculationName: '',
    notes: ''
  });
  
  // Results
  const [results, setResults] = useState<any>(null);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);
  
  useEffect(() => {
    if (session) {
      fetchProjects();
    }
  }, [session]);
  
  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/roi-calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          projectId: formData.projectId || null
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to calculate ROI');
      }
      
      const data = await response.json();
      setResults(data.breakdown);
      setShowResults(true);
      toast.success('ROI calculation completed!');
    } catch (error: any) {
      console.error('Error calculating ROI:', error);
      toast.error(error.message || 'Failed to calculate ROI');
    } finally {
      setLoading(false);
    }
  };
  
  const updateFormField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  if (status === 'loading') {
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
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ROI Calculator</h1>
              <p className="text-gray-600">Calculate potential savings with STRATOS</p>
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="calculator" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="calculator">Calculate ROI</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calculator">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Form */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Inputs</CardTitle>
                    <CardDescription>
                      Enter your project details to calculate potential ROI
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Project Selection */}
                      <div className="space-y-2">
                        <Label htmlFor="projectId">Link to Project (Optional)</Label>
                        <Select
                          value={formData.projectId}
                          onValueChange={(value) => updateFormField('projectId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a project" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No project</SelectItem>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Basic Project Details */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="totalProjectCost">Total Project Cost ($)</Label>
                          <Input
                            id="totalProjectCost"
                            type="number"
                            value={formData.totalProjectCost}
                            onChange={(e) => updateFormField('totalProjectCost', e.target.value)}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="projectDurationMonths">Duration (months)</Label>
                          <Input
                            id="projectDurationMonths"
                            type="number"
                            value={formData.projectDurationMonths}
                            onChange={(e) => updateFormField('projectDurationMonths', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="numberOfDrawingRevisions">Drawing Revisions</Label>
                          <Input
                            id="numberOfDrawingRevisions"
                            type="number"
                            value={formData.numberOfDrawingRevisions}
                            onChange={(e) => updateFormField('numberOfDrawingRevisions', e.target.value)}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="avgRFIChangeOrderVolume">RFI/CO Volume (%)</Label>
                          <Input
                            id="avgRFIChangeOrderVolume"
                            type="number"
                            step="0.1"
                            value={formData.avgRFIChangeOrderVolume}
                            onChange={(e) => updateFormField('avgRFIChangeOrderVolume', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="avgLaborCostPerHour">Labor Cost ($/hr)</Label>
                          <Input
                            id="avgLaborCostPerHour"
                            type="number"
                            step="0.01"
                            value={formData.avgLaborCostPerHour}
                            onChange={(e) => updateFormField('avgLaborCostPerHour', e.target.value)}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="teamSize">Team Size</Label>
                          <Input
                            id="teamSize"
                            type="number"
                            value={formData.teamSize}
                            onChange={(e) => updateFormField('teamSize', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      
                      {/* Risk Factors */}
                      <div className="pt-4 border-t">
                        <h3 className="font-medium text-gray-900 mb-4">Operational Risk Factors</h3>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="reworkPercentage">
                              Rework Rate: {formData.reworkPercentage}%
                            </Label>
                            <Slider
                              id="reworkPercentage"
                              min={1}
                              max={7}
                              step={0.5}
                              value={[parseFloat(formData.reworkPercentage)]}
                              onValueChange={(value) => updateFormField('reworkPercentage', value[0].toString())}
                              className="w-full"
                            />
                            <p className="text-xs text-gray-500">Typical range: 1-7%</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="takeoffErrorRate">
                              Takeoff Error Rate: {formData.takeoffErrorRate}%
                            </Label>
                            <Slider
                              id="takeoffErrorRate"
                              min={1}
                              max={5}
                              step={0.5}
                              value={[parseFloat(formData.takeoffErrorRate)]}
                              onValueChange={(value) => updateFormField('takeoffErrorRate', value[0].toString())}
                              className="w-full"
                            />
                            <p className="text-xs text-gray-500">Typical range: 1-5%</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="scheduleSlippageWeeks">
                              Schedule Slippage: {formData.scheduleSlippageWeeks} weeks
                            </Label>
                            <Slider
                              id="scheduleSlippageWeeks"
                              min={0}
                              max={6}
                              step={1}
                              value={[parseInt(formData.scheduleSlippageWeeks)]}
                              onValueChange={(value) => updateFormField('scheduleSlippageWeeks', value[0].toString())}
                              className="w-full"
                            />
                            <p className="text-xs text-gray-500">Typical range: 0-6 weeks</p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="claimsDisputesProbability">Claims/Disputes Risk</Label>
                            <Select
                              value={formData.claimsDisputesProbability}
                              onValueChange={(value: any) => updateFormField('claimsDisputesProbability', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Low">Low</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                      
                      {/* Optional Fields */}
                      <div className="pt-4 border-t">
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="calculationName">Calculation Name (Optional)</Label>
                            <Input
                              id="calculationName"
                              placeholder="e.g., Q1 2026 Project Analysis"
                              value={formData.calculationName}
                              onChange={(e) => updateFormField('calculationName', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      >
                        {loading ? 'Calculating...' : 'Calculate ROI'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
              
              {/* Results Panel */}
              <div className="space-y-6">
                {showResults && results ? (
                  <>
                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                          <span>Total ROI</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center">
                          <div className="text-5xl font-bold text-green-600 mb-2">
                            {formatCurrency(results.totalSavings)}
                          </div>
                          <div className="text-2xl font-semibold text-green-700">
                            {formatPercentage(results.roiPercentage, 2)} ROI
                          </div>
                          <p className="text-sm text-gray-600 mt-2">
                            Estimated savings with STRATOS
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Savings Breakdown */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Savings Breakdown</CardTitle>
                        <CardDescription>Detailed analysis of cost savings</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Rework Reduction */}
                        <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-900">Rework Reduction</span>
                              <span className="font-bold text-blue-600">
                                {formatCurrency(results.reworkCostSavings)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">
                              {formatPercentage(results.reworkReductionPercent * 100, 0)} reduction through version control & validation
                            </p>
                          </div>
                        </div>
                        
                        {/* Takeoff Efficiency */}
                        <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
                          <Clock className="w-5 h-5 text-purple-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-900">Takeoff Efficiency</span>
                              <span className="font-bold text-purple-600">
                                {formatCurrency(results.takeoffEfficiencySavings)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">
                              {Math.round(results.takeoffHoursSaved)} hours saved through digital tools
                            </p>
                          </div>
                        </div>
                        
                        {/* Schedule Compression */}
                        <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
                          <TrendingUp className="w-5 h-5 text-orange-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-900">Schedule Savings</span>
                              <span className="font-bold text-orange-600">
                                {formatCurrency(results.scheduleCompressionSavings)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">
                              {results.scheduleWeeksSaved} weeks saved on project timeline
                            </p>
                          </div>
                        </div>
                        
                        {/* Claims Risk Avoidance */}
                        <div className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-900">Risk Avoidance</span>
                              <span className="font-bold text-red-600">
                                {formatCurrency(results.claimsRiskAvoidanceSavings)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">
                              {formatPercentage(results.claimsRiskReduction * 100, 0)} claims risk reduction
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Key Insights */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Key Insights</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-start space-x-2">
                          <DollarSign className="w-4 h-4 text-green-600 mt-0.5" />
                          <p className="text-sm text-gray-700">
                            STRATOS can save up to <strong>{formatPercentage(results.roiPercentage, 1)}</strong> of your project cost
                          </p>
                        </div>
                        <div className="flex items-start space-x-2">
                          <Clock className="w-4 h-4 text-blue-600 mt-0.5" />
                          <p className="text-sm text-gray-700">
                            Reduce project timeline by <strong>{results.scheduleWeeksSaved} weeks</strong> on average
                          </p>
                        </div>
                        <div className="flex items-start space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-purple-600 mt-0.5" />
                          <p className="text-sm text-gray-700">
                            Save <strong>{Math.round(results.takeoffHoursSaved)} hours</strong> on takeoffs and estimating
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <Calculator className="w-16 h-16 text-gray-300 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Calculate Your ROI
                      </h3>
                      <p className="text-sm text-gray-600 max-w-sm">
                        Fill in your project details to see how much you can save with STRATOS platform
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Calculation History</CardTitle>
                <CardDescription>View your previous ROI calculations</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Feature coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
