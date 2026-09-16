/**
 * Cost-of-Living Index (COLI) data and utilities.
 *
 * Indices use US national average = 100 as the baseline.
 * Data sourced from MERIC (Missouri Economic Research and Information Center)
 * composite cost-of-living index — approximate 2023–2024 values.
 *
 * A state with index 120 is ~20% more expensive than the US average;
 * a state with index 85 is ~15% cheaper.
 */

import type { BudgetInputs, StateOfResidence } from '@/types/budget';

/** COLI index for each state (US average = 100). */
export const COLI_INDEX: Record<StateOfResidence, number> = {
  AL: 89.6,
  AK: 126.1,
  AZ: 101.2,
  AR: 86.9,
  CA: 151.7,
  CO: 107.8,
  CT: 114.9,
  DE: 103.8,
  DC: 155.3,
  FL: 101.8,
  GA: 92.5,
  HI: 186.3,
  ID: 100.9,
  IL: 101.1,
  IN: 90.5,
  IA: 89.9,
  KS: 88.5,
  KY: 90.0,
  LA: 93.0,
  ME: 112.2,
  MD: 121.1,
  MA: 134.7,
  MI: 92.6,
  MN: 103.1,
  MS: 85.1,
  MO: 91.4,
  MT: 103.1,
  NE: 91.6,
  NV: 103.5,
  NH: 113.9,
  NJ: 125.1,
  NM: 91.5,
  NY: 148.5,
  NC: 95.5,
  ND: 98.8,
  OH: 91.1,
  OK: 88.2,
  OR: 117.4,
  PA: 99.2,
  RI: 118.0,
  SC: 96.5,
  SD: 96.9,
  TN: 89.3,
  TX: 94.5,
  UT: 101.0,
  VT: 117.1,
  VA: 105.1,
  WA: 118.2,
  WV: 88.3,
  WI: 95.6,
  WY: 94.6,
  /** Generic no-income-tax placeholder — use US average */
  no_state_tax: 100.0,
};

/** Return the COLI index for a given state (US avg = 100). */
export function getColiIndex(state: StateOfResidence): number {
  return COLI_INDEX[state] ?? 100;
}

/**
 * Return a human-readable cost tier label for a COLI index value.
 * < 90        → "Very Affordable"
 * 90 – 99     → "Affordable"
 * 100 – 109   → "Average"
 * 110 – 124   → "Above Average"
 * 125 – 149   → "Expensive"
 * ≥ 150       → "Very Expensive"
 */
export function getColiTierLabel(index: number): string {
  if (index < 90) return 'Very Affordable';
  if (index < 100) return 'Affordable';
  if (index < 110) return 'Average';
  if (index < 125) return 'Above Average';
  if (index < 150) return 'Expensive';
  return 'Very Expensive';
}

/**
 * Calculate the equivalent salary in `toState` that provides the same
 * purchasing power as `salary` in `fromState`.
 *
 * Uses a simple COLI ratio: equivalent = salary × (toColi / fromColi).
 */
export function calculatePurchasingPower(
  salary: number,
  fromState: StateOfResidence,
  toState: StateOfResidence
): number {
  const fromColi = getColiIndex(fromState);
  const toColi = getColiIndex(toState);
  if (fromColi === 0) return salary;
  return Math.round(salary * (toColi / fromColi));
}

/**
 * Fields in BudgetInputs that are location-sensitive and should be
 * scaled when adjusting for cost-of-living differences.
 *
 * Excluded (not location-sensitive):
 * - Income and retirement contribution rates/amounts
 * - Fixed debt payments (carPayment, debts[], extraDebtPayoff)
 * - Savings targets and contributions
 * - Subscriptions, gifts, travel (broadly consistent across locations)
 */
const COLI_SCALABLE_FIELDS: (keyof BudgetInputs)[] = [
  // Housing — renter
  'rent',
  'petRent',
  'rentersInsurance',
  'parkingFee',
  'hoaFee',
  // Housing — homeowner
  'propertyTax',
  'homeInsurance',
  'homeMaintenanceReserve',
  // Utilities
  'electric',
  'gas',
  'water',
  'trash',
  'internet',
  'phone',
  // Transportation (variable; not the fixed car loan)
  'fuel',
  'carInsurance',
  'carMaintenance',
  'carParking',
  'tolls',
  'rideShareTransit',
  // Food & household
  'groceries',
  'householdBasics',
  'diningOut',
  // Health
  'healthInsurance',
  'dentalInsurance',
  'visionInsurance',
  'prescriptions',
  'gymFitness',
  'therapyWellness',
  // Pets (location-sensitive costs)
  'petFood',
  'vetMedications',
  'petInsurance',
  'groomingSupplies',
  'dogDaycare',
  'boardingSitter',
  'emergencyPetFund',
  // Lifestyle (discretionary but location-sensitive)
  'funEntertainment',
  'clothes',
  'personalSpending',
  'miscBuffer',
];

/**
 * Return a `Partial<BudgetInputs>` with all location-sensitive expense
 * fields scaled by the COLI ratio between `fromState` and `toState`.
 *
 * Values are rounded to the nearest dollar and clamped to ≥ 0.
 */
export function adjustExpensesForColi(
  inputs: BudgetInputs,
  fromState: StateOfResidence,
  toState: StateOfResidence
): Partial<BudgetInputs> {
  const fromColi = getColiIndex(fromState);
  const toColi = getColiIndex(toState);
  if (fromColi === 0 || fromColi === toColi) return {};

  const ratio = toColi / fromColi;
  const result: Partial<BudgetInputs> = {};

  for (const field of COLI_SCALABLE_FIELDS) {
    const raw = inputs[field];
    if (typeof raw === 'number') {
      (result as Record<string, number>)[field] = Math.max(0, Math.round(raw * ratio));
    }
  }

  return result;
}
