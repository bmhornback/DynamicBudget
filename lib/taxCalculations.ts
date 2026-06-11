/**
 * Tax calculation utilities for MoveMath.
 * These are simplified estimates, NOT exact tax filing calculations.
 * Clearly labeled as estimates throughout the UI.
 */

import type { FilingStatus, StateOfResidence } from '@/types/budget';

// ─── Federal Income Tax (2024 brackets) ────────────────────────────────────

interface TaxBracket {
  rate: number;
  upTo: number; // income ceiling for this bracket (Infinity for top bracket)
}

const FEDERAL_BRACKETS: Record<FilingStatus, TaxBracket[]> = {
  single: [
    { rate: 0.10, upTo: 11600 },
    { rate: 0.12, upTo: 47150 },
    { rate: 0.22, upTo: 100525 },
    { rate: 0.24, upTo: 191950 },
    { rate: 0.32, upTo: 243725 },
    { rate: 0.35, upTo: 609350 },
    { rate: 0.37, upTo: Infinity },
  ],
  married_jointly: [
    { rate: 0.10, upTo: 23200 },
    { rate: 0.12, upTo: 94300 },
    { rate: 0.22, upTo: 201050 },
    { rate: 0.24, upTo: 383900 },
    { rate: 0.32, upTo: 487450 },
    { rate: 0.35, upTo: 731200 },
    { rate: 0.37, upTo: Infinity },
  ],
  head_of_household: [
    { rate: 0.10, upTo: 16550 },
    { rate: 0.12, upTo: 63100 },
    { rate: 0.22, upTo: 100500 },
    { rate: 0.24, upTo: 191950 },
    { rate: 0.32, upTo: 243700 },
    { rate: 0.35, upTo: 609350 },
    { rate: 0.37, upTo: Infinity },
  ],
};

const STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 14600,
  married_jointly: 29200,
  head_of_household: 21900,
};

/**
 * Estimate annual federal income tax using bracket math.
 * Applies standard deduction and treats 401(k) contribution as pre-tax.
 */
export function federalIncomeTaxEstimate(
  grossAnnual: number,
  filingStatus: FilingStatus,
  annual401kContribution: number
): number {
  const deduction = STANDARD_DEDUCTION[filingStatus];
  // 401(k) is pre-tax, so subtract it from taxable income
  const taxableIncome = Math.max(0, grossAnnual - annual401kContribution - deduction);
  const brackets = FEDERAL_BRACKETS[filingStatus];

  let tax = 0;
  let previousCeiling = 0;

  for (const bracket of brackets) {
    if (taxableIncome <= previousCeiling) break;
    const taxableInThisBracket = Math.min(taxableIncome, bracket.upTo) - previousCeiling;
    tax += taxableInThisBracket * bracket.rate;
    previousCeiling = bracket.upTo;
    if (bracket.upTo === Infinity) break;
  }

  return Math.max(0, tax);
}

// ─── State Income Tax ───────────────────────────────────────────────────────

/** California income tax brackets (2024) for single filers */
const CA_BRACKETS_SINGLE: TaxBracket[] = [
  { rate: 0.01,  upTo: 10412 },
  { rate: 0.02,  upTo: 24684 },
  { rate: 0.04,  upTo: 38959 },
  { rate: 0.06,  upTo: 54081 },
  { rate: 0.08,  upTo: 68350 },
  { rate: 0.093, upTo: 349137 },
  { rate: 0.103, upTo: 418961 },
  { rate: 0.113, upTo: 698274 },
  { rate: 0.123, upTo: Infinity },
];

/** California income tax brackets (2024) for MFJ */
const CA_BRACKETS_MFJ: TaxBracket[] = [
  { rate: 0.01,  upTo: 20824 },
  { rate: 0.02,  upTo: 49368 },
  { rate: 0.04,  upTo: 77918 },
  { rate: 0.06,  upTo: 108162 },
  { rate: 0.08,  upTo: 136700 },
  { rate: 0.093, upTo: 698274 },
  { rate: 0.103, upTo: 837922 },
  { rate: 0.113, upTo: 1000000 },
  { rate: 0.123, upTo: Infinity },
];

/** Georgia income tax (2024): flat 5.49% */
const GA_FLAT_RATE = 0.0549;

function applyBrackets(taxableIncome: number, brackets: TaxBracket[]): number {
  let tax = 0;
  let prev = 0;
  for (const bracket of brackets) {
    if (taxableIncome <= prev) break;
    const inBracket = Math.min(taxableIncome, bracket.upTo) - prev;
    tax += inBracket * bracket.rate;
    prev = bracket.upTo;
    if (bracket.upTo === Infinity) break;
  }
  return Math.max(0, tax);
}

/**
 * Estimate annual state income tax.
 * Supports CA, GA, and a no-state-tax option.
 */
export function stateIncomeTaxEstimate(
  grossAnnual: number,
  state: StateOfResidence,
  filingStatus: FilingStatus,
  annual401kContribution: number
): number {
  // 401(k) is also pre-tax for state purposes (simplified)
  const taxableIncome = Math.max(0, grossAnnual - annual401kContribution);

  switch (state) {
    case 'CA': {
      const brackets =
        filingStatus === 'married_jointly' ? CA_BRACKETS_MFJ : CA_BRACKETS_SINGLE;
      // California SDI: 0.9% up to SDI wage base (simplified, applied separately)
      const baseTax = applyBrackets(taxableIncome, brackets);
      // CA mental health surcharge: 1% over $1M — skip for typical use
      return baseTax;
    }
    case 'GA':
      return taxableIncome * GA_FLAT_RATE;
    case 'no_state_tax':
    default:
      return 0;
  }
}

