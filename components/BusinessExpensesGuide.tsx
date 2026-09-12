'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { formatCurrency } from '@/lib/formatters';

type BusinessExpenseCategory = {
  id: string;
  label: string;
  category: string;
  description: string;
  examples: string[];
  recordkeepingTip: string;
};

type BusinessExpenseEntry = {
  monthlyAmount: number;
  businessUsePercent: number;
  notes: string;
};

const STORAGE_KEY = 'dynamicbudget_business_expenses_v1';

const BUSINESS_EXPENSE_CATEGORIES: BusinessExpenseCategory[] = [
  {
    id: 'home_office',
    label: 'Home Office',
    category: 'Workspace',
    description: 'Use for dedicated workspace costs tied to business activity.',
    examples: ['Office furniture', 'Office supplies', 'Dedicated workspace costs'],
    recordkeepingTip: 'Keep receipts and note how the space is used exclusively for business.',
  },
  {
    id: 'software_tools',
    label: 'Software & Subscriptions',
    category: 'Technology',
    description: 'Recurring tools used to run work operations and client delivery.',
    examples: ['Design software', 'Project management apps', 'Cloud storage'],
    recordkeepingTip: 'Track invoices and document which tools support business deliverables.',
  },
  {
    id: 'internet_phone',
    label: 'Internet & Phone',
    category: 'Utilities',
    description: 'Communication services partially or fully used for business.',
    examples: ['Business phone line', 'Home internet business share', 'VOIP services'],
    recordkeepingTip: 'Record the business-use percentage and how it was estimated.',
  },
  {
    id: 'travel',
    label: 'Business Travel',
    category: 'Travel',
    description: 'Transportation and lodging for eligible business travel.',
    examples: ['Flights', 'Hotels', 'Rideshare for meetings'],
    recordkeepingTip: 'Keep trip purpose, attendees, and receipts together in one log.',
  },
  {
    id: 'meals',
    label: 'Business Meals',
    category: 'Client Relations',
    description: 'Meals tied to client, partner, or business development activities.',
    examples: ['Client lunch', 'Team working meal', 'Prospect coffee meeting'],
    recordkeepingTip: 'Document who attended and the specific business purpose.',
  },
  {
    id: 'vehicle',
    label: 'Vehicle Usage',
    category: 'Transportation',
    description: 'Vehicle costs related to business driving.',
    examples: ['Mileage', 'Fuel for business trips', 'Parking for meetings'],
    recordkeepingTip: 'Maintain a mileage log with date, destination, and business reason.',
  },
  {
    id: 'professional_services',
    label: 'Professional Services',
    category: 'Operations',
    description: 'Outside services directly supporting business operations.',
    examples: ['Bookkeeping', 'Legal support', 'Tax preparation'],
    recordkeepingTip: 'Save engagement letters, invoices, and payment confirmations.',
  },
  {
    id: 'education',
    label: 'Education & Certifications',
    category: 'Professional Development',
    description: 'Training that maintains or improves current professional skills.',
    examples: ['Continuing education', 'Industry certification fees', 'Workshops'],
    recordkeepingTip: 'Save course descriptions that show a direct connection to your business.',
  },
];

const EMPTY_ENTRY: BusinessExpenseEntry = {
  monthlyAmount: 0,
  businessUsePercent: 100,
  notes: '',
};

function normalizeEntry(value: Partial<BusinessExpenseEntry> | undefined): BusinessExpenseEntry {
  if (!value) return { ...EMPTY_ENTRY };
  const monthlyAmount = Number.isFinite(value.monthlyAmount) ? Math.max(0, value.monthlyAmount as number) : 0;
  const businessUsePercent = Number.isFinite(value.businessUsePercent)
    ? Math.min(100, Math.max(0, value.businessUsePercent as number))
    : 100;
  return {
    monthlyAmount,
    businessUsePercent,
    notes: typeof value.notes === 'string' ? value.notes : '',
  };
}

function getDefaultEntries(): Record<string, BusinessExpenseEntry> {
  return BUSINESS_EXPENSE_CATEGORIES.reduce<Record<string, BusinessExpenseEntry>>((acc, item) => {
    acc[item.id] = { ...EMPTY_ENTRY };
    return acc;
  }, {});
}

function getInitialEntries(): Record<string, BusinessExpenseEntry> {
  const defaults = getDefaultEntries();
  if (typeof window === 'undefined') return defaults;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Record<string, Partial<BusinessExpenseEntry>>;
    BUSINESS_EXPENSE_CATEGORIES.forEach(({ id }) => {
      defaults[id] = normalizeEntry(parsed[id]);
    });
    return defaults;
  } catch {
    return defaults;
  }
}

