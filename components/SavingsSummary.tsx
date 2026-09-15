'use client';

import React from 'react';
import { DEFAULT_INPUTS } from '@/lib/defaultScenarios';
import type { BudgetBreakdown, BudgetInputs } from '@/types/budget';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import BudgetCard from './BudgetCard';

interface SavingsSummaryProps {
  breakdown: BudgetBreakdown;
  inputs?: BudgetInputs;
}

function SavingsRow({ label, monthly, annual, rate, highlight }: {
  label: string;
  monthly: number;
  annual?: number;
  rate?: number;
  highlight?: boolean;
}) {
  return (
    <div className={`flex justify-between items-baseline py-1.5 ${highlight ? 'font-semibold' : ''}`}>
      <span className={`text-sm ${highlight ? 'text-gray-900' : 'text-gray-600'}`}>{label}</span>
      <div className="text-right">
        <span className={`text-sm tabular-nums ${highlight ? 'text-gray-900' : 'text-gray-700'}`}>
          {formatCurrency(monthly)}/mo
        </span>
        {annual !== undefined && (
          <span className="block text-xs text-gray-500">{formatCurrency(annual)}/yr</span>
        )}
        {rate !== undefined && (
          <span className="block text-xs text-gray-500">{formatPercent(rate)} of gross</span>
        )}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-gray-100 my-1" />;
}

export default function SavingsSummary({ breakdown, inputs }: SavingsSummaryProps) {
  const {
    retirement,
    totalSavings,
    totalInvestments,
    totalDebtPayoff,
    annualHouseFund,
    annualTaxableInvestments,
    totalAnnualSavingsIncludingRetirement,
    savingsRateGross,
    savingsRateNet,
    netMonthlyIncome,
    grossMonthly,
    remainingMonthlyBuffer,
    isOverBudget,
    surplus,
    deficit,
  } = breakdown;

  const isPercentageMode = inputs?.isSavingsByPercentage ?? false;
  const savingsPercentOfNetIncome = Number.isFinite(inputs?.savingsPercentOfNetIncome)
    ? inputs?.savingsPercentOfNetIncome
    : DEFAULT_INPUTS.savingsPercentOfNetIncome;

  const bufferColor = isOverBudget
    ? 'text-red-600'
    : remainingMonthlyBuffer < 250
    ? 'text-amber-700'
    : 'text-green-600';

  return (
    <BudgetCard title="Savings & Buffer" accent="green">
      <div>
        <SavingsRow
          label={`401(k) Employee${retirement.is401kRoth ? ' (Roth)' : ''}`}
          monthly={retirement.monthly401k}
          annual={retirement.annual401k}
          rate={grossMonthly > 0 ? retirement.monthly401k / grossMonthly : 0}
        />
        {retirement.monthly401kCatchUp > 0 && (
          <SavingsRow
            label="401(k) Catch-Up (50+)"
            monthly={retirement.monthly401kCatchUp}
            annual={retirement.annual401kCatchUp}
          />
        )}
        {retirement.monthlyIRA > 0 && (
          <SavingsRow
            label="IRA"
            monthly={retirement.monthlyIRA}
            annual={retirement.annualIRA}
          />
        )}
        {retirement.monthlyIRACatchUp > 0 && (
          <SavingsRow
            label="IRA Catch-Up (50+)"
            monthly={retirement.monthlyIRACatchUp}
            annual={retirement.annualIRACatchUp}
          />
        )}
        {retirement.monthlyEmployerMatch > 0 && (
          <SavingsRow
            label={`Employer Match${retirement.monthlyEmployerMatchCapped < retirement.monthlyEmployerMatch ? ' (capped)' : ''} (bonus)`}
            monthly={retirement.monthlyEmployerMatchCapped}
            annual={retirement.annualEmployerMatchCapped}
          />
        )}
        <Divider />
        <SavingsRow
          label={isPercentageMode ? `Savings (${savingsPercentOfNetIncome}% of net income)` : "Total Savings"}
          monthly={totalSavings > 0 ? totalSavings : 0}
          annual={totalSavings * 12}
        />
        {!isPercentageMode && (
          <>
            <SavingsRow
              label={inputs?.housingMode === 'homeowner' ? 'Home Equity' : 'House Fund'}
              monthly={annualHouseFund / 12}
              annual={annualHouseFund}
            />
            <SavingsRow
              label="Taxable Investments"
              monthly={annualTaxableInvestments / 12}
              annual={annualTaxableInvestments}
            />
            <SavingsRow
              label="Other Investments"
              monthly={totalInvestments}
              annual={totalInvestments * 12}
            />
            <SavingsRow
              label="Debt Payoff"
              monthly={totalDebtPayoff}
              annual={totalDebtPayoff * 12}
            />
          </>
        )}
        <Divider />
        <div className="py-1.5">
          <div className="flex justify-between items-baseline font-semibold">
            <span className="text-sm text-gray-900">Total Annual Savings</span>
            <span className="text-sm tabular-nums">{formatCurrency(totalAnnualSavingsIncludingRetirement)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-0.5">
            <span>Savings rate (gross)</span>
            <span>{formatPercent(savingsRateGross)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Savings rate (net)</span>
            <span>{formatPercent(savingsRateNet)}</span>
          </div>
        </div>
        <Divider />

        {/* Buffer */}
        <div className={`flex justify-between items-baseline py-2 font-bold`}>
          <span className="text-sm text-gray-900">Monthly Buffer</span>
          <span className={`text-lg tabular-nums ${bufferColor}`}>
            {isOverBudget
              ? `− ${formatCurrency(deficit)}`
              : `+ ${formatCurrency(surplus || remainingMonthlyBuffer)}`}
          </span>
        </div>

        {/* Buffer bar */}
        {!isOverBudget && (
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                remainingMonthlyBuffer >= 500
                  ? 'bg-green-500'
                  : remainingMonthlyBuffer >= 250
                  ? 'bg-yellow-500'
                  : 'bg-red-400'
              }`}
              style={{
                width: `${Math.min(100, (remainingMonthlyBuffer / (netMonthlyIncome || 1)) * 100)}%`,
              }}
            />
          </div>
        )}

        {isOverBudget && (
          <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            ⚠️ Over budget by {formatCurrency(deficit)}/month
          </div>
        )}
      </div>
    </BudgetCard>
  );
}
