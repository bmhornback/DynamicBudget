import type { BudgetInputs, NamedBudget, CustomPreset } from '@/types/budget';
import { initializeSpendingHistory } from './spendingTrends';
import { DEFAULT_INPUTS } from './defaultScenarios';

const STORAGE_KEY = 'dynamicbudget_budget_inputs';
const NAMED_BUDGETS_KEY = 'dynamicbudget_named_budgets';
const CUSTOM_PRESETS_KEY = 'dynamicbudget_custom_presets';
const STORAGE_VERSION = 1;

// Legacy keys used before the DynamicBudget rename — kept for one-time migration only
const LEGACY_STORAGE_KEY = 'movemath_budget_inputs';
const LEGACY_NAMED_BUDGETS_KEY = 'movemath_named_budgets';
const LEGACY_CUSTOM_PRESETS_KEY = 'movemath_custom_presets';

/**
 * Save budget inputs to localStorage
 */
export function saveBudgetInputs(inputs: BudgetInputs): void {
  if (typeof window === 'undefined') return;

  try {
    const data = {
      version: STORAGE_VERSION,
      inputs,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save budget inputs:', error);
  }
}

/**
 * Load budget inputs from localStorage.
 * Falls back to the legacy movemath_* key on first run after the rename,
 * migrating the data to the new key automatically.
 */
export function loadBudgetInputs(): BudgetInputs | null {
  if (typeof window === 'undefined') return null;

  try {
    let stored = localStorage.getItem(STORAGE_KEY);

    // One-time migration from legacy key
    if (!stored) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        localStorage.setItem(STORAGE_KEY, legacy);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        stored = legacy;
      }
    }

    if (!stored) return null;

    const data = JSON.parse(stored);

    // Validate version
    if (data.version !== STORAGE_VERSION) {
      console.warn(
        `Storage version mismatch: expected ${STORAGE_VERSION}, got ${data.version}`
      );
      return null;
    }

    const mergedInputs = {
      ...DEFAULT_INPUTS,
      ...data.inputs,
      lockedFields: data.inputs.lockedFields ?? {},
    } as BudgetInputs;

    // Initialize spending history if missing
    if (!mergedInputs.spendingHistory) {
      mergedInputs.spendingHistory = initializeSpendingHistory();
    }
    if (!Array.isArray(mergedInputs.debts)) {
      mergedInputs.debts = [];
    }
    if (!Array.isArray(mergedInputs.longTermGoals)) {
      mergedInputs.longTermGoals = DEFAULT_INPUTS.longTermGoals.map(g => ({ ...g }));
    }

    return mergedInputs;
  } catch (error) {
    console.warn('Failed to load budget inputs:', error);
    return null;
  }
}

/**
 * Clear all stored data
 */
export function clearBudgetStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear storage:', error);
  }
}

/**
 * Export budget data as JSON
 */
export function exportBudgetAsJSON(inputs: BudgetInputs): string {
  return JSON.stringify({
    version: STORAGE_VERSION,
    inputs,
    exportDate: new Date().toISOString(),
  }, null, 2);
}

/**
 * Generate a YYYY-MM-DD date string for filenames.
 */
export function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Export budget line items as a CSV string.
 * Includes both Monthly and Annual columns for every numeric field.
 */
