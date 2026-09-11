'use client';

import React, { useMemo } from 'react';
import type { BudgetInputs, SpendingHistory } from '@/types/budget';
import {
  calculateAllCategoryMetrics,
  generateSpendingInsights,
  CATEGORY_CONFIG,
} from '@/lib/spendingTrends';

interface TrendAnalysisProps {
  spendingHistory: SpendingHistory | undefined;
  inputs: BudgetInputs;
}

export default function TrendAnalysis({
  spendingHistory,
  inputs,
}: TrendAnalysisProps) {
  const metrics = useMemo(() => {
    if (!spendingHistory) return [];
    return calculateAllCategoryMetrics(spendingHistory, inputs);
  }, [spendingHistory, inputs]);

  const insights = useMemo(() => {
    if (!spendingHistory) return [];
    return generateSpendingInsights(spendingHistory, inputs);
  }, [spendingHistory, inputs]);

  const categoriesWithData = metrics.filter((m) => m.totalSpent > 0);

  if (!spendingHistory || categoriesWithData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          📈 Spending Trends
        </h2>
        <p className="text-sm text-gray-500">
          Start logging your spending to see trends and insights.
        </p>
      </div>
    );
  }

  const trendInsights = insights.filter((i) => i.type === 'warning');
  const positiveInsights = insights.filter((i) => i.type === 'positive');

  return (
    <div className="space-y-4">
      {/* Insights Section */}
      {insights.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">💡 Insights</h2>
          <div className="space-y-3">
            {trendInsights.map((insight) => (
              <div
                key={insight.id}
                className="border-l-4 border-orange-400 bg-orange-50 p-3 rounded"
              >
                <p className="text-sm font-medium text-orange-900">
                  ⚠️ {insight.title}
                </p>
                <p className="text-xs text-orange-800 mt-1">{insight.message}</p>
              </div>
            ))}
            {positiveInsights.map((insight) => (
              <div
                key={insight.id}
                className="border-l-4 border-green-400 bg-green-50 p-3 rounded"
              >
                <p className="text-sm font-medium text-green-900">
                  ✓ {insight.title}
                </p>
                <p className="text-xs text-green-800 mt-1">{insight.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          📊 Category Breakdown
        </h2>
        <div className="space-y-4">
          {categoriesWithData.map((metric) => (
            <div key={metric.category} className="border border-gray-100 rounded-lg p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {metric.label}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {metric.entries.length} entries tracked
                  </p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  metric.trend === 'up'
                    ? 'bg-orange-100 text-orange-700'
                    : metric.trend === 'down'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {metric.trend === 'up' ? '📈' : metric.trend === 'down' ? '📉' : '➡️'}
                  {' '}
                  {metric.trendPercent > 0 ? '+' : ''}
                  {metric.trendPercent.toFixed(1)}%
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Current Month */}
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-500 mb-1">This Month</p>
                  <p className="text-sm font-semibold text-gray-900">
                    ${metric.currentMonthSpent.toFixed(2)}
                  </p>
                  <p className={`text-xs mt-1 ${
                    metric.variance > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {metric.variance > 0 ? '+' : ''}
                    ${metric.variance.toFixed(2)} vs budget
                  </p>
                </div>

                {/* Average */}
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-500 mb-1">Avg/Month</p>
                  <p className="text-sm font-semibold text-gray-900">
                    ${metric.averageMonthly.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Budgeted: ${metric.budgetedMonthly.toFixed(2)}
                  </p>
                </div>

                {/* Total Tracked */}
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-500 mb-1">Total Tracked</p>
                  <p className="text-sm font-semibold text-gray-900">
                    ${metric.totalSpent.toFixed(2)}
                  </p>
                </div>

                {/* Forecast */}
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-500 mb-1">Next Month (Est.)</p>
                  <p className="text-sm font-semibold text-gray-900">
                    ${metric.forecastNextMonth.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              {metric.budgetedMonthly > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs font-medium text-gray-600">
                      Current Month Progress
                    </p>
                    <p className="text-xs text-gray-600">
                      {Math.round(
                        (metric.currentMonthSpent / metric.budgetedMonthly) * 100
                      )}%
                    </p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        metric.currentMonthSpent > metric.budgetedMonthly
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          (metric.currentMonthSpent /
                            metric.budgetedMonthly) *
                            100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Entries */}
      {categoriesWithData.some((m) => m.entries.length > 0) && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            📝 Recent Entries
          </h2>
          <div className="space-y-2">
            {categoriesWithData
              .flatMap((m) =>
                m.entries.map((e) => ({
                  ...e,
                  label: CATEGORY_CONFIG[e.category].label,
                }))
              )
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 10)
              .map((entry) => (
                <div
                  key={entry.id}
                  className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {entry.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(entry.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                      {entry.note && ` • ${entry.note}`}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    ${entry.amount.toFixed(2)}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
