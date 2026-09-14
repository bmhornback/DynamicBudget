/**
 * Tax calculation utilities for DynamicBudget.
 * These are simplified estimates, NOT exact tax filing calculations.
 * Clearly labeled as estimates throughout the UI.
 *
 * ⚠️ Tax Year: 2026
 * Last Updated: September 11, 2026
 * Sources:
 * - Federal: IRS 2026 tax inflation adjustments (https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026)
 * - States: Individual state tax authority publications for 2026
 *
 * IMPORTANT: When updating tax tables, remember to also update:
 * - ANNUAL_401K_LIMIT (currently $24,500 for 2026; was $23,500 in 2025, $23,000 in 2024)
 * - ANNUAL_IRA_LIMIT (currently $7,000 for 2026; was $7,000 in 2024-2025, increased from $6,500 in 2023)
 * - ANNUAL_HSA_LIMIT_SELF (currently $4,150 for 2026)
 * - ANNUAL_HSA_LIMIT_FAMILY (currently $8,300 for 2026)
 * - All test expectations in lib/__tests__/taxCalculations.test.ts
 */

import type { FilingStatus, StateOfResidence } from '@/types/budget';

// ─── Federal Income Tax (2026 brackets) ────────────────────────────────────
// Updated per IRS 2026 inflation adjustments
// Source: https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026

interface TaxBracket {
  rate: number;
  upTo: number; // income ceiling for this bracket (Infinity for top bracket)
}

const FEDERAL_BRACKETS: Record<FilingStatus, TaxBracket[]> = {
  single: [
    { rate: 0.10, upTo: 12400 },
    { rate: 0.12, upTo: 50400 },
    { rate: 0.22, upTo: 105700 },
    { rate: 0.24, upTo: 201775 },
    { rate: 0.32, upTo: 256225 },
    { rate: 0.35, upTo: 640600 },
    { rate: 0.37, upTo: Infinity },
  ],
  married_jointly: [
    { rate: 0.10, upTo: 24800 },
    { rate: 0.12, upTo: 100800 },
    { rate: 0.22, upTo: 211400 },
    { rate: 0.24, upTo: 403550 },
    { rate: 0.32, upTo: 512450 },
    { rate: 0.35, upTo: 768700 },
    { rate: 0.37, upTo: Infinity },
  ],
  head_of_household: [
    { rate: 0.10, upTo: 17700 },
    { rate: 0.12, upTo: 67450 },
    { rate: 0.22, upTo: 105700 },
    { rate: 0.24, upTo: 201750 },
    { rate: 0.32, upTo: 256200 },
    { rate: 0.35, upTo: 640600 },
    { rate: 0.37, upTo: Infinity },
  ],
};

const STANDARD_DEDUCTION: Record<FilingStatus, number> = {
  single: 16100,
  married_jointly: 32200,
  head_of_household: 24150,
};

/**
 * Estimate annual federal income tax using bracket math.
 * Applies standard deduction and treats 401(k), Traditional IRA, and HSA as pre-tax deductions.
 */