export default function BusinessExpensesGuide() {
  const [entries, setEntries] = useState<Record<string, BusinessExpenseEntry>>(getInitialEntries);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const totals = useMemo(() => {
    let trackedCategories = 0;
    let estimatedMonthlyWriteOff = 0;
    BUSINESS_EXPENSE_CATEGORIES.forEach(({ id }) => {
      const entry = entries[id] ?? EMPTY_ENTRY;
      const categoryEstimate = entry.monthlyAmount * (entry.businessUsePercent / 100);
      if (entry.monthlyAmount > 0) trackedCategories += 1;
      estimatedMonthlyWriteOff += categoryEstimate;
    });
    return {
      trackedCategories,
      estimatedMonthlyWriteOff,
      estimatedAnnualWriteOff: estimatedMonthlyWriteOff * 12,
    };
  }, [entries]);

  const updateEntry = (id: string, updates: Partial<BusinessExpenseEntry>) => {
    setEntries((prev) => ({
      ...prev,
      [id]: normalizeEntry({
        ...prev[id],
        ...updates,
      }),
    }));
  };

  return (
    <section className="space-y-6">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Business Expenses & Tax Write-Offs</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          Track monthly business costs, categorize each expense type, and estimate potential write-offs.
          Treat these as planning estimates and confirm deduction eligibility with a qualified tax professional.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard label="Tracked Categories" value={`${totals.trackedCategories}/${BUSINESS_EXPENSE_CATEGORIES.length}`} />
        <SummaryCard label="Estimated Monthly Write-Off" value={formatCurrency(totals.estimatedMonthlyWriteOff)} />
        <SummaryCard label="Estimated Annual Write-Off" value={formatCurrency(totals.estimatedAnnualWriteOff)} />
      </div>

      <div className="space-y-4">
        {BUSINESS_EXPENSE_CATEGORIES.map((item) => {
          const entry = entries[item.id] ?? EMPTY_ENTRY;
          const categoryEstimate = entry.monthlyAmount * (entry.businessUsePercent / 100);
          const status =
            entry.monthlyAmount <= 0
              ? 'Not tracked yet'
              : entry.businessUsePercent <= 0
                ? 'No business use selected'
                : entry.notes.trim().length === 0
                  ? 'Add documentation notes'
                  : 'Potential write-off identified';
          const statusClass =
            status === 'Potential write-off identified'
              ? 'bg-green-50 text-green-700 border-green-100'
              : status === 'Add documentation notes'
                ? 'bg-amber-50 text-amber-700 border-amber-100'
                : 'bg-gray-50 text-gray-600 border-gray-100';

          return (
            <article
              key={item.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{item.category}</p>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{item.label}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{item.description}</p>
                </div>
                <span className={`text-xs font-medium border rounded-full px-2.5 py-1 ${statusClass}`}>{status}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-300">
                  Monthly Amount
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={entry.monthlyAmount}
                    onChange={(event) => updateEntry(item.id, { monthlyAmount: Number(event.target.value) || 0 })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-300">
                  Business Use %
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={entry.businessUsePercent}
                    onChange={(event) => updateEntry(item.id, { businessUsePercent: Number(event.target.value) || 0 })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  />
                </label>

                <div className="rounded-lg bg-slate-50 dark:bg-gray-900/60 border border-slate-200 dark:border-gray-700 p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Estimated Monthly Write-Off</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">{formatCurrency(categoryEstimate)}</p>
                </div>
              </div>

              <label className="block text-sm text-gray-700 dark:text-gray-300">
                Documentation Notes
                <textarea
                  value={entry.notes}
                  onChange={(event) => updateEntry(item.id, { notes: event.target.value })}
                  rows={2}
                  placeholder="Add business purpose, client/project name, and receipt location..."
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                />
              </label>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
                  <p className="font-medium text-gray-900 dark:text-gray-100">Common Examples</p>
                  <ul className="list-disc ml-5 mt-2 text-gray-600 dark:text-gray-300 space-y-1">
                    {item.examples.map((example) => (
                      <li key={example}>{example}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3">
                  <p className="font-medium text-gray-900 dark:text-gray-100">Recordkeeping Tip</p>
                  <p className="mt-2 text-gray-600 dark:text-gray-300">{item.recordkeepingTip}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
    </div>
  );
}
