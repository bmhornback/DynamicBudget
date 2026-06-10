'use client';

import React from 'react';
import type { BudgetInputs, RebalanceStrategy, SurplusAllocation, RebalanceResult } from '@/types/budget';
import BudgetCard from './BudgetCard';

interface RebalanceControlsProps {
  inputs: BudgetInputs;
  rebalanceResult: RebalanceResult | null;
  onStrategyChange: (strategy: RebalanceStrategy) => void;
  onSurplusAllocationChange: (allocation: SurplusAllocation) => void;
  onRebalance: () => void;
  onReset: () => void;
}

const STRATEGY_OPTIONS: Array<{ value: RebalanceStrategy; label: string }> = [
  { value: 'reduce_lifestyle_first', label: 'Reduce lifestyle first' },
  { value: 'reduce_investments_first', label: 'Reduce investments first' },
  { value: 'reduce_house_fund_first', label: 'Reduce house fund first' },
  { value: 'reduce_flexible_proportionally', label: 'Reduce flexible proportionally' },
  { value: 'reduce_non_required_proportionally', label: 'Reduce non-required proportionally' },
  { value: 'recommendations_only', label: 'Show recommendations only' },
];

const SURPLUS_OPTIONS: Array<{ value: SurplusAllocation; label: string }> = [
  { value: 'house_fund', label: 'House Fund' },
  { value: 'emergency_fund', label: 'Emergency Fund' },
  { value: 'taxable_investments', label: 'Taxable Investments' },
  { value: 'lifestyle', label: 'Fun / Lifestyle' },
  { value: 'debt_payoff', label: 'Debt Payoff' },
  { value: 'evenly_unlocked_savings', label: 'Evenly across savings' },
  { value: 'leave_as_buffer', label: 'Leave as buffer' },
];

export default function RebalanceControls({
  inputs,
  rebalanceResult,
  onStrategyChange,
  onSurplusAllocationChange,
  onRebalance,
  onReset,
}: RebalanceControlsProps) {
  return (
    <BudgetCard title="Budget Controls">
      <div className="space-y-4">
        {/* Mode indicator */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            inputs.budgetMode === 'auto'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {inputs.budgetMode === 'auto' ? '⚡ Auto Mode' : '✋ Manual Mode'}
          </span>
          <span className="text-xs text-gray-400">
            {inputs.budgetMode === 'auto'
              ? 'Automatically adjusts unlocked fields when budget changes.'
              : 'Only recalculates. Fields not auto-adjusted.'}
          </span>
        </div>

        {/* Deficit strategy */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            When over budget, reduce:
          </label>
          <select
            value={inputs.rebalanceStrategy}
            onChange={(e) => onStrategyChange(e.target.value as RebalanceStrategy)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            {STRATEGY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Surplus allocation */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            When surplus available, put it toward:
          </label>
          <select
            value={inputs.surplusAllocation}
            onChange={(e) => onSurplusAllocationChange(e.target.value as SurplusAllocation)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            {SURPLUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRebalance}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            ⚖️ Auto Balance
          </button>
          <button
            type="button"
            onClick={onReset}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors"
          >
            🔄 Reset to Defaults
          </button>
        </div>

        {/* Rebalance result */}
        {rebalanceResult && (
          <div className={`p-3 rounded-lg text-sm ${
            rebalanceResult.success
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-amber-50 border border-amber-200 text-amber-800'
          }`}>
            <p className="font-medium mb-1">
              {rebalanceResult.success ? '✅' : '⚠️'} {rebalanceResult.message}
            </p>
            {rebalanceResult.changes.length > 0 && (
              <ul className="text-xs space-y-0.5 mt-2 border-t border-current border-opacity-20 pt-2">
                {rebalanceResult.changes.map((change) => (
                  <li key={change.fieldId} className="flex justify-between">
                    <span>{change.label}</span>
                    <span className={change.delta < 0 ? 'text-red-600' : 'text-green-600'}>
                      ${change.oldValue.toFixed(0)} → ${change.newValue.toFixed(0)}
                      {' '}({change.delta >= 0 ? '+' : ''}${change.delta.toFixed(0)})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </BudgetCard>
  );
}
