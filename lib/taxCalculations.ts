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

type StateTaxType = 'none' | 'flat' | 'bracket';

interface StateTaxConfig {
  type: StateTaxType;
  rate?: number;                 // used when type === 'flat'
  bracketsSingle?: TaxBracket[]; // used when type === 'bracket'
  bracketsMFJ?: TaxBracket[];    // optional; falls back to bracketsSingle if omitted
}

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

// State income tax tables (2024 estimates).
// County/local taxes, most state standard deductions, and special surtaxes are
// excluded for brevity. HOH filers use single brackets unless otherwise noted.
// No-income-tax states: AK, FL, NV, NH, SD, TN, TX, WA, WY.
const STATE_TAX_CONFIG: Record<string, StateTaxConfig> = {

  // ── No income tax ──────────────────────────────────────────────────────────
  AK: { type: 'none' },
  FL: { type: 'none' },
  NV: { type: 'none' },
  NH: { type: 'none' },
  SD: { type: 'none' },
  TN: { type: 'none' },
  TX: { type: 'none' },
  WA: { type: 'none' },
  WY: { type: 'none' },

  // ── Flat rate ──────────────────────────────────────────────────────────────
  AZ: { type: 'flat', rate: 0.025  },  // 2.5%
  CO: { type: 'flat', rate: 0.044  },  // 4.4%
  GA: { type: 'flat', rate: 0.0549 },  // 5.49%
  ID: { type: 'flat', rate: 0.058  },  // 5.8%
  IL: { type: 'flat', rate: 0.0495 },  // 4.95%
  IN: { type: 'flat', rate: 0.0305 },  // 3.05%
  KY: { type: 'flat', rate: 0.04   },  // 4.0%
  MA: { type: 'flat', rate: 0.05   },  // 5.0% (9% surtax >$1M excluded)
  MI: { type: 'flat', rate: 0.0425 },  // 4.25%
  MS: { type: 'flat', rate: 0.047  },  // 4.7% (income >$10k; exemption simplified away)
  NC: { type: 'flat', rate: 0.045  },  // 4.5%
  PA: { type: 'flat', rate: 0.0307 },  // 3.07%
  UT: { type: 'flat', rate: 0.0465 },  // 4.65%

  // ── Progressive brackets ───────────────────────────────────────────────────
  AL: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.02, upTo: 500 },
      { rate: 0.04, upTo: 3000 },
      { rate: 0.05, upTo: Infinity },
    ],
    bracketsMFJ: [
      { rate: 0.02, upTo: 1000 },
      { rate: 0.04, upTo: 6000 },
      { rate: 0.05, upTo: Infinity },
    ],
  },
  AR: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.02,  upTo: 4999 },
      { rate: 0.04,  upTo: 9999 },
      { rate: 0.047, upTo: Infinity },
    ],
  },
  CA: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.01,  upTo: 10412 },
      { rate: 0.02,  upTo: 24684 },
      { rate: 0.04,  upTo: 38959 },
      { rate: 0.06,  upTo: 54081 },
      { rate: 0.08,  upTo: 68350 },
      { rate: 0.093, upTo: 349137 },
      { rate: 0.103, upTo: 418961 },
      { rate: 0.113, upTo: 698274 },
      { rate: 0.123, upTo: Infinity },
    ],
    bracketsMFJ: [
      { rate: 0.01,  upTo: 20824 },
      { rate: 0.02,  upTo: 49368 },
      { rate: 0.04,  upTo: 77918 },
      { rate: 0.06,  upTo: 108162 },
      { rate: 0.08,  upTo: 136700 },
      { rate: 0.093, upTo: 698274 },
      { rate: 0.103, upTo: 837922 },
      { rate: 0.113, upTo: 1000000 },
      { rate: 0.123, upTo: Infinity },
    ],
  },
  CT: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.03,   upTo: 10000 },
      { rate: 0.05,   upTo: 50000 },
      { rate: 0.055,  upTo: 100000 },
      { rate: 0.06,   upTo: 200000 },
      { rate: 0.065,  upTo: 250000 },
      { rate: 0.069,  upTo: 500000 },
      { rate: 0.0699, upTo: Infinity },
    ],
    bracketsMFJ: [
      { rate: 0.03,   upTo: 20000 },
      { rate: 0.05,   upTo: 100000 },
      { rate: 0.055,  upTo: 200000 },
      { rate: 0.06,   upTo: 400000 },
      { rate: 0.065,  upTo: 500000 },
      { rate: 0.069,  upTo: 1000000 },
      { rate: 0.0699, upTo: Infinity },
    ],
  },
  DC: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.04,   upTo: 10000 },
      { rate: 0.06,   upTo: 40000 },
      { rate: 0.065,  upTo: 60000 },
      { rate: 0.085,  upTo: 250000 },
      { rate: 0.0925, upTo: 500000 },
      { rate: 0.0975, upTo: 1000000 },
      { rate: 0.1075, upTo: Infinity },
    ],
  },
  DE: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.0,    upTo: 2000 },
      { rate: 0.022,  upTo: 5000 },
      { rate: 0.039,  upTo: 10000 },
      { rate: 0.048,  upTo: 20000 },
      { rate: 0.052,  upTo: 25000 },
      { rate: 0.0555, upTo: 60000 },
      { rate: 0.066,  upTo: Infinity },
    ],
  },
  HI: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.014,  upTo: 2400 },
      { rate: 0.032,  upTo: 4800 },
      { rate: 0.055,  upTo: 9600 },
      { rate: 0.064,  upTo: 14400 },
      { rate: 0.068,  upTo: 19200 },
      { rate: 0.072,  upTo: 24000 },
      { rate: 0.076,  upTo: 36000 },
      { rate: 0.079,  upTo: 48000 },
      { rate: 0.0825, upTo: 150000 },
      { rate: 0.09,   upTo: 175000 },
      { rate: 0.10,   upTo: 200000 },
      { rate: 0.11,   upTo: Infinity },
    ],
    bracketsMFJ: [
      { rate: 0.014,  upTo: 4800 },
      { rate: 0.032,  upTo: 9600 },
      { rate: 0.055,  upTo: 19200 },
      { rate: 0.064,  upTo: 28800 },
      { rate: 0.068,  upTo: 38400 },
      { rate: 0.072,  upTo: 48000 },
      { rate: 0.076,  upTo: 72000 },
      { rate: 0.079,  upTo: 96000 },
      { rate: 0.0825, upTo: 300000 },
      { rate: 0.09,   upTo: 350000 },
      { rate: 0.10,   upTo: 400000 },
      { rate: 0.11,   upTo: Infinity },
    ],
  },
  IA: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.044,  upTo: 6000 },
      { rate: 0.0482, upTo: 30000 },
      { rate: 0.057,  upTo: Infinity },
    ],
  },
  KS: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.031,  upTo: 15000 },
      { rate: 0.0525, upTo: Infinity },
    ],
    bracketsMFJ: [
      { rate: 0.031,  upTo: 30000 },
      { rate: 0.0525, upTo: Infinity },
    ],
  },
  LA: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.0185, upTo: 12500 },
      { rate: 0.035,  upTo: 50000 },
      { rate: 0.0425, upTo: Infinity },
    ],
    bracketsMFJ: [
      { rate: 0.0185, upTo: 25000 },
      { rate: 0.035,  upTo: 100000 },
      { rate: 0.0425, upTo: Infinity },
    ],
  },
  MD: {
    type: 'bracket',
    // County/local taxes (~2–3%) not included; state brackets only
    bracketsSingle: [
      { rate: 0.02,   upTo: 1000 },
      { rate: 0.03,   upTo: 2000 },
      { rate: 0.04,   upTo: 3000 },
      { rate: 0.0475, upTo: 100000 },
      { rate: 0.05,   upTo: 125000 },
      { rate: 0.0525, upTo: 150000 },
      { rate: 0.055,  upTo: 250000 },
      { rate: 0.0575, upTo: Infinity },
    ],
  },
  ME: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.058,  upTo: 24500 },
      { rate: 0.0675, upTo: 58050 },
      { rate: 0.0715, upTo: Infinity },
    ],
    bracketsMFJ: [
      { rate: 0.058,  upTo: 49050 },
      { rate: 0.0675, upTo: 116100 },
      { rate: 0.0715, upTo: Infinity },
    ],
  },
  MN: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.0535, upTo: 30070 },
      { rate: 0.068,  upTo: 98760 },
      { rate: 0.0785, upTo: 183340 },
      { rate: 0.0985, upTo: Infinity },
    ],
    bracketsMFJ: [
      { rate: 0.0535, upTo: 43950 },
      { rate: 0.068,  upTo: 174610 },
      { rate: 0.0785, upTo: 304970 },
      { rate: 0.0985, upTo: Infinity },
    ],
  },
  MO: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.015,  upTo: 1207 },
      { rate: 0.02,   upTo: 2414 },
      { rate: 0.025,  upTo: 3621 },
      { rate: 0.03,   upTo: 4828 },
      { rate: 0.035,  upTo: 6035 },
      { rate: 0.04,   upTo: 7242 },
      { rate: 0.045,  upTo: 8449 },
      { rate: 0.0495, upTo: Infinity },
    ],
  },
  MT: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.047, upTo: 20500 },
      { rate: 0.059, upTo: Infinity },
    ],
    bracketsMFJ: [
      { rate: 0.047, upTo: 41000 },
      { rate: 0.059, upTo: Infinity },
    ],
  },
  NE: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.0246, upTo: 3700 },
      { rate: 0.0351, upTo: 22170 },
      { rate: 0.0501, upTo: 35730 },
      { rate: 0.0584, upTo: Infinity },
    ],
    bracketsMFJ: [
      { rate: 0.0246, upTo: 7390 },
      { rate: 0.0351, upTo: 44340 },
      { rate: 0.0501, upTo: 71460 },
      { rate: 0.0584, upTo: Infinity },
    ],
  },
  NJ: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.014,   upTo: 20000 },
      { rate: 0.0175,  upTo: 35000 },
      { rate: 0.035,   upTo: 40000 },
      { rate: 0.05525, upTo: 75000 },
      { rate: 0.0637,  upTo: 500000 },
      { rate: 0.0897,  upTo: 1000000 },
      { rate: 0.1075,  upTo: Infinity },
    ],
    bracketsMFJ: [
      { rate: 0.014,   upTo: 20000 },
      { rate: 0.0175,  upTo: 50000 },
      { rate: 0.0245,  upTo: 70000 },
      { rate: 0.035,   upTo: 80000 },
      { rate: 0.05525, upTo: 150000 },
      { rate: 0.0637,  upTo: 500000 },
      { rate: 0.0897,  upTo: 1000000 },
      { rate: 0.1075,  upTo: Infinity },
    ],
  },
  NM: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.017, upTo: 5500 },
      { rate: 0.032, upTo: 11000 },
      { rate: 0.047, upTo: 16000 },
      { rate: 0.049, upTo: 210000 },
      { rate: 0.059, upTo: Infinity },
    ],
    bracketsMFJ: [
      { rate: 0.017, upTo: 8000 },
      { rate: 0.032, upTo: 16000 },
      { rate: 0.047, upTo: 24000 },
      { rate: 0.049, upTo: 315000 },
      { rate: 0.059, upTo: Infinity },
    ],
  },
  NY: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.04,   upTo: 8500 },
      { rate: 0.045,  upTo: 11700 },
      { rate: 0.0525, upTo: 13900 },
      { rate: 0.0585, upTo: 21400 },
      { rate: 0.0625, upTo: 80650 },
      { rate: 0.0685, upTo: 215000 },
      { rate: 0.0965, upTo: 1077550 },
      { rate: 0.103,  upTo: 5000000 },
      { rate: 0.109,  upTo: Infinity },
    ],
    bracketsMFJ: [
      { rate: 0.04,   upTo: 17150 },
      { rate: 0.045,  upTo: 23600 },
      { rate: 0.0525, upTo: 27900 },
      { rate: 0.0585, upTo: 43000 },
      { rate: 0.0625, upTo: 161550 },
      { rate: 0.0685, upTo: 323200 },
      { rate: 0.0965, upTo: 2155350 },
      { rate: 0.103,  upTo: 5000000 },
      { rate: 0.109,  upTo: Infinity },
    ],
  },
  ND: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.011,  upTo: 44725 },
      { rate: 0.0204, upTo: 225975 },
      { rate: 0.0227, upTo: Infinity },
    ],
    bracketsMFJ: [
      { rate: 0.011,  upTo: 74750 },
      { rate: 0.0204, upTo: 275925 },
      { rate: 0.0227, upTo: Infinity },
    ],
  },
  OH: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.0,    upTo: 26050 },
      { rate: 0.0275, upTo: 100000 },
      { rate: 0.035,  upTo: Infinity },
    ],
  },
  OK: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.0025, upTo: 1000 },
      { rate: 0.0075, upTo: 2500 },
      { rate: 0.0175, upTo: 3750 },
      { rate: 0.0275, upTo: 4900 },
      { rate: 0.0375, upTo: 7200 },
      { rate: 0.0475, upTo: Infinity },
    ],
    bracketsMFJ: [
      { rate: 0.0025, upTo: 2000 },
      { rate: 0.0075, upTo: 5000 },
      { rate: 0.0175, upTo: 7500 },
      { rate: 0.0275, upTo: 9800 },
      { rate: 0.0375, upTo: 12200 },
      { rate: 0.0475, upTo: Infinity },
    ],
  },
  OR: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.0475, upTo: 10200 },
      { rate: 0.0675, upTo: 25500 },
      { rate: 0.0875, upTo: 125000 },
      { rate: 0.099,  upTo: Infinity },
    ],
    bracketsMFJ: [
      { rate: 0.0475, upTo: 17400 },
      { rate: 0.0675, upTo: 43650 },
      { rate: 0.0875, upTo: 250000 },
      { rate: 0.099,  upTo: Infinity },
    ],
  },
  RI: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.0375, upTo: 77450 },
      { rate: 0.0475, upTo: 176050 },
      { rate: 0.0599, upTo: Infinity },
    ],
  },
  SC: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.0,   upTo: 3200 },
      { rate: 0.03,  upTo: 6430 },
      { rate: 0.04,  upTo: 9620 },
      { rate: 0.05,  upTo: 12820 },
      { rate: 0.06,  upTo: 16030 },
      { rate: 0.064, upTo: Infinity },
    ],
  },
  VT: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.0335, upTo: 45400 },
      { rate: 0.066,  upTo: 110050 },
      { rate: 0.076,  upTo: 229550 },
      { rate: 0.0875, upTo: Infinity },
    ],
    bracketsMFJ: [
      { rate: 0.0335, upTo: 75900 },
      { rate: 0.066,  upTo: 183400 },
      { rate: 0.076,  upTo: 279450 },
      { rate: 0.0875, upTo: Infinity },
    ],
  },
  VA: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.02,   upTo: 3000 },
      { rate: 0.03,   upTo: 5000 },
      { rate: 0.05,   upTo: 17000 },
      { rate: 0.0575, upTo: Infinity },
    ],
  },
  WV: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.03,  upTo: 10000 },
      { rate: 0.04,  upTo: 25000 },
      { rate: 0.045, upTo: 40000 },
      { rate: 0.06,  upTo: 60000 },
      { rate: 0.065, upTo: Infinity },
    ],
  },
  WI: {
    type: 'bracket',
    bracketsSingle: [
      { rate: 0.035,  upTo: 13810 },
      { rate: 0.044,  upTo: 27630 },
      { rate: 0.053,  upTo: 304170 },
      { rate: 0.0765, upTo: Infinity },
    ],
    bracketsMFJ: [
      { rate: 0.035,  upTo: 18420 },
      { rate: 0.044,  upTo: 36840 },
      { rate: 0.053,  upTo: 405550 },
      { rate: 0.0765, upTo: Infinity },
    ],
  },
};

/**
 * Estimate annual state income tax.
 * Supports all 50 states, DC, and a generic no-state-tax option.
 */
export function stateIncomeTaxEstimate(
  grossAnnual: number,
  state: StateOfResidence,
  filingStatus: FilingStatus,
  annual401kContribution: number
): number {
  // 401(k) is pre-tax for state purposes (simplified)
  const taxableIncome = Math.max(0, grossAnnual - annual401kContribution);

  if (state === 'no_state_tax') return 0;

  const config = STATE_TAX_CONFIG[state];
  if (!config || config.type === 'none') return 0;

  if (config.type === 'flat') {
    return taxableIncome * config.rate!;
  }

  // bracket
  const brackets =
    filingStatus === 'married_jointly' && config.bracketsMFJ
      ? config.bracketsMFJ
      : config.bracketsSingle!;
  return applyBrackets(taxableIncome, brackets);
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
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  no_state_tax: 'No State Income Tax',
};
