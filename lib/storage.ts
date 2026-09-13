import type { BudgetInputs, NamedBudget, CustomPreset } from '@/types/budget';
import { initializeSpendingHistory } from './spendingTrends';
import { DEFAULT_INPUTS } from './defaultScenarios';
import { calculateBudgetBreakdown } from './budgetCalculations';
import { calculateBudgetHealthScore } from './budgetHealthScore';
import { formatCurrency, formatPercent } from './formatters';
import { STATE_LABELS } from './taxCalculations';

const STORAGE_KEY = 'dynamicbudget_budget_inputs';
const NAMED_BUDGETS_KEY = 'dynamicbudget_named_budgets';
const CUSTOM_PRESETS_KEY = 'dynamicbudget_custom_presets';
export const SHARE_PARAM_KEY = 'b';
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
    if (stored === null) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy !== null) {
        localStorage.setItem(STORAGE_KEY, legacy);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        stored = legacy;
      }
    }

    if (stored === null || stored.trim() === '') return null;

    const data = JSON.parse(stored);

    // Validate version
    if (data.version !== STORAGE_VERSION) {
      console.warn(
        `Storage version mismatch: expected ${STORAGE_VERSION}, got ${data.version}`
      );
      return null;
    }

    return normalizeBudgetInputs(data.inputs);
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
 * Covers all income, housing, utilities, transportation, pets, food, health,
 * savings & investing (with IRA/HSA/targets), retirement settings (401k %,
 * type, max-out, employer match), debts[], and longTermGoals[].
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
    row('Emergency Fund Target', inputs.emergencyFundTarget),
    row('House Down Payment / Home Equity', inputs.houseDownPaymentContribution),
    row('House Down Payment Target', inputs.houseDownPaymentTarget),
    row('Taxable Investments', inputs.taxableInvestments),
    row('IRA Contribution', inputs.iraContribution),
    title(`  IRA Type: ${inputs.iraType === 'traditional' ? 'Traditional (pre-tax)' : 'Roth (after-tax)'}`),
    title(`  Max Out IRA: ${inputs.maxOutIRA ? 'Yes' : 'No'}`),
    row('HSA Contribution', inputs.hsaContribution),
    title(`  Max Out HSA: ${inputs.maxOutHSA ? 'Yes' : 'No'}`),
    row('Extra Debt Payoff', inputs.extraDebtPayoff),
    row('General Cash Savings', inputs.generalCashSavings),
    sep,
    section('RETIREMENT SETTINGS'),
    title(`  401k Contribution: ${inputs.retirementContributionPercent}% of gross`),
    title(`  401k Type: ${inputs.is401kRoth ? 'Roth (after-tax)' : 'Traditional (pre-tax)'}`),
    title(`  Max Out 401k: ${inputs.maxOut401k ? 'Yes' : 'No'}`),
    title(`  Employer Match: ${inputs.employerMatchPercent}% (capped at ${inputs.employerMatchCapPercent}%)`),
  );

  if (inputs.debts.length > 0) {
    lines.push(sep, section('DEBTS'));
    for (const debt of inputs.debts) {
      lines.push(title(`  ${debt.name}`));
      lines.push([esc('  Balance'), esc(debt.balance.toFixed(2)), ''].join(','));
      lines.push([esc('  Interest Rate'), esc(debt.interestRate.toFixed(2) + '%'), ''].join(','));
      lines.push([esc('  Minimum Payment'), esc(debt.minimumPayment.toFixed(2)), esc((debt.minimumPayment * 12).toFixed(2))].join(','));
    }
  }

  if (inputs.longTermGoals.length > 0) {
    lines.push(sep, section('LONG-TERM GOALS'));
    for (const goal of inputs.longTermGoals) {
      lines.push(title(`  ${goal.name} (${goal.category})`));
      lines.push([esc('  Target Amount'), esc(goal.targetAmount.toFixed(2)), ''].join(','));
      lines.push([esc('  Current Amount'), esc(goal.currentAmount.toFixed(2)), ''].join(','));
      if (goal.targetDate) {
        lines.push([esc('  Target Date'), esc(goal.targetDate), ''].join(','));
      }
    }
  }

  lines.push(
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
 * Export a compact plain-text summary suitable for clipboard sharing.
 */
export function exportBudgetQuickSummary(inputs: BudgetInputs): string {
  const breakdown = calculateBudgetBreakdown(inputs);
  const healthScore = calculateBudgetHealthScore(breakdown).score;
  const annualNetIncome = breakdown.netMonthlyIncome * 12;
  const toReadableLabel = (value: string): string =>
    value
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  const row = (label: string, monthly: number, annual: number): string =>
    `| ${label} | ${formatCurrency(monthly)} | ${formatCurrency(annual)} |`;

  const statusLine = breakdown.isOverBudget
    ? `⚠️ Over budget by ${formatCurrency(breakdown.deficit)} per month`
    : `✅ Under budget by ${formatCurrency(breakdown.surplus)} per month`;

  return [
    `DynamicBudget Quick Summary (${todayDateStr()})`,
    '',
    `State: ${STATE_LABELS[inputs.state] ?? inputs.state} · Filing: ${toReadableLabel(inputs.filingStatus)} · Housing: ${toReadableLabel(inputs.housingMode)}`,
    `Budget Health Score: ${healthScore}/100 (${formatPercent(breakdown.savingsRateNet, 1)} net savings rate)`,
    '',
    '| Category | Monthly | Annual |',
    '|---|---:|---:|',
    row('Net Monthly Income', breakdown.netMonthlyIncome, annualNetIncome),
    row('Total Taxes', breakdown.taxes.totalTaxMonthly, breakdown.taxes.totalTaxAnnual),
    row('Housing', breakdown.totalHousing, breakdown.totalHousing * 12),
    row('Utilities', breakdown.totalUtilities, breakdown.totalUtilities * 12),
    row('Transportation', breakdown.totalTransportation, breakdown.totalTransportation * 12),
    row('Pets', breakdown.totalPets, breakdown.totalPets * 12),
    row('Groceries & Food', breakdown.totalGroceriesFood, breakdown.totalGroceriesFood * 12),
    row('Health', breakdown.totalHealth, breakdown.totalHealth * 12),
    row('Lifestyle', breakdown.totalLifestyle, breakdown.totalLifestyle * 12),
    row('Savings', breakdown.totalSavings, breakdown.totalSavings * 12),
    row('Investments', breakdown.totalInvestments, breakdown.totalInvestments * 12),
    row('Debt Payoff', breakdown.totalDebtPayoff, breakdown.totalDebtPayoff * 12),
    row('Total Allocated', breakdown.totalAllocated, breakdown.totalAllocated * 12),
    row('Remaining Buffer', breakdown.remainingMonthlyBuffer, breakdown.remainingMonthlyBuffer * 12),
    '',
    statusLine,
  ].join('\n');
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

    return normalizeBudgetInputs(data.inputs);
  } catch (error) {
    console.warn('Failed to import budget data:', error);
    return null;
  }
}

