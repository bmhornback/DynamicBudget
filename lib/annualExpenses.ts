import type { AnnualExpense, AnnualExpensePlan } from '@/types/budget';

export const ANNUAL_EXPENSE_MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

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

export function calculateTotalSinkingFunds(expenses: AnnualExpense[], now = new Date()): number {
  return calculateAnnualExpensePlan(expenses, now).reduce(
    (sum, expense) => sum + expense.recommendedMonthlyContribution,
    0
  );
}
