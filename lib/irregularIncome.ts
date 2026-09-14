/**
 * Irregular income support for DynamicBudget.
 *
 * Models income variability using a simple symmetric range:
 *   P25 = base gross × (1 – variabilityPct / 100)   ← a bad month
 *   P50 = base gross × 1.0                            ← a typical month
 *   P75 = base gross × (1 + variabilityPct / 100)   ← a good month
 *
 * Each scenario is a full calculateBudgetBreakdown result so that taxes,
 * retirement, and net income are all re-computed at the scenario salary.
 */

import type { BudgetInputs, BudgetBreakdown } from '@/types/budget';
import { calculateBudgetBreakdown } from './budgetCalculations';

export interface IncomeScenario {
  /** Human-readable percentile label */
  label: 'P25' | 'P50' | 'P75';
  percentile: 25 | 50 | 75;
  /** Gross monthly income for this scenario */
  grossMonthly: number;
  /** Gross annual income for this scenario */
  grossAnnual: number;
  /** Full breakdown (taxes, net income, buffer, etc.) */
  breakdown: BudgetBreakdown;
}

export interface AtRiskExpense {
  label: string;
  monthlyAmount: number;
  /** True for groceries / utilities / health — non-discretionary */
  isEssential: boolean;
}

export interface IrregularIncomeAnalysis {
  /** Monthly income variability percentage as supplied by user (0–100) */
  variabilityPercent: number;
  /** Base (P50) gross monthly income */
  baseGrossMonthly: number;
  scenarios: IncomeScenario[];
  /**
   * Variable expenses in descending order of size.
   * Populated (and non-empty) when P25 results in a deficit.
   * These are the spending levers the user can pull in a bad month.
   */
  atRiskExpenses: AtRiskExpense[];
  /** Whether P25 scenario produces a deficit */
  isP25OverBudget: boolean;
  /** P25 deficit amount (positive means over budget; 0 if not over budget) */
  p25Deficit: number;
}

/**
 * Build a scaled copy of BudgetInputs with a different annual salary.
 * Bonus income is scaled proportionally; all other fields are unchanged.
 */
function scaleInputsToSalary(inputs: BudgetInputs, newAnnualSalary: number): BudgetInputs {
  const salaryRatio = inputs.annualSalary > 0 ? newAnnualSalary / inputs.annualSalary : 1;
  return {
    ...inputs,
    annualSalary: newAnnualSalary,
    bonusIncome: Math.round(inputs.bonusIncome * salaryRatio),
  };
}

/**
 * Calculate P25 / P50 / P75 income scenarios and identify at-risk expenses.
 *
 * @param inputs          The current BudgetInputs (must have incomeVariabilityPercent set).
 * @param baseBreakdown   Pre-computed breakdown for the current inputs (P50); avoids a
 *                        redundant recalculation when the caller already has it.
 */
export function calculateIrregularIncomeAnalysis(
  inputs: BudgetInputs,
  baseBreakdown: BudgetBreakdown
): IrregularIncomeAnalysis {
  const variabilityPercent = Math.max(0, Math.min(100, inputs.incomeVariabilityPercent ?? 0));
  const baseGrossAnnual = inputs.annualSalary;
  const baseGrossMonthly = baseBreakdown.grossMonthly;

  const p25Annual = baseGrossAnnual * (1 - variabilityPercent / 100);
  const p75Annual = baseGrossAnnual * (1 + variabilityPercent / 100);

  const p25Inputs = scaleInputsToSalary(inputs, p25Annual);
  const p75Inputs = scaleInputsToSalary(inputs, p75Annual);

  const p25Breakdown = calculateBudgetBreakdown(p25Inputs);
  const p75Breakdown = calculateBudgetBreakdown(p75Inputs);

  const scenarios: IncomeScenario[] = [
    {
      label: 'P25',
      percentile: 25,
      grossAnnual: p25Annual,
      grossMonthly: p25Breakdown.grossMonthly,
      breakdown: p25Breakdown,
    },
    {
      label: 'P50',
      percentile: 50,
      grossAnnual: baseGrossAnnual,
      grossMonthly: baseGrossMonthly,
      breakdown: baseBreakdown,
    },
    {
      label: 'P75',
      percentile: 75,
      grossAnnual: p75Annual,
      grossMonthly: p75Breakdown.grossMonthly,
      breakdown: p75Breakdown,
    },
  ];

  const p25Deficit = Math.max(0, -p25Breakdown.remainingMonthlyBuffer);
  const isP25OverBudget = p25Deficit > 0;

  // Identify variable (cuttable) expenses, sorted descending by amount.
  // Only show when P25 is over budget — these are the spending levers.
  const atRiskExpenses: AtRiskExpense[] = isP25OverBudget
    ? buildAtRiskExpenses(inputs)
    : [];

  return {
    variabilityPercent,
    baseGrossMonthly,
    scenarios,
    atRiskExpenses,
    isP25OverBudget,
    p25Deficit,
  };
}

function buildAtRiskExpenses(inputs: BudgetInputs): AtRiskExpense[] {
  const candidates: AtRiskExpense[] = [
    // Variable / discretionary (non-essential)
    { label: 'Dining Out', monthlyAmount: inputs.diningOut, isEssential: false },
    { label: 'Entertainment', monthlyAmount: inputs.funEntertainment, isEssential: false },
    { label: 'Travel', monthlyAmount: inputs.travel, isEssential: false },
    { label: 'Clothes', monthlyAmount: inputs.clothes, isEssential: false },
    { label: 'Personal Spending', monthlyAmount: inputs.personalSpending, isEssential: false },
    { label: 'Gifts', monthlyAmount: inputs.gifts, isEssential: false },
    { label: 'Subscriptions', monthlyAmount: inputs.subscriptions, isEssential: false },
    { label: 'Misc Buffer', monthlyAmount: inputs.miscBuffer, isEssential: false },
    // Semi-essential
    { label: 'Groceries', monthlyAmount: inputs.groceries, isEssential: true },
    { label: 'Gym / Fitness', monthlyAmount: inputs.gymFitness, isEssential: false },
    { label: 'Therapy / Wellness', monthlyAmount: inputs.therapyWellness, isEssential: false },
    // Savings contributions (can be paused in an emergency)
    {
      label: 'House Down Payment Contribution',
      monthlyAmount: inputs.houseDownPaymentContribution,
      isEssential: false,
    },
    {
      label: 'General Cash Savings',
      monthlyAmount: inputs.generalCashSavings,
      isEssential: false,
    },
    {
      label: 'Taxable Investments',
      monthlyAmount: inputs.taxableInvestments,
      isEssential: false,
    },
  ];

  // Include pet-related discretionary costs when pets are enabled
  if (inputs.petsEnabled) {
    candidates.push(
      { label: 'Pet Grooming / Supplies', monthlyAmount: inputs.groomingSupplies, isEssential: false },
      { label: 'Dog Daycare / Boarding', monthlyAmount: inputs.dogDaycare + inputs.boardingSitter, isEssential: false }
    );
  }

  // Filter out zero amounts and sort descending
  return candidates
    .filter((e) => e.monthlyAmount > 0)
    .sort((a, b) => b.monthlyAmount - a.monthlyAmount);
}
