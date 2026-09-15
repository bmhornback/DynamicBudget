'use client';

import React from 'react';
import type { DecisionSupportSummary } from '@/types/budget';
import BudgetCard from './BudgetCard';

interface DecisionSupportCardProps {
  summaries: DecisionSupportSummary[];
}

export default function DecisionSupportCard({ summaries }: DecisionSupportCardProps) {
  const priorityStyles = {
    high: 'bg-red-50 text-red-700 border-red-100',
    medium: 'bg-amber-50 text-amber-700 border-amber-100',
    low: 'bg-blue-50 text-blue-700 border-blue-100',
  };

  return (
    <BudgetCard title="Decision Support" accent="purple">
      {summaries.length === 0 ? (
        <p className="text-sm text-gray-600">
          Add goals, debts, or annual expenses to unlock richer timing and tradeoff summaries.
        </p>
      ) : (
        <div className="space-y-3">
          {summaries.map((summary) => (
            <div key={summary.id} className="rounded-lg border border-gray-100 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">{summary.title}</p>
                <span className={`rounded-full border px-2 py-1 text-xs font-medium ${priorityStyles[summary.priority]}`}>
                  {summary.priority}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-800">{summary.summary}</p>
              <p className="mt-1 text-xs text-gray-600">{summary.detail}</p>
            </div>
          ))}
        </div>
      )}
    </BudgetCard>
  );
}
