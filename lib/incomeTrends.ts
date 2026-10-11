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

  return {
    ...history,
    entries: [...history.entries, entry],
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
  const byMonth: Record<string, MonthlyIncomeSummary> = {};

  history.entries.forEach((entry) => {
    if (!byMonth[entry.month]) {
      byMonth[entry.month] = { month: entry.month, basePay: 0, commission: 0, totalPay: 0 };
    }
    byMonth[entry.month].basePay += entry.basePay;
    byMonth[entry.month].commission += entry.commission;
    byMonth[entry.month].totalPay += entry.totalPay;
  });

  return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
}

