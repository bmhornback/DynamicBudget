/**
 * Annual expense sinking-fund utilities for DynamicBudget.
 * All logic is pure/deterministic — no React, no side effects.
 *
 * ── Public API (E10-T1) ───────────────────────────────────────────────────
 * Public exports: monthsUntilNextDueMonth, calculateAnnualExpensePlan,
 *   calculateTotalSinkingFunds, ANNUAL_EXPENSE_MONTH_LABELS.
 */

import type { AnnualExpense, AnnualExpensePlan } from '@/types/budget';

export const ANNUAL_EXPENSE_MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/**
 * Returns the number of months until the next occurrence of `dueMonth` (1–12),
 * relative to `now`. Returns 1 when the due month is the current month, and
 * always returns a positive integer. Non-finite or out-of-range values default
 * to month 12.
 */
export function monthsUntilNextDueMonth(dueMonth: number, now = new Date()): number {
  const normalizedDueMonth = Number.isFinite(dueMonth)
    ? Math.min(12, Math.max(1, Math.trunc(dueMonth)))
    : 12;
  const currentMonth = now.getMonth() + 1;
  const diff = normalizedDueMonth - currentMonth;

  if (diff === 0) return 1;
  if (diff > 0) return diff;
  return diff + 12;
}

/**
 * Build an array of `AnnualExpensePlan` objects from raw `AnnualExpense` inputs.
 * Expenses with an `annualAmount` of 0 are filtered out of the result.
 * The optional `now` parameter allows deterministic testing without mocking `Date`.
 */
export function calculateAnnualExpensePlan(
  expenses: AnnualExpense[],
  now = new Date()
): AnnualExpensePlan[] {
  return (expenses ?? [])
    .map((expense) => {
      const annualAmount = Math.max(0, expense.annualAmount || 0);
      const currentSaved = Math.max(0, expense.currentSaved || 0);
      const dueMonth = Number.isFinite(expense.dueMonth)
        ? Math.min(12, Math.max(1, Math.trunc(expense.dueMonth)))
        : 12;
      const monthsUntilDue = monthsUntilNextDueMonth(dueMonth, now);
      const remainingAmount = Math.max(0, annualAmount - currentSaved);
      const recommendedMonthlyContribution = remainingAmount > 0
        ? remainingAmount / Math.max(1, monthsUntilDue)
        : 0;

      return {
        id: expense.id,
        name: expense.name,
        category: expense.category,
        annualAmount,
        currentSaved,
        dueMonth,
        monthsUntilDue,
        remainingAmount,
        recommendedMonthlyContribution,
        annualizedMonthlyContribution: annualAmount / 12,
        fundedRatio: annualAmount > 0 ? Math.min(currentSaved / annualAmount, 1) : 0,
        isEssential: expense.isEssential,
        isFullyFunded: remainingAmount <= 0 && annualAmount > 0,
        isDueSoon: monthsUntilDue <= 3,
      };
    })
    .filter((expense) => expense.annualAmount > 0);
}

/**
 * Sum the recommended monthly sinking-fund contributions across all annual expenses.
 * Equivalent to `calculateAnnualExpensePlan(expenses).reduce(sum, recommendedMonthlyContribution)`.
 */
export function calculateTotalSinkingFunds(expenses: AnnualExpense[], now = new Date()): number {
  return calculateAnnualExpensePlan(expenses, now).reduce(
    (sum, expense) => sum + expense.recommendedMonthlyContribution,
    0
  );
}
