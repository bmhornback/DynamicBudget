import type { BudgetInputs, NamedBudget, CustomPreset } from '@/types/budget';
import { initializeSpendingHistory } from './spendingTrends';
import { DEFAULT_INPUTS } from './defaultScenarios';

const STORAGE_KEY = 'movemath_budget_inputs';
const NAMED_BUDGETS_KEY = 'movemath_named_budgets';
const CUSTOM_PRESETS_KEY = 'movemath_custom_presets';
const STORAGE_VERSION = 1;

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
 * Load budget inputs from localStorage
 */
export function loadBudgetInputs(): BudgetInputs | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
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
    const stored = localStorage.getItem(NAMED_BUDGETS_KEY);
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
    const stored = localStorage.getItem(CUSTOM_PRESETS_KEY);
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
