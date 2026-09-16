/**
 * Paycheck calculator utilities for DynamicBudget.
 *
 * Converts monthly budget amounts to per-paycheck allocations based on
 * the user's selected pay frequency.
 */

import type { BudgetBreakdown, BudgetInputs, PayFrequency } from '@/types/budget';

/** Number of paychecks per year for each frequency. */
export const PAYCHECKS_PER_YEAR: Record<PayFrequency, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

/** Human-readable label for each pay frequency. */
export const PAY_FREQUENCY_LABELS: Record<PayFrequency, string> = {
  weekly: 'Weekly (52×/yr)',
  biweekly: 'Bi-weekly (26×/yr)',
  semimonthly: 'Semi-monthly (24×/yr)',
  monthly: 'Monthly (12×/yr)',
};

/** Short label used in the dashboard card header. */
export const PAY_FREQUENCY_SHORT_LABELS: Record<PayFrequency, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  semimonthly: 'Semi-monthly',
  monthly: 'Monthly',
};

/**
 * Returns the multiplier to convert a monthly amount to a per-paycheck amount.
 * monthly × multiplier = per-paycheck
 */
export function monthlyToPaycheckMultiplier(frequency: PayFrequency): number {
  return 12 / PAYCHECKS_PER_YEAR[frequency];
}

/** Convert a monthly dollar amount to a per-paycheck amount. */
export function toPerPaycheck(monthlyAmount: number, frequency: PayFrequency): number {
  return monthlyAmount * monthlyToPaycheckMultiplier(frequency);
}

export interface PaycheckLineItem {
  label: string;
  perPaycheck: number;
  monthly: number;
}

export interface PaycheckBreakdown {
  frequency: PayFrequency;
  paychecksPerYear: number;
  /** Gross pay before any deductions */
  grossPerPaycheck: number;
  /** Pre-tax deductions (401k traditional, Traditional IRA, HSA) */
  preTaxDeductions: PaycheckLineItem[];
  /** Federal + state + FICA taxes */
  taxes: PaycheckLineItem[];
  /** After-tax deductions (Roth 401k) */
  afterTaxRetirement: PaycheckLineItem[];
  /** Employer 401k match (informational, not taken from paycheck) */
  employerMatch: PaycheckLineItem | null;
  /** Estimated net (take-home) per paycheck */
  netPerPaycheck: number;
  /** Budget allocation lines showing how net pay is spent */
  allocations: PaycheckLineItem[];
  /** Remaining buffer after all allocations */
  bufferPerPaycheck: number;
}

/**
 * Build a full per-paycheck breakdown from budget inputs and calculated breakdown.
 */