function normalizeBudgetInputs(rawInputs: unknown): BudgetInputs {
  const inputObject = (rawInputs ?? {}) as Partial<BudgetInputs>;
  const mergedInputs = {
    ...DEFAULT_INPUTS,
    ...inputObject,
    lockedFields: inputObject.lockedFields ?? {},
  } as BudgetInputs;

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
}

function encodeBase64Url(value: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf-8').toString('base64url');
  }

  if (typeof btoa === 'function') {
    const binary = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16))
    );
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  throw new Error('No base64 encoder available');
}

function decodeBase64Url(value: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64url').toString('utf-8');
  }

  if (typeof atob === 'function') {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  throw new Error('No base64 decoder available');
}

export function encodeBudgetInputsForShare(inputs: BudgetInputs): string {
  return encodeBase64Url(JSON.stringify(inputs));
}

export function decodeBudgetInputsFromShare(encoded: string): BudgetInputs | null {
  try {
    if (!encoded || encoded.trim() === '') return null;
    const decoded = decodeBase64Url(encoded.trim());
    return normalizeBudgetInputs(JSON.parse(decoded));
  } catch (error) {
    console.warn('Failed to decode shared budget:', error);
    return null;
  }
}

export function createShareableBudgetUrl(inputs: BudgetInputs, currentUrl: string): string {
  const url = new URL(currentUrl);
  url.searchParams.set(SHARE_PARAM_KEY, encodeBudgetInputsForShare(inputs));
  return url.toString();
}

export function loadBudgetInputsFromShareUrl(currentUrl: string): BudgetInputs | null {
  try {
    const url = new URL(currentUrl);
    const encoded = url.searchParams.get(SHARE_PARAM_KEY);
    if (!encoded) return null;
    return decodeBudgetInputsFromShare(encoded);
  } catch (error) {
    console.warn('Failed to parse shared budget URL:', error);
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
    if (stored === null) {
      const legacy = localStorage.getItem(LEGACY_NAMED_BUDGETS_KEY);
      if (legacy !== null) {
        localStorage.setItem(NAMED_BUDGETS_KEY, legacy);
        localStorage.removeItem(LEGACY_NAMED_BUDGETS_KEY);
        stored = legacy;
      }
    }
    if (stored === null || stored.trim() === '') return [];
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
    if (stored === null) {
      const legacy = localStorage.getItem(LEGACY_CUSTOM_PRESETS_KEY);
      if (legacy !== null) {
        localStorage.setItem(CUSTOM_PRESETS_KEY, legacy);
        localStorage.removeItem(LEGACY_CUSTOM_PRESETS_KEY);
        stored = legacy;
      }
    }
    if (stored === null || stored.trim() === '') return [];
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
