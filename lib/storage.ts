import type { BudgetInputs } from '@/types/budget';
import { initializeSpendingHistory } from './spendingTrends';

const STORAGE_KEY = 'movemath_budget_inputs';
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

    // Initialize spending history if missing
    if (!data.inputs.spendingHistory) {
      data.inputs.spendingHistory = initializeSpendingHistory();
    }

    return data.inputs as BudgetInputs;
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

    // Initialize spending history if missing
    if (!data.inputs.spendingHistory) {
      data.inputs.spendingHistory = initializeSpendingHistory();
    }

    return data.inputs as BudgetInputs;
  } catch (error) {
    console.warn('Failed to import budget data:', error);
    return null;
  }
}