// ─── Payroll Taxes ──────────────────────────────────────────────────────────

/** Social Security wage base (2024) */
const SS_WAGE_BASE = 168600;
const SS_RATE = 0.062;
const MEDICARE_RATE = 0.0145;
/** Additional Medicare tax on earnings over $200k (single) */
const ADDITIONAL_MEDICARE_RATE = 0.009;
const ADDITIONAL_MEDICARE_THRESHOLD_SINGLE = 200000;

/**
 * Estimate annual payroll taxes (employee share of Social Security + Medicare).
 * Note: 401(k) does NOT reduce payroll taxes.
 */
export function payrollTaxEstimate(
  grossAnnual: number,
  filingStatus: FilingStatus
): number {
  const ssTax = Math.min(grossAnnual, SS_WAGE_BASE) * SS_RATE;
  const medicareTax = grossAnnual * MEDICARE_RATE;

  const additionalMedicareThreshold =
    filingStatus === 'married_jointly'
      ? 250000
      : ADDITIONAL_MEDICARE_THRESHOLD_SINGLE;

  const additionalMedicare =
    grossAnnual > additionalMedicareThreshold
      ? (grossAnnual - additionalMedicareThreshold) * ADDITIONAL_MEDICARE_RATE
      : 0;

  return ssTax + medicareTax + additionalMedicare;
}

// ─── Retirement Contribution ────────────────────────────────────────────────

/** 2024 401(k) employee contribution limit */
export const ANNUAL_401K_LIMIT = 24500;
/** 2024 IRA contribution limit */
export const ANNUAL_IRA_LIMIT = 7500;

/**
 * Calculate annual 401(k) employee contribution.
 * If maxOut401k is true, caps at ANNUAL_401K_LIMIT.
 * Otherwise uses contributionPercent of grossAnnual.
 */
export function calculateRetirementContribution(
  grossAnnual: number,
  contributionPercent: number,
  maxOut401k: boolean,
  employerMatchPercent: number
): {
  annual401k: number;
  monthly401k: number;
  isMaxing401k: boolean;
  annualEmployerMatch: number;
  monthlyEmployerMatch: number;
} {
  let annual401k: number;
  if (maxOut401k) {
    annual401k = ANNUAL_401K_LIMIT;
  } else {
    annual401k = Math.min(grossAnnual * (contributionPercent / 100), ANNUAL_401K_LIMIT);
  }

  const isMaxing401k = annual401k >= ANNUAL_401K_LIMIT;
  const monthly401k = annual401k / 12;

  const annualEmployerMatch = grossAnnual * (employerMatchPercent / 100);
  const monthlyEmployerMatch = annualEmployerMatch / 12;

  return {
    annual401k,
    monthly401k,
    isMaxing401k,
    annualEmployerMatch,
    monthlyEmployerMatch,
  };
}

// ─── Net Monthly Income ─────────────────────────────────────────────────────

/**
 * Calculate estimated monthly take-home pay after taxes and retirement contributions.
 */
export function calculateNetMonthlyIncome(
  grossAnnual: number,
  filingStatus: FilingStatus,
  state: StateOfResidence,
  annual401k: number,
  annualIRA: number,
  bonusIncome: number,
  otherMonthlyIncome: number
): {
  grossMonthly: number;
  federalTaxMonthly: number;
  stateTaxMonthly: number;
  payrollTaxMonthly: number;
  total401kMonthly: number;
  netMonthly: number;
  federalTaxAnnual: number;
  stateTaxAnnual: number;
  payrollTaxAnnual: number;
  totalTaxAnnual: number;
  effectiveTaxRate: number;
} {
  const totalAnnualGross = grossAnnual + bonusIncome;
  const grossMonthly = totalAnnualGross / 12 + otherMonthlyIncome;

  const federalTaxAnnual = federalIncomeTaxEstimate(totalAnnualGross, filingStatus, annual401k);
  const stateTaxAnnual = stateIncomeTaxEstimate(totalAnnualGross, state, filingStatus, annual401k);
  const payrollTaxAnnual = payrollTaxEstimate(totalAnnualGross, filingStatus);

  const totalTaxAnnual = federalTaxAnnual + stateTaxAnnual + payrollTaxAnnual;
  const effectiveTaxRate = totalAnnualGross > 0 ? totalTaxAnnual / totalAnnualGross : 0;

  const federalTaxMonthly = federalTaxAnnual / 12;
  const stateTaxMonthly = stateTaxAnnual / 12;
  const payrollTaxMonthly = payrollTaxAnnual / 12;
  const total401kMonthly = annual401k / 12;

  // Net monthly: gross - taxes - 401(k) pre-tax - IRA (after-tax, but subtract from take-home)
  const netMonthly =
    grossMonthly -
    federalTaxMonthly -
    stateTaxMonthly -
    payrollTaxMonthly -
    total401kMonthly -
    annualIRA / 12;

  return {
    grossMonthly,
    federalTaxMonthly,
    stateTaxMonthly,
    payrollTaxMonthly,
    total401kMonthly,
    netMonthly: Math.max(0, netMonthly),
    federalTaxAnnual,
    stateTaxAnnual,
    payrollTaxAnnual,
    totalTaxAnnual,
    effectiveTaxRate,
  };
}

export const STATE_LABELS: Record<string, string> = {
  CA: 'California',
  GA: 'Georgia',
  no_state_tax: 'No State Income Tax',
};
