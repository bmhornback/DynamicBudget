import type { IncomeEntry, IncomeHistory } from '@/types/budget';

export function initializeIncomeHistory(): IncomeHistory {
  return {
    entries: [],
    lastUpdated: new Date().toISOString(),
    version: 1,
  };
}

function generateEntryId(): string {
  return `income_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function addIncomeEntry(
  history: IncomeHistory,
  month: string,
  basePay: number,
  commission: number,
  note?: string
): IncomeHistory {
  const safeBase = Math.max(0, basePay);
  const safeCommission = Math.max(0, commission);
  const entry: IncomeEntry = {
    id: generateEntryId(),
    month,
    basePay: safeBase,
    commission: safeCommission,
    totalPay: safeBase + safeCommission,
    note,
    createdAt: new Date().toISOString(),
  };
  // Invariant: one income entry per month. Submitting again replaces that month.
  const filtered = history.entries.filter((existing) => existing.month !== month);

  return {
    ...history,
    entries: [...filtered, entry],
    lastUpdated: new Date().toISOString(),
  };
}

export interface MonthlyIncomeSummary {
  month: string;
  basePay: number;
  commission: number;
  totalPay: number;
}

export function getMonthlyIncomeSummary(history: IncomeHistory): MonthlyIncomeSummary[] {
  const byMonth = new Map<string, IncomeEntry>();

  history.entries.forEach((entry) => {
    const current = byMonth.get(entry.month);
    if (!current || new Date(entry.createdAt).getTime() >= new Date(current.createdAt).getTime()) {
      byMonth.set(entry.month, entry);
    }
  });

  return Array.from(byMonth.values())
    .map((entry) => ({
      month: entry.month,
      basePay: entry.basePay,
      commission: entry.commission,
      totalPay: entry.totalPay,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
