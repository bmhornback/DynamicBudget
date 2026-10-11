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
  const normalizedMonth = month.trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(normalizedMonth)) {
    throw new Error('Month must be a valid YYYY-MM value.');
  }

  const safeBase = Math.max(0, basePay);
  const safeCommission = Math.max(0, commission);
  const now = new Date().toISOString();
  const entry: IncomeEntry = {
    id: generateEntryId(),
    month: normalizedMonth,
    basePay: safeBase,
    commission: safeCommission,
    totalPay: safeBase + safeCommission,
    note,
    createdAt: now,
  };
  // Invariant: one income entry per month. Submitting again replaces that month.
  const filtered = history.entries.filter((existing) => existing.month !== normalizedMonth);

  return {
    ...history,
    entries: [...filtered, entry],
    lastUpdated: now,
  };
}

export interface MonthlyIncomeSummary {
  month: string;
  basePay: number;
  commission: number;
  totalPay: number;
}

export function getMonthlyIncomeSummary(history: IncomeHistory): MonthlyIncomeSummary[] {
  const byMonth = new Map<string, { entry: IncomeEntry; order: number }>();
  const FALLBACK_TIMESTAMP = '1970-01-01T00:00:00.000Z';

  history.entries.forEach((entry, index) => {
    const current = byMonth.get(entry.month);
    const entryTimestamp = entry.createdAt ?? FALLBACK_TIMESTAMP;
    const currentTimestamp = current?.entry.createdAt ?? FALLBACK_TIMESTAMP;

    // Legacy/imported entries may be missing createdAt. Treat that as earliest and use the later
    // iteration as the tiebreaker so the last-seen value wins for same-month duplicates.
    if (
      !current ||
      entryTimestamp > currentTimestamp ||
      (entryTimestamp === currentTimestamp && index > current.order)
    ) {
      byMonth.set(entry.month, { entry, order: index });
    }
  });

  return Array.from(byMonth.values()).map(({ entry }) => entry)
    .map((entry) => ({
      month: entry.month,
      basePay: entry.basePay,
      commission: entry.commission,
      totalPay: entry.totalPay,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