export function exportBudgetAsCSV(inputs: BudgetInputs): string {
  const date = todayDateStr();

  // Helper to escape CSV values (RFC 4180 + spreadsheet formula injection prevention)
  const esc = (v: string | number): string => {
    const s = String(v);
    // Prefix formula-triggering characters to prevent CSV injection in spreadsheet apps
    const formulaChars = ['=', '+', '-', '@', '\t', '\r'];
    const needsFormulaEscape = formulaChars.some((c) => s.startsWith(c));
    const needsQuoting = needsFormulaEscape || s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r');
    const safe = needsFormulaEscape ? `'${s}` : s;
    return needsQuoting ? `"${safe.replace(/"/g, '""')}"` : safe;
  };

  const row = (label: string, monthly: number, annual?: number): string =>
    [esc(label), esc(monthly.toFixed(2)), esc((annual ?? monthly * 12).toFixed(2))].join(',');

  const section = (sectionTitle: string): string => `${esc(sectionTitle)},,`;

  const title = (label: string): string => [esc(label), '', ''].join(',');

  /** Blank separator row with consistent column count */
  const sep = ',,';

  const lines: string[] = [
    title(`DynamicBudget Export - ${date}`),
    sep,
    'Category,Monthly ($),Annual ($)',
    sep,
    section('INCOME'),
    row('Gross Income', inputs.annualSalary / 12, inputs.annualSalary),
    row('Bonus Income', inputs.bonusIncome / 12, inputs.bonusIncome),
    row('Other Monthly Income', inputs.otherMonthlyIncome, inputs.otherMonthlyIncome * 12),
    sep,
    section('HOUSING'),
  ];

  if (inputs.housingMode === 'homeowner') {
    lines.push(
      row('Mortgage Payment', inputs.mortgagePayment),
      row('Property Tax', inputs.propertyTax),
      row('Home Insurance', inputs.homeInsurance),
      row('Home Maintenance Reserve', inputs.homeMaintenanceReserve),
    );
  } else {
    lines.push(
      row('Rent', inputs.rent),
      row('Pet Rent', inputs.petRent),
      row('Renters Insurance', inputs.rentersInsurance),
    );
  }
  lines.push(
    row('Parking Fee', inputs.parkingFee),
    row('HOA Fee', inputs.hoaFee),
    sep,
    section('UTILITIES'),
    row('Electric', inputs.electric),
    row('Gas', inputs.gas),
    row('Water', inputs.water),
    row('Trash', inputs.trash),
    row('Internet', inputs.internet),
    row('Phone', inputs.phone),
    sep,
    section('TRANSPORTATION'),
    row('Car Payment', inputs.carPayment),
    row('Fuel', inputs.fuel),
    row('Car Insurance', inputs.carInsurance),
    row('Car Maintenance', inputs.carMaintenance),
    row('Car Parking', inputs.carParking),
    row('Tolls', inputs.tolls),
    row('Rideshare / Transit', inputs.rideShareTransit),
  );

  if (inputs.petsEnabled) {
    lines.push(
      sep,
      section('PETS'),
      row('Pet Food', inputs.petFood),
      row('Vet / Medications', inputs.vetMedications),
      row('Pet Insurance', inputs.petInsurance),
      row('Grooming / Supplies', inputs.groomingSupplies),
      row('Dog Daycare', inputs.dogDaycare),
      row('Boarding / Sitter', inputs.boardingSitter),
      row('Emergency Pet Fund', inputs.emergencyPetFund),
    );
  }

  lines.push(
    sep,
    section('FOOD & HOUSEHOLD'),
    row('Groceries', inputs.groceries),
    row('Household Basics', inputs.householdBasics),
    row('Dining Out', inputs.diningOut),
    sep,
    section('HEALTH'),
    row('Health Insurance', inputs.healthInsurance),
    row('Prescriptions', inputs.prescriptions),
    row('Gym / Fitness', inputs.gymFitness),
    row('Therapy / Wellness', inputs.therapyWellness),
    sep,
    section('SAVINGS & INVESTING'),
    row('Emergency Fund Contribution', inputs.emergencyFundContribution),
    row('House Down Payment / Home Equity', inputs.houseDownPaymentContribution),
    row('Taxable Investments', inputs.taxableInvestments),
    row('IRA Contribution', inputs.iraContribution),
    row('HSA Contribution', inputs.hsaContribution),
    row('Extra Debt Payoff', inputs.extraDebtPayoff),
    row('General Cash Savings', inputs.generalCashSavings),
    sep,
    section('LIFESTYLE'),
    row('Fun / Entertainment', inputs.funEntertainment),
    row('Travel', inputs.travel),
    row('Clothes', inputs.clothes),
    row('Subscriptions', inputs.subscriptions),
    row('Personal Spending', inputs.personalSpending),
    row('Gifts', inputs.gifts),
    row('Misc Buffer', inputs.miscBuffer),
  );

  return lines.join('\r\n');
}

/**
 * Trigger a file download in the browser.
 * @param content  File content as a string
 * @param filename Suggested filename
 * @param mimeType MIME type (default: application/json)
 */
