'use client';

import React from 'react';
import { SCENARIO_PRESETS } from '@/lib/defaultScenarios';
import type { ScenarioComparisonItem } from '@/lib/scenarioComparison';
import { MAX_COMPARISON_PRESETS } from '@/lib/scenarioComparison';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import BudgetCard from './BudgetCard';

interface ScenarioComparisonProps {
  items: ScenarioComparisonItem[];
  selectedPresetIds: string[];
  activePresetId?: string;
  onSelectionChange: (presetIds: string[]) => void;
  onApplyPreset: (presetId: string) => void;
}

const METRIC_ROWS: Array<{
  label: string;
  value: (item: ScenarioComparisonItem) => string;
}> = [
  { label: 'Annual Salary', value: (item) => formatCurrency(item.annualSalary) },
  { label: 'State', value: (item) => item.state },
  {
    label: 'Housing Payment / Month',
    value: (item) => `${item.housingMode === 'homeowner' ? 'Mortgage' : 'Rent'}: ${formatCurrency(item.housingPayment)}`,
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
  selectedPresetIds,
  activePresetId,
  onSelectionChange,
  onApplyPreset,
}: ScenarioComparisonProps) {
  const handleTogglePreset = (presetId: string) => {
    if (presetId === activePresetId) return;
    if (selectedPresetIds.includes(presetId)) {
      onSelectionChange(selectedPresetIds.filter((id) => id !== presetId));
      return;
    }

    onSelectionChange([...selectedPresetIds, presetId].slice(-MAX_COMPARISON_PRESETS));
  };

  return (
    <BudgetCard title="Scenario Comparison" accent="blue">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-gray-700">
              Compare your current budget against up to {MAX_COMPARISON_PRESETS} preset scenarios.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Load any compared preset into the main editor when you want to continue from it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Scenario comparison presets">
            {SCENARIO_PRESETS.map((preset) => {
              const isSelected = selectedPresetIds.includes(preset.id);
              const isActive = preset.id === activePresetId;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleTogglePreset(preset.id)}
                  aria-pressed={isSelected}
                  disabled={isActive}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
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
                      </div>
                      <p className="text-xs text-gray-500">{item.description}</p>
                      {!item.isCurrent && (
                        <button
                          type="button"
                          onClick={() => onApplyPreset(item.id)}
                          className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-blue-300 hover:text-blue-600"
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
