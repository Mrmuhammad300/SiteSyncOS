/**
 * ROI Calculator Utility Functions
 * Implements SiteSync OS ROI calculation logic based on industry-standard metrics
 */

export interface ROIInputs {
  // Project Inputs
  totalProjectCost: number;
  projectDurationMonths: number;
  numberOfDrawingRevisions: number;
  avgRFIChangeOrderVolume: number; // As percentage (e.g., 0.15 for 15%)
  avgLaborCostPerHour: number;
  teamSize: number;

  // Operational Risk Inputs
  reworkPercentage: number; // 1-7%
  takeoffErrorRate: number; // 1-5%
  scheduleSlippageWeeks: number; // 0-6
  claimsDisputesProbability: 'Low' | 'Medium' | 'High';
}

export interface ROISavings {
  reworkCostSavings: number;
  takeoffEfficiencySavings: number;
  scheduleCompressionSavings: number;
  claimsRiskAvoidanceSavings: number;
  totalSavings: number;
  roiPercentage: number;
}

export interface ROIBreakdown extends ROISavings {
  // Detailed calculations for transparency
  reworkCost: number;
  reworkReductionPercent: number;
  takeoffHoursSaved: number;
  scheduleWeeksSaved: number;
  claimsRiskReduction: number;
  expectedClaimsCost: number;
}

/**
 * Calculate rework cost savings
 * Industry baseline: Rework = 4–6% of construction cost
 * SiteSync OS reduces this by 25–40% via version control, validation, and field photo alignment
 */
export function calculateReworkSavings(
  totalProjectCost: number,
  reworkPercentage: number
): { savings: number; reworkCost: number; reductionPercent: number } {
  // Convert percentage to decimal if needed
  const reworkRate = reworkPercentage > 1 ? reworkPercentage / 100 : reworkPercentage;
  
  const reworkCost = totalProjectCost * reworkRate;
  
  // SiteSync OS reduces rework by 25-40%, using conservative 30% average
  const reductionPercent = 0.30;
  const savings = reworkCost * reductionPercent;
  
  return {
    savings,
    reworkCost,
    reductionPercent
  };
}

/**
 * Calculate takeoff & estimating efficiency savings
 * Assumes 30-50% time reduction on takeoffs with digital tools
 */
export function calculateTakeoffSavings(
  numberOfDrawingRevisions: number,
  avgLaborCostPerHour: number,
  teamSize: number
): { savings: number; hoursSaved: number } {
  // Average hours per takeoff (industry standard: 8-16 hours depending on complexity)
  const avgHoursPerTakeoff = 12;
  
  // Total hours spent on takeoffs
  const totalTakeoffHours = numberOfDrawingRevisions * avgHoursPerTakeoff;
  
  // SiteSync OS saves 30-50% of time, using 40% average
  const timeSavingsPercent = 0.40;
  const hoursSaved = totalTakeoffHours * timeSavingsPercent;
  
  // Calculate labor savings
  const savings = hoursSaved * avgLaborCostPerHour;
  
  return {
    savings,
    hoursSaved
  };
}

/**
 * Calculate schedule compression savings
 * Every week saved ≈ 0.5–1% of project cost (carrying + overhead)
 * SiteSync OS can save 1-3 weeks on average projects
 */
export function calculateScheduleSavings(
  totalProjectCost: number,
  scheduleSlippageWeeks: number,
  projectDurationMonths: number
): { savings: number; weeksSaved: number } {
  // Estimate weeks that can be saved with SiteSync OS
  // If there's slippage, we can prevent it
  // If no slippage, we can still accelerate by 1-2 weeks typically
  const baseWeeksSaved = Math.max(1, Math.min(3, scheduleSlippageWeeks));
  
  // Conservative estimate: each week saved = 0.75% of project cost
  const costPerWeekPercent = 0.0075;
  const savings = totalProjectCost * costPerWeekPercent * baseWeeksSaved;
  
  return {
    savings,
    weeksSaved: baseWeeksSaved
  };
}

/**
 * Calculate claims & change order risk avoidance savings
 * SiteSync OS reduces risk by 20-40% through better documentation and communication
 */
export function calculateClaimsRiskSavings(
  totalProjectCost: number,
  claimsDisputesProbability: 'Low' | 'Medium' | 'High',
  avgRFIChangeOrderVolume: number
): { savings: number; expectedClaimsCost: number; riskReduction: number } {
  // Risk probability mapping
  const riskProbabilityMap = {
    Low: 0.05,     // 5% chance
    Medium: 0.15,  // 15% chance
    High: 0.30     // 30% chance
  };
  
  const riskProbability = riskProbabilityMap[claimsDisputesProbability];
  
  // Claims typically cost 2-5% of project cost when they occur
  // Factor in RFI/CO volume as indicator
  const avgRFIRate = avgRFIChangeOrderVolume > 1 ? avgRFIChangeOrderVolume / 100 : avgRFIChangeOrderVolume;
  const claimsCostRate = Math.min(0.05, 0.02 + (avgRFIRate * 0.5));
  
  const expectedClaimsCost = totalProjectCost * claimsCostRate * riskProbability;
  
  // SiteSync OS reduces this risk by 20-40%, using 30% average
  const riskReduction = 0.30;
  const savings = expectedClaimsCost * riskReduction;
  
  return {
    savings,
    expectedClaimsCost,
    riskReduction
  };
}

/**
 * Calculate comprehensive ROI for SiteSync OS platform
 */
export function calculateROI(inputs: ROIInputs): ROIBreakdown {
  // 1. Rework Reduction
  const reworkCalc = calculateReworkSavings(
    inputs.totalProjectCost,
    inputs.reworkPercentage
  );
  
  // 2. Takeoff & Estimating Efficiency
  const takeoffCalc = calculateTakeoffSavings(
    inputs.numberOfDrawingRevisions,
    inputs.avgLaborCostPerHour,
    inputs.teamSize
  );
  
  // 3. Schedule Compression
  const scheduleCalc = calculateScheduleSavings(
    inputs.totalProjectCost,
    inputs.scheduleSlippageWeeks,
    inputs.projectDurationMonths
  );
  
  // 4. Claims & Risk Avoidance
  const claimsCalc = calculateClaimsRiskSavings(
    inputs.totalProjectCost,
    inputs.claimsDisputesProbability,
    inputs.avgRFIChangeOrderVolume
  );
  
  // Total Savings
  const totalSavings = 
    reworkCalc.savings +
    takeoffCalc.savings +
    scheduleCalc.savings +
    claimsCalc.savings;
  
  // ROI Percentage (savings relative to project cost)
  const roiPercentage = (totalSavings / inputs.totalProjectCost) * 100;
  
  return {
    // Individual savings
    reworkCostSavings: reworkCalc.savings,
    takeoffEfficiencySavings: takeoffCalc.savings,
    scheduleCompressionSavings: scheduleCalc.savings,
    claimsRiskAvoidanceSavings: claimsCalc.savings,
    
    // Totals
    totalSavings,
    roiPercentage,
    
    // Detailed breakdown
    reworkCost: reworkCalc.reworkCost,
    reworkReductionPercent: reworkCalc.reductionPercent,
    takeoffHoursSaved: takeoffCalc.hoursSaved,
    scheduleWeeksSaved: scheduleCalc.weeksSaved,
    claimsRiskReduction: claimsCalc.riskReduction,
    expectedClaimsCost: claimsCalc.expectedClaimsCost
  };
}

/**
 * Format currency values for display
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

/**
 * Format percentage values for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}