export function federalIncomeTaxEstimate(
  grossAnnual: number,
  filingStatus: FilingStatus,
  annual401kContribution: number,
  annualTraditionalIRAContribution: number = 0,
  annualHSAContribution: number = 0
): number {
  const deduction = STANDARD_DEDUCTION[filingStatus];
  // Pre-tax deductions: 401(k), Traditional IRA, and HSA
  const preTaxDeductions = annual401kContribution + annualTraditionalIRAContribution + annualHSAContribution;
  const taxableIncome = Math.max(0, grossAnnual - preTaxDeductions - deduction);
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

// State income tax tables (2026 estimates).
// County/local taxes, most state standard deductions, and special surtaxes are
// excluded for brevity. HOH filers use single brackets unless otherwise noted.
// No-income-tax states: AK, FL, NV, NH, SD, TN, TX, WA, WY.
// Updated per state tax authority 2026 rates and inflation adjustments.
const STATE_TAX_CONFIG: Record<Exclude<StateOfResidence, 'no_state_tax'>, StateTaxConfig> = {

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
  GA: { type: 'flat', rate: 0.0549 },  // 5.49% (flat tax as of 2024, continues 2026)
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
      { rate: 0.01,  upTo: 11079 },
      { rate: 0.02,  upTo: 26264 },
      { rate: 0.04,  upTo: 41452 },
      { rate: 0.06,  upTo: 57542 },
      { rate: 0.08,  upTo: 72724 },
      { rate: 0.093, upTo: 371479 },
      { rate: 0.103, upTo: 445771 },
      { rate: 0.113, upTo: 742953 },
      { rate: 0.123, upTo: 1000000 },
      { rate: 0.133, upTo: Infinity },  // 13.3% on income over $1M
    ],
    bracketsMFJ: [
      { rate: 0.01,  upTo: 22158 },
      { rate: 0.02,  upTo: 52528 },
      { rate: 0.04,  upTo: 82904 },
      { rate: 0.06,  upTo: 115084 },
      { rate: 0.08,  upTo: 145448 },
      { rate: 0.093, upTo: 742958 },
      { rate: 0.103, upTo: 891542 },
      { rate: 0.113, upTo: 1485906 },
      { rate: 0.123, upTo: 2000000 },
      { rate: 0.133, upTo: Infinity },  // 13.3% on income over $2M
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
 * Treats 401(k), Traditional IRA, and HSA as pre-tax deductions.
 */
export function stateIncomeTaxEstimate(
  grossAnnual: number,
  state: StateOfResidence,
  filingStatus: FilingStatus,
  annual401kContribution: number,
  annualTraditionalIRAContribution: number = 0,
  annualHSAContribution: number = 0
): number {
  // Pre-tax deductions: 401(k), Traditional IRA, and HSA (simplified assumption that states honor these)
  const preTaxDeductions = annual401kContribution + annualTraditionalIRAContribution + annualHSAContribution;
  const taxableIncome = Math.max(0, grossAnnual - preTaxDeductions);

  if (state === 'no_state_tax') return 0;

  const config = STATE_TAX_CONFIG[state as Exclude<StateOfResidence, 'no_state_tax'>];
  if (!config || config.type === 'none') return 0;

  if (config.type === 'flat') {
    if (config.rate === undefined) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[taxCalculations] Missing flat rate for state: ${state}`);
      }
      return 0;
    }
    return taxableIncome * config.rate;
  }

  // bracket
  const brackets =
    filingStatus === 'married_jointly' && config.bracketsMFJ
      ? config.bracketsMFJ
      : config.bracketsSingle;
  if (!brackets || brackets.length === 0) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[taxCalculations] Missing bracket data for state: ${state}, filing: ${filingStatus}`);
    }
    return 0;
  }
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

/** 2026 401(k) employee contribution limit */
export const ANNUAL_401K_LIMIT = 24500;
/** 2026 401(k) catch-up contribution limit (age 50+) */
export const ANNUAL_401K_CATCHUP_LIMIT = 7500;
/** 2026 IRA contribution limit */
export const ANNUAL_IRA_LIMIT = 7000;
/** 2026 IRA catch-up contribution limit (age 50+) */
export const ANNUAL_IRA_CATCHUP_LIMIT = 1000;
/** 2026 HSA contribution limit - individual coverage */
export const ANNUAL_HSA_LIMIT_SELF = 4150;
/** 2026 HSA contribution limit - family coverage */
export const ANNUAL_HSA_LIMIT_FAMILY = 8300;

/** Traditional IRA income phase-out ranges (2026) - simplified for single filers */
export const TRADITIONAL_IRA_PHASEOUT_SINGLE_START = 77000;
export const TRADITIONAL_IRA_PHASEOUT_SINGLE_END = 87000;
/** Traditional IRA income phase-out ranges (2026) - simplified for MFJ */
export const TRADITIONAL_IRA_PHASEOUT_MFJ_START = 123000;
export const TRADITIONAL_IRA_PHASEOUT_MFJ_END = 143000;

/**
 * Get age-adjusted 401k contribution limit
 * Standard: $24,500; with catch-up (age 50+): $32,000
 */
export function get401kLimit(userAge: number): number {
  return ANNUAL_401K_LIMIT + (userAge >= 50 ? ANNUAL_401K_CATCHUP_LIMIT : 0);
}

/**
 * Get age-adjusted IRA contribution limit
 * Standard: $7,000; with catch-up (age 50+): $8,000
 */
export function getIRALimit(userAge: number): number {
  return ANNUAL_IRA_LIMIT + (userAge >= 50 ? ANNUAL_IRA_CATCHUP_LIMIT : 0);
}

/**
 * Calculate annual 401(k) employee contribution.
 * If maxOut401k is true, caps at age-adjusted ANNUAL_401K_LIMIT.
 * Otherwise uses contributionPercent of grossAnnual.
 */
export function calculateRetirementContribution(
  grossAnnual: number,
  contributionPercent: number,
  maxOut401k: boolean,
  employerMatchPercent: number,
  employerMatchCapPercent: number = 100,
  userAge: number = 0
): {
  annual401k: number;
  monthly401k: number;
  annual401kCatchUp: number;
  monthly401kCatchUp: number;
  isMaxing401k: boolean;
  annualEmployerMatch: number;
  monthlyEmployerMatch: number;
  annualEmployerMatchCapped: number;
  monthlyEmployerMatchCapped: number;
} {
  let annual401k: number;
  const limit401k = get401kLimit(userAge);
  
  if (maxOut401k) {
    annual401k = limit401k;
  } else {
    annual401k = Math.min(grossAnnual * (contributionPercent / 100), limit401k);
  }

  const isMaxing401k = annual401k >= limit401k;
  const monthly401k = annual401k / 12;

  // Calculate catch-up contribution for age 50+
  const eligible401kCatchUp = userAge >= 50 ? ANNUAL_401K_CATCHUP_LIMIT : 0;
  const annual401kCatchUp = maxOut401k && eligible401kCatchUp > 0 ? eligible401kCatchUp : 0;
  const monthly401kCatchUp = annual401kCatchUp / 12;

  // Calculate uncapped employer match
  const annualEmployerMatch = grossAnnual * (employerMatchPercent / 100);
  const monthlyEmployerMatch = annualEmployerMatch / 12;

  // Apply match cap (typically cap is per-paycheck, but we'll cap annual)
  const cappedMatchPercent = Math.min(employerMatchPercent, employerMatchCapPercent);
  const annualEmployerMatchCapped = grossAnnual * (cappedMatchPercent / 100);
  const monthlyEmployerMatchCapped = annualEmployerMatchCapped / 12;

  return {
    annual401k,
    monthly401k,
    annual401kCatchUp,
    monthly401kCatchUp,
    isMaxing401k,
    annualEmployerMatch,
    monthlyEmployerMatch,
    annualEmployerMatchCapped,
    monthlyEmployerMatchCapped,
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
  bonusIncome: number = 0,
  otherMonthlyIncome: number = 0,
  iraType: 'traditional' | 'roth' = 'traditional',
  annualHSA: number = 0,
  is401kRoth: boolean = false
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

  // For tax purposes, only Traditional IRA and HSA reduce taxable income
  const annualTraditionalIRA = iraType === 'traditional' ? annualIRA : 0;
  const annualRothIRA = iraType === 'roth' ? annualIRA : 0;

  // For tax purposes, only Traditional 401k reduces taxable income, not Roth 401k
  const annual401kPreTax = is401kRoth ? 0 : annual401k;

  const federalTaxAnnual = federalIncomeTaxEstimate(
    totalAnnualGross,
    filingStatus,
    annual401kPreTax,
    annualTraditionalIRA,
    annualHSA
  );
  const stateTaxAnnual = stateIncomeTaxEstimate(
    totalAnnualGross,
    state,
    filingStatus,
    annual401kPreTax,
    annualTraditionalIRA,
    annualHSA
  );
  const payrollTaxAnnual = payrollTaxEstimate(totalAnnualGross, filingStatus);

  const totalTaxAnnual = federalTaxAnnual + stateTaxAnnual + payrollTaxAnnual;
  const effectiveTaxRate = totalAnnualGross > 0 ? totalTaxAnnual / totalAnnualGross : 0;

  const federalTaxMonthly = federalTaxAnnual / 12;
  const stateTaxMonthly = stateTaxAnnual / 12;
  const payrollTaxMonthly = payrollTaxAnnual / 12;
  const total401kMonthly = annual401k / 12;

  // Net monthly: gross - taxes - Traditional 401k pre-tax - Traditional IRA pre-tax - HSA pre-tax - Roth IRA after-tax - Roth 401k after-tax
  const netMonthly =
    grossMonthly -
    federalTaxMonthly -
    stateTaxMonthly -
    payrollTaxMonthly -
    annual401kPreTax / 12 -
    annualTraditionalIRA / 12 -
    annualHSA / 12 -
    annualRothIRA / 12 -
    (is401kRoth ? annual401k / 12 : 0);

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

// ─── Combined (Dual-Income MFJ) Net Monthly Income ──────────────────────────

/**
 * Calculate estimated monthly take-home for a married-filing-jointly household
 * where both partners earn income.
 *
 * Federal and state taxes are computed on combined income using MFJ brackets.
 * Social Security payroll tax is computed per earner (SS wage base applies
 * individually); Medicare and Additional Medicare are on combined income.
 */
export function calculateCombinedNetMonthlyIncome(
  primaryGrossAnnual: number,
  primaryBonusIncome: number,
  primaryAnnual401k: number,         // primary pre-tax 401k (0 if Roth)
  primaryAnnualTraditionalIRA: number,
  primaryAnnualHSA: number,
  primaryAnnualRothIRA: number,
  primaryAnnualRoth401k: number,     // primary after-tax 401k (0 if Traditional)
  partnerGrossAnnual: number,
  partnerBonusIncome: number,
  partnerAnnual401k: number,         // partner pre-tax 401k (0 if Roth)
  partnerAnnualRoth401k: number,
  state: StateOfResidence,
  otherMonthlyIncome: number = 0
): {
  combinedGrossMonthly: number;
  combinedNetMonthly: number;
  federalTaxAnnual: number;
  stateTaxAnnual: number;
  payrollTaxAnnual: number;
  totalTaxAnnual: number;
  effectiveTaxRate: number;
  primaryGrossMonthly: number;
  partnerGrossMonthly: number;
} {
  const primaryTotalGross = primaryGrossAnnual + primaryBonusIncome;
  const partnerTotalGross = partnerGrossAnnual + partnerBonusIncome;
  const combinedTotalGross = primaryTotalGross + partnerTotalGross;

  const combinedGrossMonthly = combinedTotalGross / 12 + otherMonthlyIncome;
  const primaryGrossMonthly = primaryTotalGross / 12;
  const partnerGrossMonthly = partnerTotalGross / 12;

  // Combined pre-tax deductions reduce taxable income for federal/state.
  // Only primary earner's Traditional IRA and HSA are included here — the partner's
  // IRA/HSA contributions are not currently modeled (the partner income inputs do not
  // include IRA or HSA fields). If partner IRA/HSA support is added in the future,
  // pass those amounts as additional parameters and include them here.
  const combinedPreTaxDeductions =
    primaryAnnual401k + primaryAnnualTraditionalIRA + primaryAnnualHSA +
    partnerAnnual401k;

  // Federal + state tax on combined household income (MFJ).
  // Partner IRA/HSA deductions are excluded (see comment above).
  const federalTaxAnnual = federalIncomeTaxEstimate(
    combinedTotalGross,
    'married_jointly',
    primaryAnnual401k + partnerAnnual401k,
    primaryAnnualTraditionalIRA,
    primaryAnnualHSA
  );
  const stateTaxAnnual = stateIncomeTaxEstimate(
    combinedTotalGross,
    state,
    'married_jointly',
    primaryAnnual401k + partnerAnnual401k,
    primaryAnnualTraditionalIRA,
    primaryAnnualHSA
  );

  // SS payroll tax per earner (wage base cap applies individually)
  const primarySSTax = Math.min(primaryTotalGross, SS_WAGE_BASE) * SS_RATE;
  const partnerSSTax = Math.min(partnerTotalGross, SS_WAGE_BASE) * SS_RATE;
  const combinedMedicareTax = combinedTotalGross * MEDICARE_RATE;
  const additionalMedicare =
    combinedTotalGross > 250000
      ? (combinedTotalGross - 250000) * ADDITIONAL_MEDICARE_RATE
      : 0;
  const payrollTaxAnnual = primarySSTax + partnerSSTax + combinedMedicareTax + additionalMedicare;

  const totalTaxAnnual = federalTaxAnnual + stateTaxAnnual + payrollTaxAnnual;
  const effectiveTaxRate = combinedTotalGross > 0 ? totalTaxAnnual / combinedTotalGross : 0;

  // Net = combined gross - taxes - all pre-tax deductions - all after-tax retirement
  const netMonthly =
    combinedGrossMonthly -
    totalTaxAnnual / 12 -
    combinedPreTaxDeductions / 12 -
    primaryAnnualRothIRA / 12 -
    primaryAnnualRoth401k / 12 -
    partnerAnnualRoth401k / 12;

  return {
    combinedGrossMonthly,
    combinedNetMonthly: Math.max(0, netMonthly),
    federalTaxAnnual,
    stateTaxAnnual,
    payrollTaxAnnual,
    totalTaxAnnual,
    effectiveTaxRate,
    primaryGrossMonthly,
    partnerGrossMonthly,
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
