'use client';

import React from 'react';
import type { Recommendation } from '@/types/budget';
import BudgetCard from './BudgetCard';

interface RecommendationListProps {
  recommendations: Recommendation[];
}

const SEVERITY_STYLES = {
  warning: {
    container: 'bg-amber-50 border-amber-200',
    icon: '⚠️',
    title: 'text-amber-800',
    detail: 'text-amber-700',
  },
  info: {
    container: 'bg-blue-50 border-blue-200',
    icon: 'ℹ️',
    title: 'text-blue-800',
    detail: 'text-blue-700',
  },
  success: {
    container: 'bg-green-50 border-green-200',
    icon: '✅',
    title: 'text-green-800',
    detail: 'text-green-700',
  },
};

export default function RecommendationList({ recommendations }: RecommendationListProps) {
  if (recommendations.length === 0) {
    return (
      <BudgetCard title="Recommendations">
        <p className="text-sm text-gray-400 italic">No recommendations — budget looks great!</p>
      </BudgetCard>
    );
  }

  // Sort: warnings first, then info, then success
  const sorted = [...recommendations].sort((a, b) => {
    const order = { warning: 0, info: 1, success: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <BudgetCard title="Recommendations & Warnings">
      <div className="space-y-2">
        {sorted.map((rec) => {
          const style = SEVERITY_STYLES[rec.severity];
          return (
            <div
              key={rec.id}
              className={`flex gap-3 p-3 rounded-lg border ${style.container}`}
            >
              <span className="text-base shrink-0 mt-0.5">{style.icon}</span>
              <div>
                <p className={`text-sm font-medium ${style.title}`}>{rec.message}</p>
                {rec.detail && (
                  <p className={`text-xs mt-0.5 ${style.detail}`}>{rec.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </BudgetCard>
  );
}
