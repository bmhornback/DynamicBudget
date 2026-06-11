'use client';

import React from 'react';
import type { BudgetHealthScore as BudgetHealthScoreType } from '@/types/budget';
import { HEALTH_SCORE_COLORS, HEALTH_SCORE_BG_COLORS } from '@/lib/budgetHealthScore';
import BudgetCard from './BudgetCard';

interface BudgetHealthScoreProps {
  healthScore: BudgetHealthScoreType;
}

const BREAKDOWN_LABELS: Record<string, string> = {
  rentAffordability: 'Rent Affordability',
  retirementRate: 'Retirement Savings',
  emergencyFundContrib: 'Emergency Fund',
  houseFundContrib: 'House Fund',
  monthlyBuffer: 'Monthly Buffer',
  debtCarBurden: 'Car / Debt Burden',
  petCostBurden: 'Pet Cost Burden',
  totalSavingsRate: 'Total Savings Rate',
};

const BREAKDOWN_MAX: Record<string, number> = {
  rentAffordability: 20,
  retirementRate: 20,
  emergencyFundContrib: 15,
  houseFundContrib: 10,
  monthlyBuffer: 15,
  debtCarBurden: 10,
  petCostBurden: 5,
  totalSavingsRate: 5,
};

export default function BudgetHealthScore({ healthScore }: BudgetHealthScoreProps) {
  const { score, label, breakdown } = healthScore;
  const colorClass = HEALTH_SCORE_COLORS[label];
  const bgClass = HEALTH_SCORE_BG_COLORS[label];

  return (
    <BudgetCard title="Budget Health Score">
      {/* Score display */}
      <div className="flex items-center gap-5 mb-5">
        <div className="relative w-20 h-20 shrink-0">
          <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${score}, 100`}
              className={colorClass}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${colorClass}`}>{score}</span>
          </div>
        </div>
        <div>
          <div className={`text-2xl font-bold ${colorClass}`}>{label}</div>
          <div className="text-sm text-gray-500 mt-1">out of 100</div>
        </div>
      </div>

      {/* Breakdown bars */}
      <div className="space-y-2">
        {Object.entries(breakdown).map(([key, value]) => {
          const max = BREAKDOWN_MAX[key] ?? 10;
          const pct = (value / max) * 100;
          return (
            <div key={key}>
              <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                <span>{BREAKDOWN_LABELS[key] ?? key}</span>
                <span>{value}/{max}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${bgClass}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </BudgetCard>
  );
}
