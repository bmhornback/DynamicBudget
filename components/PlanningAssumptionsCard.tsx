'use client';

import React from 'react';
import type { BudgetBreakdown, BudgetInputs, RebalanceResult } from '@/types/budget';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import BudgetCard from './BudgetCard';

interface PlanningAssumptionsCardProps {
  breakdown: BudgetBreakdown;
  inputs: BudgetInputs;
  rebalanceResult: RebalanceResult | null;
}

export default function PlanningAssumptionsCard({
  breakdown,
  inputs,
  rebalanceResult,
}: PlanningAssumptionsCardProps) {
  const explanationRows = [
    {
      label: 'Take-home estimate',
      detail: `${formatPercent(breakdown.taxes.effectiveTaxRate)} effective tax rate across federal, state, and payroll taxes based on the current 2026 tables.`,
    },
    {
      label: 'Retirement treatment',
      detail: inputs.is401kRoth
        ? 'Roth 401(k) contributions stay after-tax, while Traditional IRA and HSA contributions reduce taxable income when enabled.'
        : 'Traditional 401(k), Traditional IRA, and HSA contributions reduce taxable income before take-home is estimated.',
    },
    {
      label: 'Budget adjustment mode',
      detail: inputs.budgetMode === 'auto'
        ? `Auto mode rebalances unlocked fields with the ${inputs.rebalanceStrategy.replaceAll('_', ' ')} strategy.${rebalanceResult ? ` Last rebalance changed ${rebalanceResult.changes.length} field${rebalanceResult.changes.length === 1 ? '' : 's'}.` : ''}`
        : 'Manual mode preserves your entered values and only recalculates totals.',
    },
    {
      label: 'Savings behavior',
      detail: inputs.isSavingsByPercentage
        ? `${inputs.savingsPercentOfNetIncome}% of take-home is reserved for flexible savings, and the linked savings fields are locked to avoid double-counting.`
        : 'Savings buckets use the monthly amounts you entered directly.',
    },
  ];

  if (inputs.partnerEnabled && breakdown.isDualIncome) {
    explanationRows.push({
      label: 'Household income model',
      detail: `Dual-income mode combines ${formatCurrency(breakdown.householdGrossMonthly)} gross household income per month and applies payroll tax caps to each earner separately.`,
    });
  }

  if (inputs.incomeVariabilityPercent > 0) {
    explanationRows.push({
      label: 'Irregular income guardrail',
      detail: `The irregular-income view stress-tests a ${inputs.incomeVariabilityPercent}% swing around your base salary to show tighter and stronger months.`,
    });
  }

  if (inputs.annualExpenses.length > 0) {
    explanationRows.push({
      label: 'Recurring annual bills',
      detail: `${formatCurrency(breakdown.totalSinkingFunds)}/month is reserved for ${inputs.annualExpenses.length} known non-monthly expense${inputs.annualExpenses.length === 1 ? '' : 's'}. This protects your monthly buffer without counting those dollars as long-term wealth-building savings.`,
    });
  }

  return (
    <BudgetCard title="Planning Assumptions" accent="yellow">
      <div className="space-y-4">
        <div className="space-y-2" role="list" aria-label="Budget explanation details">
          {explanationRows.map((row) => (
            <div key={row.label} role="listitem" className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">{row.label}</p>
              <p className="mt-1 text-sm text-amber-900">{row.detail}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Important limitations</p>
          <ul className="mt-2 space-y-1 text-sm text-gray-700">
            <li>• Estimates are for planning only and not for tax filing or investment advice.</li>
            <li>• County and city income taxes are not modeled, and some state surtax rules are simplified.</li>
            <li>• 2026 tax tables are in use; 2027 support can be added once official brackets are published.</li>
          </ul>
        </div>
      </div>
    </BudgetCard>
  );
}
