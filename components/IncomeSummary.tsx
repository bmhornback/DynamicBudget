'use client';

import React from 'react';
import type { BudgetBreakdown, BudgetInputs } from '@/types/budget';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import BudgetCard from './BudgetCard';

interface IncomeSummaryProps {
  breakdown: BudgetBreakdown;
  inputs: BudgetInputs;
}

function Row({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-baseline py-1.5 ${highlight ? 'font-semibold' : ''}`}>
      <span className={`text-sm ${highlight ? 'text-gray-900' : 'text-gray-600'}`}>{label}</span>
      <span className={`text-sm tabular-nums ${highlight ? 'text-gray-900' : 'text-gray-700'}`}>
        {value}
        {sub && <span className="text-xs text-gray-500 ml-1">{sub}</span>}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-gray-100 my-1" />;
}

export default function IncomeSummary({ breakdown, inputs }: IncomeSummaryProps) {
  const { taxes, retirement, grossMonthly, netMonthlyIncome, isDualIncome } = breakdown;
  const supplementalIncomeAnnual = taxes.supplementalIncomeAnnual;
  const supplementalIncomeMonthly = supplementalIncomeAnnual / 12;
  const bonusTaxModeLabel = inputs.bonusTaxMode === 'lump_sum_withholding'
    ? 'Lump-sum withholding (federal 22%)'
    : 'Blended annual rate';

  return (
    <BudgetCard title={isDualIncome ? 'Household Income Summary' : 'Income Summary'} accent="blue">
      <div className="space-y-0">
        {isDualIncome ? (
          <>
            <Row
              label="Your Gross Annual Salary"
              value={formatCurrency(inputs.annualSalary + inputs.bonusIncome)}
            />
            <Row
              label="Partner Gross Annual Salary"
              value={formatCurrency(inputs.partnerAnnualSalary + inputs.partnerBonusIncome)}
            />
            <Row
              label="Combined Household Gross"
              value={formatCurrency(taxes.grossAnnual)}
              highlight
            />
            <Row
              label="Combined Gross Monthly"
              value={formatCurrency(grossMonthly)}
            />
          </>
        ) : (
          <>
            <Row
              label="Gross Annual Salary"
              value={formatCurrency(taxes.grossAnnual)}
              highlight
            />
            <Row
              label="Gross Monthly Income"
              value={formatCurrency(grossMonthly)}
            />
          </>
        )}
        {supplementalIncomeAnnual > 0 && (
          <Row
            label="Supplemental Income (included in gross)"
            value={formatCurrency(supplementalIncomeMonthly)}
            sub={`${formatCurrency(supplementalIncomeAnnual)}/yr`}
          />
        )}
        <Row
          label="Bonus Tax Modeling"
          value={bonusTaxModeLabel}
        />
        <Divider />
        <Row
          label="Federal Income Tax (est.)"
          value={`− ${formatCurrency(taxes.federalMonthly)}/mo`}
          sub={`${formatCurrency(taxes.federalAnnual)}/yr`}
        />
        <Row
          label="State Income Tax (est.)"
          value={`− ${formatCurrency(taxes.stateMonthly)}/mo`}
          sub={`${formatCurrency(taxes.stateAnnual)}/yr`}
        />
        <Row
          label="Payroll Taxes (est.)"
          value={`− ${formatCurrency(taxes.payrollMonthly)}/mo`}
          sub={`${formatCurrency(taxes.payrollAnnual)}/yr`}
        />
        <Row
          label="Effective Tax Rate"
          value={formatPercent(taxes.effectiveTaxRate)}
        />
        <Divider />
        <Row
          label="401(k) Contribution"
          value={`− ${formatCurrency(retirement.monthly401k)}/mo`}
          sub={`${formatCurrency(retirement.annual401k)}/yr${retirement.isMaxing401k ? ' ✓ MAX' : ''}`}
        />
        {isDualIncome && breakdown.partnerRetirement && breakdown.partnerRetirement.monthly401k > 0 && (
          <Row
            label="Partner 401(k) Contribution"
            value={`− ${formatCurrency(breakdown.partnerRetirement.monthly401k)}/mo`}
            sub={`${formatCurrency(breakdown.partnerRetirement.annual401k)}/yr${breakdown.partnerRetirement.isMaxing401k ? ' ✓ MAX' : ''}`}
          />
        )}
        {retirement.monthlyIRA > 0 && (
          <Row
            label="IRA Contribution"
            value={`− ${formatCurrency(retirement.monthlyIRA)}/mo`}
            sub={`${formatCurrency(retirement.annualIRA)}/yr`}
          />
        )}
        {retirement.monthlyEmployerMatch > 0 && (
          <Row
            label="Employer 401(k) Match"
            value={`+ ${formatCurrency(retirement.monthlyEmployerMatch)}/mo`}
            sub="(not in take-home)"
          />
        )}
        {isDualIncome && breakdown.partnerRetirement && breakdown.partnerRetirement.monthlyEmployerMatch > 0 && (
          <Row
            label="Partner Employer Match"
            value={`+ ${formatCurrency(breakdown.partnerRetirement.monthlyEmployerMatch)}/mo`}
            sub="(not in take-home)"
          />
        )}
        <Divider />
        <Row
          label={isDualIncome ? 'Est. Combined Take-Home' : 'Est. Monthly Take-Home'}
          value={formatCurrency(netMonthlyIncome)}
          highlight
        />
        <div className="mt-2 p-2 rounded-lg bg-blue-50 text-xs text-blue-600">
          ⚠️ Tax figures are estimates only — not actual tax filing calculations.
        </div>
      </div>
    </BudgetCard>
  );
}