export function calculatePaycheckBreakdown(
  inputs: BudgetInputs,
  breakdown: BudgetBreakdown,
): PaycheckBreakdown {
  const frequency = inputs.payFrequency;
  const multiplier = monthlyToPaycheckMultiplier(frequency);
  const paychecksPerYear = PAYCHECKS_PER_YEAR[frequency];

  const grossMonthly = breakdown.grossMonthly;
  const grossPerPaycheck = grossMonthly * multiplier;

  // Pre-tax deductions
  const preTaxDeductions: PaycheckLineItem[] = [];

  const monthly401k = breakdown.retirement.monthly401k;
  const isTraditional401k = !inputs.is401kRoth;
  if (monthly401k > 0 && isTraditional401k) {
    preTaxDeductions.push({
      label: '401(k) Traditional',
      perPaycheck: toPerPaycheck(monthly401k, frequency),
      monthly: monthly401k,
    });
  }

  const monthlyHsa = breakdown.retirement.monthlyHSA;
  if (monthlyHsa > 0) {
    preTaxDeductions.push({
      label: 'HSA',
      perPaycheck: toPerPaycheck(monthlyHsa, frequency),
      monthly: monthlyHsa,
    });
  }

  // Taxes (shown per paycheck as withheld amounts)
  const taxes: PaycheckLineItem[] = [];
  const monthlyFederal = breakdown.taxes.federalMonthly;
  if (monthlyFederal > 0) {
    taxes.push({
      label: 'Federal Income Tax',
      perPaycheck: toPerPaycheck(monthlyFederal, frequency),
      monthly: monthlyFederal,
    });
  }
  const monthlyState = breakdown.taxes.stateMonthly;
  if (monthlyState > 0) {
    taxes.push({
      label: 'State Income Tax',
      perPaycheck: toPerPaycheck(monthlyState, frequency),
      monthly: monthlyState,
    });
  }
  const monthlyFica = breakdown.taxes.payrollMonthly;
  if (monthlyFica > 0) {
    taxes.push({
      label: 'FICA (Social Security + Medicare)',
      perPaycheck: toPerPaycheck(monthlyFica, frequency),
      monthly: monthlyFica,
    });
  }

  // IRA contributions (Traditional = pre-tax, Roth = after-tax)
  const monthlyIRA = breakdown.retirement.monthlyIRA + breakdown.retirement.monthlyIRACatchUp;
  const iraType = breakdown.retirement.iraType;
  if (monthlyIRA > 0 && iraType === 'traditional') {
    preTaxDeductions.push({
      label: 'IRA (Traditional)',
      perPaycheck: toPerPaycheck(monthlyIRA, frequency),
      monthly: monthlyIRA,
    });
  }

  // After-tax retirement (Roth 401k, Roth IRA)
  const afterTaxRetirement: PaycheckLineItem[] = [];
  if (monthly401k > 0 && !isTraditional401k) {
    afterTaxRetirement.push({
      label: '401(k) Roth',
      perPaycheck: toPerPaycheck(monthly401k, frequency),
      monthly: monthly401k,
    });
  }
  if (monthlyIRA > 0 && iraType === 'roth') {
    afterTaxRetirement.push({
      label: 'IRA (Roth)',
      perPaycheck: toPerPaycheck(monthlyIRA, frequency),
      monthly: monthlyIRA,
    });
  }

  // Employer match (informational)
  const monthlyEmployerMatch = breakdown.retirement.monthlyEmployerMatch;
  const employerMatch: PaycheckLineItem | null =
    monthlyEmployerMatch > 0
      ? {
          label: 'Employer Match',
          perPaycheck: toPerPaycheck(monthlyEmployerMatch, frequency),
          monthly: monthlyEmployerMatch,
        }
      : null;

  // breakdown.netMonthlyIncome is already net of all taxes, Traditional 401k pre-tax deductions,
  // Roth 401k after-tax deductions, HSA, and IRA (see taxCalculations.ts calculateNetMonthlyIncome).
  // No further deductions are needed here.
  const netPerPaycheck = breakdown.netMonthlyIncome * multiplier;

  // Budget allocations grouped by category
  const allocations: PaycheckLineItem[] = [
    { label: 'Housing', perPaycheck: toPerPaycheck(breakdown.totalHousing, frequency), monthly: breakdown.totalHousing },
    { label: 'Utilities', perPaycheck: toPerPaycheck(breakdown.totalUtilities, frequency), monthly: breakdown.totalUtilities },
    { label: 'Transportation', perPaycheck: toPerPaycheck(breakdown.totalTransportation, frequency), monthly: breakdown.totalTransportation },
    { label: 'Groceries & Food', perPaycheck: toPerPaycheck(breakdown.totalGroceriesFood, frequency), monthly: breakdown.totalGroceriesFood },
    { label: 'Health & Insurance', perPaycheck: toPerPaycheck(breakdown.totalHealth, frequency), monthly: breakdown.totalHealth },
    ...(breakdown.totalPets > 0
      ? [{ label: 'Pets', perPaycheck: toPerPaycheck(breakdown.totalPets, frequency), monthly: breakdown.totalPets }]
      : []),
    { label: 'Lifestyle', perPaycheck: toPerPaycheck(breakdown.totalLifestyle, frequency), monthly: breakdown.totalLifestyle },
    { label: 'Savings & Investments', perPaycheck: toPerPaycheck(breakdown.totalSavings + breakdown.totalInvestments, frequency), monthly: breakdown.totalSavings + breakdown.totalInvestments },
    ...(breakdown.totalDebtPayoff > 0
      ? [{ label: 'Debt Payoff', perPaycheck: toPerPaycheck(breakdown.totalDebtPayoff, frequency), monthly: breakdown.totalDebtPayoff }]
      : []),
  ].filter((item) => item.monthly > 0);

  const bufferPerPaycheck = breakdown.remainingMonthlyBuffer * multiplier;

  return {
    frequency,
    paychecksPerYear,
    grossPerPaycheck,
    preTaxDeductions,
    taxes,
    afterTaxRetirement,
    employerMatch,
    netPerPaycheck,
    allocations,
    bufferPerPaycheck,
  };
}
