'use client';

import React from 'react';
import type { BudgetBreakdown, BudgetInputs } from '@/types/budget';
import { formatCurrency } from '@/lib/formatters';
import BudgetCard from './BudgetCard';
import { ANNUAL_401K_LIMIT, ANNUAL_IRA_LIMIT } from '@/lib/budgetCalculations';
import { ANNUAL_HSA_LIMIT_SELF, ANNUAL_HSA_LIMIT_FAMILY } from '@/lib/taxCalculations';

interface SavingsProgressCardProps {
  breakdown: BudgetBreakdown;
  inputs: BudgetInputs;
}

interface ProgressBarProps {
  label: string;
  sublabel?: string;
  current: number;
  target: number;
  colorClass?: string;
}

function ProgressBar({ label, sublabel, current, target, colorClass = 'bg-blue-500' }: ProgressBarProps) {
  const pct = target > 0 ? Math.min(1, current / target) : 0;
  const pctDisplay = Math.round(pct * 100);
  const isComplete = pct >= 1;

  return (
    <div className="py-2">
      <div className="flex justify-between items-baseline mb-1">
        <div>
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span>
          {sublabel && (
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1.5">{sublabel}</span>
          )}
        </div>
        <span className={`text-xs font-semibold tabular-nums ${isComplete ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'}`}>
          {isComplete ? '✓ Max' : `${pctDisplay}%`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : colorClass}`}
            style={{ width: `${pctDisplay}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">
          {formatCurrency(current)}&thinsp;/&thinsp;{formatCurrency(target)}
        </span>
      </div>
    </div>
  );
}

interface TimelineRowProps {
  label: string;
  monthly: number;
  target: number;
  monthsToGoal: number | null;
  targetLabel?: string;
  colorClass?: string;
}

function TimelineRow({ label, monthly, target, monthsToGoal, targetLabel, colorClass = 'bg-emerald-500' }: TimelineRowProps) {
  const yearsToGoal = monthsToGoal !== null ? Math.floor(monthsToGoal / 12) : null;
  const remainingMonths = monthsToGoal !== null ? monthsToGoal % 12 : null;
  const timeStr = monthsToGoal === null
    ? '—'
    : monthsToGoal <= 12
    ? `${monthsToGoal} mo`
    : `${yearsToGoal}y ${remainingMonths}m`;

  return (
    <div className="py-2">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {formatCurrency(monthly)}/mo
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${monthly > 0 ? colorClass : 'bg-gray-300'}`} />
        <span className="text-gray-600 dark:text-gray-400">
          Target: <span className="font-medium">{formatCurrency(target)}</span>
          {targetLabel && <span className="text-gray-500"> ({targetLabel})</span>}
        </span>
        {monthsToGoal !== null && (
          <span className="ml-auto text-gray-500 dark:text-gray-400 tabular-nums">
            ~{timeStr} to goal
          </span>
        )}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />;
}

export default function SavingsProgressCard({ breakdown, inputs }: SavingsProgressCardProps) {
  const {
    retirement,
    effectiveEmergencyFundContribution,
    effectiveHouseDownPaymentContribution,
    emergencyFundTargetCalculated,
  } = breakdown;

  const monthlyHSA = breakdown.monthlyHSA;

  // 401(k) annual contributions vs limit — annual401k already includes catch-up (age-adjusted cap)
  const annual401k = retirement.annual401k;
  const limit401k = ANNUAL_401K_LIMIT + (inputs.userAge >= 50 ? 7500 : 0); // 2026 catch-up is $7,500

  // IRA annual contributions vs limit — annualIRACatchUp is tracked separately from annualIRA
  const annualIRA = retirement.annualIRA + retirement.annualIRACatchUp;
  const limitIRA = ANNUAL_IRA_LIMIT + (inputs.userAge >= 50 ? 1000 : 0); // $1,000 catch-up

  // Emergency fund target and months-to-goal
  const efTarget = inputs.emergencyFundTarget > 0
    ? inputs.emergencyFundTarget
    : emergencyFundTargetCalculated;
  const efMonthsToGoal = effectiveEmergencyFundContribution > 0 && efTarget > 0
    ? Math.ceil(efTarget / effectiveEmergencyFundContribution)
    : null;

  // House fund months-to-goal
  const houseTarget = inputs.houseDownPaymentTarget;
  const houseMonthly = effectiveHouseDownPaymentContribution;
  const houseMonthsToGoal = houseMonthly > 0 && houseTarget > 0
    ? Math.ceil(houseTarget / houseMonthly)
    : null;

  const isHomeowner = inputs.housingMode === 'homeowner';

  return (
    <BudgetCard title="Savings Goal Progress" accent="green">
      <div>
        {/* Retirement accounts */}
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-1">
          Retirement Accounts
        </p>
        <ProgressBar
          label={`401(k)${retirement.is401kRoth ? ' (Roth)' : ''}`}
          sublabel={`${formatCurrency(annual401k / 12)}/mo`}
          current={annual401k}
          target={limit401k}
          colorClass="bg-blue-500"
        />
        {annualIRA > 0 && (
          <ProgressBar
            label={inputs.iraType === 'roth' ? 'Roth IRA' : 'Traditional IRA'}
            sublabel={`${formatCurrency(annualIRA / 12)}/mo`}
            current={annualIRA}
            target={limitIRA}
            colorClass="bg-indigo-500"
          />
        )}
        {monthlyHSA > 0 && (
          <ProgressBar
            label="HSA"
            sublabel={`${formatCurrency(monthlyHSA)}/mo`}
            current={monthlyHSA * 12}
            target={inputs.filingStatus === 'married_jointly' ? ANNUAL_HSA_LIMIT_FAMILY : ANNUAL_HSA_LIMIT_SELF}
            colorClass="bg-teal-500"
          />
        )}

        <Divider />

        {/* Savings goal timelines */}
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-1 mt-2">
          Savings Goal Timelines
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
          Time-to-goal based on current monthly contributions (starting from $0).
        </p>
        {efTarget > 0 ? (
          <TimelineRow
            label="Emergency Fund"
            monthly={effectiveEmergencyFundContribution}
            target={efTarget}
            monthsToGoal={efMonthsToGoal}
            targetLabel={inputs.emergencyFundTarget > 0 ? 'custom target' : '6 months of essentials'}
            colorClass="bg-emerald-500"
          />
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-1">
            No emergency fund contribution set.
          </p>
        )}

        {!isHomeowner && houseTarget > 0 && (
          <TimelineRow
            label="House Down Payment"
            monthly={houseMonthly}
            target={houseTarget}
            monthsToGoal={houseMonthsToGoal}
            colorClass="bg-violet-500"
          />
        )}
      </div>
    </BudgetCard>
  );
}
