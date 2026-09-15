'use client';

import React from 'react';
import type { NamedBudget } from '@/types/budget';
import { SCENARIO_PRESETS } from '@/lib/defaultScenarios';
import type { ScenarioComparisonItem } from '@/lib/scenarioComparison';
import {
  buildPresetComparisonId,
  buildSavedBudgetComparisonId,
  MAX_COMPARISON_PRESETS,
  parseComparisonId,
} from '@/lib/scenarioComparison';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import BudgetCard from './BudgetCard';

interface ScenarioComparisonProps {
  items: ScenarioComparisonItem[];
  savedBudgets: NamedBudget[];
  selectedScenarioIds: string[];
  activePresetId?: string;
  onSelectionChange: (scenarioIds: string[]) => void;
  onApplyScenario: (scenarioId: string) => void;
}

const METRIC_ROWS: Array<{
  label: string;
  value: (item: ScenarioComparisonItem) => string;
}> = [
  { label: 'Annual Salary', value: (item) => formatCurrency(item.annualSalary) },
  { label: 'State', value: (item) => item.state },
  {
    label: 'Primary Housing Payment / Month',
    value: (item) => `${item.housingMode === 'homeowner' ? 'Mortgage' : 'Rent'}: ${formatCurrency(item.primaryHousingPayment)}`,
  },
  { label: 'Take-Home / Month', value: (item) => formatCurrency(item.takeHomeMonthly) },
  {
    label: 'Allocated / Month',
    value: (item) => formatCurrency(item.totalAllocatedMonthly),
  },
  {
    label: 'Monthly Buffer',
    value: (item) => formatCurrency(item.remainingMonthlyBuffer),
  },
  {
    label: 'Savings Rate',
    value: (item) => formatPercent(item.savingsRateGross),
  },
  {
    label: 'Health Score',
    value: (item) => `${item.healthScore.score} · ${item.healthScore.label}`,
  },
];

export default function ScenarioComparison({
  items,
  savedBudgets,
  selectedScenarioIds,
  activePresetId,
  onSelectionChange,
  onApplyScenario,
}: ScenarioComparisonProps) {
  const handleToggleScenario = (scenarioId: string) => {
    const parsed = parseComparisonId(scenarioId);
    if (parsed?.kind === 'preset' && parsed.id === activePresetId) return;

    if (selectedScenarioIds.includes(scenarioId)) {
      onSelectionChange(selectedScenarioIds.filter((id) => id !== scenarioId));
      return;
    }

    onSelectionChange([...selectedScenarioIds, scenarioId].slice(-MAX_COMPARISON_PRESETS));
  };

  return (
    <BudgetCard title="Scenario Comparison" accent="blue">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-gray-700">
              Compare your current budget against up to {MAX_COMPARISON_PRESETS} presets or saved budgets.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Load any compared scenario into the main editor when you want to continue from it.
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Scenario comparison presets">
              {SCENARIO_PRESETS.map((preset) => {
                const scenarioId = buildPresetComparisonId(preset.id);
                const isSelected = selectedScenarioIds.includes(scenarioId);
                const isActive = preset.id === activePresetId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleToggleScenario(scenarioId)}
                    aria-pressed={isSelected}
                    disabled={isActive}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                      isActive
                        ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                        : isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Scenario comparison saved budgets">
              {savedBudgets.length > 0 ? savedBudgets.map((budget) => {
                const scenarioId = buildSavedBudgetComparisonId(budget.id);
                const isSelected = selectedScenarioIds.includes(scenarioId);
                return (
                  <button
                    key={budget.id}
                    type="button"
                    onClick={() => handleToggleScenario(scenarioId)}
                    aria-pressed={isSelected}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1 ${
                      isSelected
                        ? 'border-purple-600 bg-purple-600 text-white'
                        : 'border-purple-200 bg-purple-50 text-purple-700 hover:border-purple-300 hover:text-purple-800'
                    }`}
                    title={budget.note || `Compare saved budget: ${budget.name}`}
                  >
                    💾 {budget.name}
                  </button>
                );
              }) : (
                <p className="text-xs text-gray-500">
                  Save a budget in <span className="font-medium">My Budgets</span> to compare it here.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Metric
                </th>
                {items.map((item) => (
                  <th key={item.id} className="min-w-48 border-b border-gray-100 px-3 py-2 text-left align-top">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{item.name}</span>
                        {item.isCurrent && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            Live
                          </span>
                        )}
                        {!item.isCurrent && item.sourceLabel && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                            {item.sourceLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{item.description}</p>
                      {!item.isCurrent && item.note && (
                        <p className="text-xs text-purple-700">{item.note}</p>
                      )}
                      {!item.isCurrent && (
                        <button
                          type="button"
                          onClick={() => onApplyScenario(item.id)}
                          className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-blue-300 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          Use this scenario
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRIC_ROWS.map((row) => (
                <tr key={row.label}>
                  <th className="sticky left-0 border-b border-gray-100 bg-white px-3 py-2 text-left text-xs font-medium text-gray-500">
                    {row.label}
                  </th>
                  {items.map((item) => (
                    <td
                      key={`${item.id}-${row.label}`}
                      className="border-b border-gray-100 px-3 py-2 text-sm font-medium text-gray-800"
                    >
                      {row.value(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </BudgetCard>
  );
}
