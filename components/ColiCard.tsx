'use client';

import React, { useState } from 'react';
import type { StateOfResidence } from '@/types/budget';
import { STATE_LABELS } from '@/lib/taxCalculations';
import {
  getColiIndex,
  getColiTierLabel,
  calculatePurchasingPower,
} from '@/lib/coliData';
import { formatCurrency } from '@/lib/formatters';
import BudgetCard from './BudgetCard';

interface ColiCardProps {
  currentState: StateOfResidence;
  annualSalary: number;
}

const STATE_OPTIONS = (
  Object.entries(STATE_LABELS) as Array<[StateOfResidence, string]>
).map(([value, label]) => ({ value, label }));

function DetailRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: 'green' | 'red';
}) {
  const valueClass =
    highlight === 'green'
      ? 'text-green-600 font-semibold'
      : highlight === 'red'
      ? 'text-red-600 font-semibold'
      : 'text-gray-800 font-medium';
  return (
    <div className="flex justify-between items-baseline py-1.5">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

export default function ColiCard({ currentState, annualSalary }: ColiCardProps) {
  // Default to GA (affordable) unless the user is already in GA, then default to CA (expensive).
  const defaultCompare: StateOfResidence = currentState === 'GA' ? 'CA' : 'GA';
  const [compareState, setCompareState] = useState<StateOfResidence>(defaultCompare);

  const currentIndex = getColiIndex(currentState);
  const compareIndex = getColiIndex(compareState);
  const currentLabel = STATE_LABELS[currentState] ?? currentState;
  const compareLabel = STATE_LABELS[compareState] ?? compareState;

  const equivalentSalaryInCompare = calculatePurchasingPower(annualSalary, currentState, compareState);
  const equivalentSalaryBackToCurrent = calculatePurchasingPower(annualSalary, compareState, currentState);

  const diff = compareIndex - currentIndex;
  const diffPercent = currentIndex > 0 ? Math.abs(((compareIndex - currentIndex) / currentIndex) * 100) : 0;
  const isMoreExpensive = compareIndex > currentIndex;
  const isSame = Math.abs(diff) < 0.5;

  return (
    <BudgetCard title="Cost of Living Comparison" accent="blue">
      {/* Comparison state selector */}
      <div className="mb-4">
        <label className="block text-xs text-gray-500 mb-1">Compare your budget to:</label>
        <select
          value={compareState}
          onChange={(e) => setCompareState(e.target.value as StateOfResidence)}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        >
          {STATE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* COLI index comparison */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center border border-blue-100 dark:border-blue-800">
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate">{currentLabel}</p>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{currentIndex.toFixed(1)}</p>
          <p className="text-xs text-blue-500 dark:text-blue-400">{getColiTierLabel(currentIndex)}</p>
        </div>
        <div
          className={`rounded-lg p-3 text-center border ${
            isSame
              ? 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700'
              : isMoreExpensive
              ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800'
              : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800'
          }`}
        >
          <p
            className={`text-xs font-medium truncate ${
              isSame
                ? 'text-gray-500 dark:text-gray-400'
                : isMoreExpensive
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            }`}
          >
            {compareLabel}
          </p>
          <p
            className={`text-2xl font-bold ${
              isSame
                ? 'text-gray-700 dark:text-gray-200'
                : isMoreExpensive
                ? 'text-red-700 dark:text-red-300'
                : 'text-green-700 dark:text-green-300'
            }`}
          >
            {compareIndex.toFixed(1)}
          </p>
          <p
            className={`text-xs ${
              isSame
                ? 'text-gray-400 dark:text-gray-500'
                : isMoreExpensive
                ? 'text-red-500 dark:text-red-400'
                : 'text-green-500 dark:text-green-400'
            }`}
          >
            {getColiTierLabel(compareIndex)}
          </p>
        </div>
      </div>

      {/* COLI difference summary */}
      {!isSame && (
        <div
          className={`text-xs rounded-lg px-3 py-2 mb-4 ${
            isMoreExpensive
              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
          }`}
        >
          {compareLabel} is{' '}
          <strong>{diffPercent.toFixed(1)}% {isMoreExpensive ? 'more expensive' : 'cheaper'}</strong> than{' '}
          {currentLabel}.
        </div>
      )}
      {isSame && (
        <div className="text-xs rounded-lg px-3 py-2 mb-4 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          {compareLabel} has a similar cost of living to {currentLabel}.
        </div>
      )}

      {/* Purchasing power rows */}
      <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
        <DetailRow
          label={`${formatCurrency(annualSalary)} in ${currentLabel} equals`}
          value={`${formatCurrency(equivalentSalaryInCompare)} in ${compareLabel}`}
          highlight={isSame ? undefined : isMoreExpensive ? 'red' : 'green'}
        />
        <DetailRow
          label={`${formatCurrency(annualSalary)} in ${compareLabel} equals`}
          value={`${formatCurrency(equivalentSalaryBackToCurrent)} in ${currentLabel}`}
          highlight={isSame ? undefined : isMoreExpensive ? 'green' : 'red'}
        />
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
        Index: US avg = 100. Source: MERIC 2023–2024 composite COLI.
      </p>
    </BudgetCard>
  );
}
