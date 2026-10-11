'use client';

import { useMemo } from 'react';
import type { BudgetInputs, IncomeHistory } from '@/types/budget';
import { getMonthlyIncomeSummary } from '@/lib/incomeTrends';
import { formatCurrency } from '@/lib/formatters';

interface IncomeTrendAnalysisProps {
  incomeHistory: IncomeHistory | undefined;
  inputs: Pick<BudgetInputs, 'annualSalary' | 'annualCommissionIncome'>;
}

export default function IncomeTrendAnalysis({ incomeHistory, inputs }: IncomeTrendAnalysisProps) {
  const monthlySummary = useMemo(
    () => (incomeHistory ? getMonthlyIncomeSummary(incomeHistory) : []),
    [incomeHistory]
  );

  if (!incomeHistory || monthlySummary.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">📊 Income Trends</h2>
        <p className="text-sm text-gray-500">
          Start logging base pay and commission to track actual monthly earnings.
        </p>
      </div>
    );
  }

  const avgBase = monthlySummary.reduce((sum, row) => sum + row.basePay, 0) / monthlySummary.length;
  const avgCommission = monthlySummary.reduce((sum, row) => sum + row.commission, 0) / monthlySummary.length;
  const avgTotal = monthlySummary.reduce((sum, row) => sum + row.totalPay, 0) / monthlySummary.length;
  const projectedBase = inputs.annualSalary / 12;
  const projectedCommission = inputs.annualCommissionIncome / 12;
  const projectedTotal = projectedBase + projectedCommission;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <h2 className="text-lg font-bold text-gray-900">📊 Income Trends</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Avg Base Pay</p>
          <p className="text-sm font-semibold text-gray-900">{formatCurrency(avgBase)}</p>
          <p className="text-xs text-gray-500">Projected: {formatCurrency(projectedBase)}</p>
        </div>
        <div className="rounded bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Avg Commission</p>
          <p className="text-sm font-semibold text-gray-900">{formatCurrency(avgCommission)}</p>
          <p className="text-xs text-gray-500">Projected: {formatCurrency(projectedCommission)}</p>
        </div>
        <div className="rounded bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Avg Total Pay</p>
          <p className="text-sm font-semibold text-gray-900">{formatCurrency(avgTotal)}</p>
          <p className="text-xs text-gray-500">Projected: {formatCurrency(projectedTotal)}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="py-2 text-left font-medium">Month</th>
              <th className="py-2 text-right font-medium">Base Pay</th>
              <th className="py-2 text-right font-medium">Commission</th>
              <th className="py-2 text-right font-medium">Total Pay</th>
            </tr>
          </thead>
          <tbody>
            {[...monthlySummary].reverse().map((row) => (
              <tr key={row.month} className="border-b border-gray-100 text-gray-800">
                <td className="py-2">{row.month}</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(row.basePay)}</td>
                <td className="py-2 text-right tabular-nums">{formatCurrency(row.commission)}</td>
                <td className="py-2 text-right tabular-nums font-semibold">{formatCurrency(row.totalPay)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