export function triggerDownload(content: string, filename: string, mimeType = 'application/json'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Revoke after a short delay to ensure the browser has started the download
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Import budget data from JSON
 */
export function importBudgetFromJSON(jsonString: string): BudgetInputs | null {
  try {
    const data = JSON.parse(jsonString);

    if (data.version !== STORAGE_VERSION) {
      console.warn(
        `Import version mismatch: expected ${STORAGE_VERSION}, got ${data.version}`
      );
      return null;
    }

    const mergedInputs = {
      ...DEFAULT_INPUTS,
      ...data.inputs,
      lockedFields: data.inputs.lockedFields ?? {},
    } as BudgetInputs;

    // Initialize spending history if missing
    if (!mergedInputs.spendingHistory) {
      mergedInputs.spendingHistory = initializeSpendingHistory();
    }
    if (!Array.isArray(mergedInputs.debts)) {
      mergedInputs.debts = [];
    }
    if (!Array.isArray(mergedInputs.longTermGoals)) {
      mergedInputs.longTermGoals = DEFAULT_INPUTS.longTermGoals.map(g => ({ ...g }));
    }

    return mergedInputs;
  } catch (error) {
    console.warn('Failed to import budget data:', error);
    return null;
  }
}

// ─── Named Budget Slots (E2-T3) ───────────────────────────────────────────────

/**
 * Load all named budgets from localStorage.
 */
export function loadNamedBudgets(): NamedBudget[] {
  if (typeof window === 'undefined') return [];
  try {
    let stored = localStorage.getItem(NAMED_BUDGETS_KEY);
    if (!stored) {
      const legacy = localStorage.getItem(LEGACY_NAMED_BUDGETS_KEY);
      if (legacy) {
        localStorage.setItem(NAMED_BUDGETS_KEY, legacy);
        localStorage.removeItem(LEGACY_NAMED_BUDGETS_KEY);
        stored = legacy;
      }
    }
    if (!stored) return [];
    return JSON.parse(stored) as NamedBudget[];
  } catch {
    return [];
  }
}

/**
 * Save a new named budget (or overwrite one with the same id).
 */
export function saveNamedBudget(budget: NamedBudget): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadNamedBudgets();
    const idx = existing.findIndex((b) => b.id === budget.id);
    if (idx >= 0) {
      existing[idx] = budget;
    } else {
      existing.push(budget);
    }
    localStorage.setItem(NAMED_BUDGETS_KEY, JSON.stringify(existing));
  } catch (error) {
    console.warn('Failed to save named budget:', error);
  }
}

/**
 * Delete a named budget by id.
 */
export function deleteNamedBudget(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadNamedBudgets().filter((b) => b.id !== id);
    localStorage.setItem(NAMED_BUDGETS_KEY, JSON.stringify(existing));
  } catch (error) {
    console.warn('Failed to delete named budget:', error);
  }
}

// ─── Custom Scenario Presets (E2-T4) ─────────────────────────────────────────

/**
 * Load all custom presets from localStorage.
 */
export function loadCustomPresets(): CustomPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    let stored = localStorage.getItem(CUSTOM_PRESETS_KEY);
    if (!stored) {
      const legacy = localStorage.getItem(LEGACY_CUSTOM_PRESETS_KEY);
      if (legacy) {
        localStorage.setItem(CUSTOM_PRESETS_KEY, legacy);
        localStorage.removeItem(LEGACY_CUSTOM_PRESETS_KEY);
        stored = legacy;
      }
    }
    if (!stored) return [];
    return JSON.parse(stored) as CustomPreset[];
  } catch {
    return [];
  }
}

/**
 * Save a new custom preset (or overwrite one with the same id).
 */
export function saveCustomPreset(preset: CustomPreset): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadCustomPresets();
    const idx = existing.findIndex((p) => p.id === preset.id);
    if (idx >= 0) {
      existing[idx] = preset;
    } else {
      existing.push(preset);
    }
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(existing));
  } catch (error) {
    console.warn('Failed to save custom preset:', error);
  }
}

/**
 * Delete a custom preset by id.
 */
export function deleteCustomPreset(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadCustomPresets().filter((p) => p.id !== id);
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(existing));
  } catch (error) {
    console.warn('Failed to delete custom preset:', error);
  }
}
