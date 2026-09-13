'use client';

import React, { useState } from 'react';
import type { PaycheckBreakdown, PaycheckLineItem } from '@/lib/paycheckCalculations';
import { PAY_FREQUENCY_SHORT_LABELS } from '@/lib/paycheckCalculations';
import { formatCurrency } from '@/lib/formatters';
import BudgetCard from './BudgetCard';

interface PaycheckCardProps {
  paycheckBreakdown: PaycheckBreakdown;
}

type ViewMode = 'paycheck' | 'allocation';

function LineRow({
  label,
  amount,
  variant = 'default',
  note,
}: {
  label: string;
  amount: number;
  variant?: 'default' | 'deduction' | 'tax' | 'net' | 'subtotal' | 'positive';
  note?: string;
}) {
  const amountClass =
    variant === 'net'
      ? 'text-green-600 dark:text-green-400 font-bold text-base'
      : variant === 'deduction' || variant === 'tax'
      ? 'text-red-600 dark:text-red-400 font-medium'
      : variant === 'subtotal'
      ? 'text-gray-700 dark:text-gray-300 font-semibold'
      : variant === 'positive'
      ? 'text-blue-600 dark:text-blue-400 font-medium'
      : 'text-gray-700 dark:text-gray-200 font-medium';

  const labelClass =
    variant === 'net'
      ? 'text-sm font-semibold text-gray-800 dark:text-gray-100'
      : variant === 'subtotal'
      ? 'text-sm font-semibold text-gray-700 dark:text-gray-200'
      : 'text-sm text-gray-600 dark:text-gray-400';

  return (
    <div className="flex justify-between items-baseline py-1.5">
      <div>
        <span className={labelClass}>{label}</span>
        {note && <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">({note})</span>}
      </div>
      <span className={`text-sm tabular-nums ${amountClass}`}>
        {variant === 'deduction' || variant === 'tax' ? '−' : ''}{formatCurrency(Math.abs(amount))}
      </span>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mt-3 mb-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</span>
      <div className="flex-1 border-t border-gray-100 dark:border-gray-700" />
    </div>
  );
}

export default function PaycheckCard({ paycheckBreakdown }: PaycheckCardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('paycheck');
  const { frequency, paychecksPerYear, grossPerPaycheck, preTaxDeductions, taxes, afterTaxRetirement, employerMatch, netPerPaycheck, allocations, bufferPerPaycheck } = paycheckBreakdown;

  const shortLabel = PAY_FREQUENCY_SHORT_LABELS[frequency];

  const totalPreTax = preTaxDeductions.reduce((s, i) => s + i.perPaycheck, 0);
  const totalTaxes = taxes.reduce((s, i) => s + i.perPaycheck, 0);
  const totalAfterTaxRetirement = afterTaxRetirement.reduce((s, i) => s + i.perPaycheck, 0);
  const totalAllocations = allocations.reduce((s, i) => s + i.perPaycheck, 0);

  return (
    <BudgetCard title={`${shortLabel} Paycheck`} accent="green">
      {/* View toggle */}
      <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 mb-4 text-sm">
        <button
          onClick={() => setViewMode('paycheck')}
          className={`flex-1 py-1.5 font-medium transition-colors ${
            viewMode === 'paycheck'
              ? 'bg-green-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          Paycheck Detail
        </button>
        <button
          onClick={() => setViewMode('allocation')}
          className={`flex-1 py-1.5 font-medium transition-colors ${
            viewMode === 'allocation'
              ? 'bg-green-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          Budget Allocation
        </button>
      </div>

      {viewMode === 'paycheck' ? (
        <div>
          {/* Gross */}
          <LineRow label="Gross Pay" amount={grossPerPaycheck} variant="subtotal" />

          {/* Pre-tax deductions */}
          {preTaxDeductions.length > 0 && (
            <>
              <SectionDivider label="Pre-tax Deductions" />
              {preTaxDeductions.map((item) => (
                <LineRow key={item.label} label={item.label} amount={item.perPaycheck} variant="deduction" />
              ))}
            </>
          )}

          {/* Taxes */}
          {taxes.length > 0 && (
            <>
              <SectionDivider label="Taxes Withheld" />
              {taxes.map((item) => (
                <LineRow key={item.label} label={item.label} amount={item.perPaycheck} variant="tax" />
              ))}
            </>
          )}

          {/* After-tax retirement */}
          {afterTaxRetirement.length > 0 && (
            <>
              <SectionDivider label="After-tax Deductions" />
              {afterTaxRetirement.map((item) => (
                <LineRow key={item.label} label={item.label} amount={item.perPaycheck} variant="deduction" />
              ))}
            </>
          )}

          {/* Net */}
          <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
            <LineRow label="Estimated Take-home Pay" amount={netPerPaycheck} variant="net" />
          </div>

          {/* Employer match informational */}
          {employerMatch && (
            <div className="mt-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-xs text-blue-700 dark:text-blue-300 flex justify-between">
              <span>🎁 Employer match (not deducted)</span>
              <span className="font-semibold tabular-nums">+{formatCurrency(employerMatch.perPaycheck)}</span>
            </div>
          )}

          <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 text-center">
            {paychecksPerYear} paychecks / year · deductions are estimates
          </p>
        </div>
      ) : (
        <div>
          {/* Summary metrics */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center border border-green-100 dark:border-green-800">
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">Take-home</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-300">{formatCurrency(netPerPaycheck)}</p>
              <p className="text-xs text-green-500 dark:text-green-400">per {shortLabel.toLowerCase()}</p>
            </div>
            <div className={`rounded-lg p-3 text-center border ${bufferPerPaycheck >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'}`}>
              <p className={`text-xs font-medium ${bufferPerPaycheck >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>Buffer</p>
              <p className={`text-lg font-bold ${bufferPerPaycheck >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'}`}>{formatCurrency(bufferPerPaycheck)}</p>
              <p className={`text-xs ${bufferPerPaycheck >= 0 ? 'text-blue-500 dark:text-blue-400' : 'text-red-500 dark:text-red-400'}`}>per {shortLabel.toLowerCase()}</p>
            </div>
          </div>

          {/* Allocation lines */}
          <SectionDivider label="How Your Paycheck Is Allocated" />
          {allocations.map((item) => (
            <AllocationRow
              key={item.label}
              item={item}
              netPerPaycheck={netPerPaycheck}
            />
          ))}

          {/* Pre-tax and taxes summary */}
          <SectionDivider label="Taxes & Deductions" />
          {totalPreTax > 0 && (
            <LineRow label="Pre-tax deductions" amount={totalPreTax} variant="deduction" />
          )}
          {totalTaxes > 0 && (
            <LineRow label="Taxes withheld" amount={totalTaxes} variant="tax" />
          )}
          {totalAfterTaxRetirement > 0 && (
            <LineRow label="After-tax deductions" amount={totalAfterTaxRetirement} variant="deduction" />
          )}

          {/* Buffer line */}
          <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
            <div className="flex justify-between items-baseline py-1.5">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Allocated total</span>
              <span className="text-sm tabular-nums font-semibold text-gray-700 dark:text-gray-200">{formatCurrency(totalAllocations)}</span>
            </div>
            <div className="flex justify-between items-baseline py-1.5">
              <span className={`text-sm font-semibold ${bufferPerPaycheck >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'}`}>
                {bufferPerPaycheck >= 0 ? 'Remaining buffer' : 'Over budget by'}
              </span>
              <span className={`text-sm tabular-nums font-bold ${bufferPerPaycheck >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(Math.abs(bufferPerPaycheck))}
              </span>
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 text-center">
            {paychecksPerYear} paychecks / year · monthly × {paychecksPerYear !== 12 ? `(12/${paychecksPerYear})` : '1'}
          </p>
        </div>
      )}
    </BudgetCard>
  );
}

function AllocationRow({ item, netPerPaycheck }: { item: PaycheckLineItem; netPerPaycheck: number }) {
  const pct = netPerPaycheck > 0 ? Math.round((item.perPaycheck / netPerPaycheck) * 100) : 0;
  return (
    <div className="py-1.5">
      <div className="flex justify-between items-baseline mb-0.5">
        <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
        <span className="text-sm tabular-nums text-gray-700 dark:text-gray-200 font-medium">{formatCurrency(item.perPaycheck)}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-green-400 dark:bg-green-500 rounded-full h-1.5 transition-all"
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 w-7 text-right">{pct}%</span>
      </div>
    </div>
  );
}
