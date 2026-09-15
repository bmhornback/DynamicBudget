'use client';

import React from 'react';
import type { IrregularIncomeAnalysis } from '@/lib/irregularIncome';
import { formatCurrency } from '@/lib/formatters';
import BudgetCard from './BudgetCard';

interface IrregularIncomeCardProps {
  analysis: IrregularIncomeAnalysis;
}

function ScenarioColumn({
  label,
  percentile,
  grossMonthly,
  netMonthly,
  buffer,
  isOverBudget,
  isBase,
}: {
  label: string;
  percentile: number;
  grossMonthly: number;
  netMonthly: number;
  buffer: number;
  isOverBudget: boolean;
  isBase: boolean;
}) {
  const borderClass = isBase
    ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
    : isOverBudget
    ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
    : 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20';

  const labelClass = isBase
    ? 'text-blue-700 dark:text-blue-300'
    : isOverBudget
    ? 'text-red-700 dark:text-red-300'
    : 'text-green-700 dark:text-green-300';

  const bufferClass = isOverBudget
    ? 'text-red-600 dark:text-red-400 font-semibold'
    : 'text-green-600 dark:text-green-400 font-semibold';

  return (
    <div className={`rounded-lg border p-3 text-center flex flex-col gap-1 ${borderClass}`}>
      <p className={`text-xs font-bold uppercase tracking-wide ${labelClass}`}>{label}</p>
      <p className="text-[10px] text-gray-500 dark:text-gray-400">{percentile}th percentile</p>
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mt-1">
        {formatCurrency(grossMonthly)}
        <span className="text-xs font-normal text-gray-500"> gross/mo</span>
      </p>
      <p className="text-xs text-gray-600 dark:text-gray-300">
        {formatCurrency(netMonthly)} take-home
      </p>
      <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">buffer</p>
        <p className={`text-sm tabular-nums ${bufferClass}`}>
          {isOverBudget ? '−' : '+'}
          {formatCurrency(Math.abs(buffer))}
        </p>
      </div>
    </div>
  );
}

export default function IrregularIncomeCard({ analysis }: IrregularIncomeCardProps) {
  const { variabilityPercent, scenarios, atRiskExpenses, isP25OverBudget, p25Deficit } = analysis;
  const [showAll, setShowAll] = React.useState(false);

  const displayedRisk = showAll ? atRiskExpenses : atRiskExpenses.slice(0, 5);

  return (
    <BudgetCard title="Irregular Income Scenarios" accent="yellow">
      {/* Variability summary */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Income variability set to <strong>{variabilityPercent}%</strong>. Below are your budget
        outcomes in a bad, typical, and good month.
      </p>

      {/* P25 / P50 / P75 columns */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {scenarios.map((s) => (
          <ScenarioColumn
            key={s.label}
            label={s.label}
            percentile={s.percentile}
            grossMonthly={s.grossMonthly}
            netMonthly={s.breakdown.netMonthlyIncome}
            buffer={s.breakdown.remainingMonthlyBuffer}
            isOverBudget={s.breakdown.isOverBudget}
            isBase={s.label === 'P50'}
          />
        ))}
      </div>

      {/* At-risk expenses (shown only when P25 is over budget) */}
      {isP25OverBudget && (
        <div>
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 mb-3">
            <p className="text-xs text-red-700 dark:text-red-300 font-medium">
              ⚠ In a bad month you would be{' '}
              <strong>{formatCurrency(p25Deficit)}</strong> over budget. Consider pausing or
              reducing these expenses:
            </p>
          </div>

          <div className="space-y-1">
            {displayedRisk.map((expense) => (
              <div
                key={expense.label}
                className="flex justify-between items-center text-sm py-1 border-b border-gray-100 dark:border-gray-800 last:border-0"
              >
                <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  {expense.isEssential && (
                    <span
                      className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded px-1"
                      title="Essential expense — harder to cut"
                    >
                      essential
                    </span>
                  )}
                  {expense.label}
                </span>
                <span className="tabular-nums font-medium text-gray-800 dark:text-gray-100">
                  {formatCurrency(expense.monthlyAmount)}/mo
                </span>
              </div>
            ))}
          </div>

          {atRiskExpenses.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              {showAll ? 'Show less' : `Show ${atRiskExpenses.length - 5} more`}
            </button>
          )}
        </div>
      )}

      {!isP25OverBudget && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2">
          <p className="text-xs text-green-700 dark:text-green-300">
            ✓ Your budget stays positive even in a bad month (P25). You&apos;re well-positioned for
            income variability.
          </p>
        </div>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
        P25 = income at the 25th percentile (a bad month). P50 = typical. P75 = a good month.
        Adjust income variability % in the Income &amp; Taxes form section.
      </p>
    </BudgetCard>
  );
}
