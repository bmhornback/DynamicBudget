'use client';

import React from 'react';
import type { AnnualExpensePlan } from '@/types/budget';
import { formatCurrency } from '@/lib/formatters';
import { ANNUAL_EXPENSE_MONTH_LABELS } from '@/lib/annualExpenses';
import BudgetCard from './BudgetCard';

interface SinkingFundsCardProps {
  annualExpensePlan: AnnualExpensePlan[];
  totalMonthly: number;
}

export default function SinkingFundsCard({
  annualExpensePlan,
  totalMonthly,
}: SinkingFundsCardProps) {
  return (
    <BudgetCard title="Sinking Funds & Annual Expenses">
      {annualExpensePlan.length === 0 ? (
        <p className="text-sm text-gray-600">
          Add recurring annual expenses in the form to reserve monthly cash for insurance, travel, maintenance, and other non-monthly bills.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Monthly reserve</p>
            <p className="mt-1 text-lg font-semibold text-blue-900">{formatCurrency(totalMonthly)}</p>
          </div>

          {annualExpensePlan.map((expense) => {
            const monthLabel = ANNUAL_EXPENSE_MONTH_LABELS[Math.max(0, Math.min(11, expense.dueMonth - 1))];
            const statusLabel = expense.isFullyFunded
              ? 'Funded'
              : expense.isDueSoon
                ? 'Due soon'
                : 'Building';
            const statusClasses = expense.isFullyFunded
              ? 'bg-green-50 text-green-700'
              : expense.isDueSoon
                ? 'bg-amber-50 text-amber-700'
                : 'bg-blue-50 text-blue-700';

            return (
              <div key={expense.id} className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{expense.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{expense.category.replace('_', ' ')} · Due {monthLabel}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClasses}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full ${expense.isFullyFunded ? 'bg-green-500' : expense.isDueSoon ? 'bg-amber-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.max(4, expense.fundedRatio * 100)}%` }}
                  />
                </div>

                <div className="mt-2 space-y-1 text-xs text-gray-600">
                  <div className="flex items-center justify-between gap-2">
                    <span>Annual amount</span>
                    <span className="font-medium text-gray-900">{formatCurrency(expense.annualAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Saved so far</span>
                    <span className="font-medium text-gray-900">{formatCurrency(expense.currentSaved)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Needed per month</span>
                    <span className="font-medium text-gray-900">{formatCurrency(expense.recommendedMonthlyContribution)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Time remaining</span>
                    <span className="font-medium text-gray-900">
                      {expense.monthsUntilDue} month{expense.monthsUntilDue === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </BudgetCard>
  );
}
