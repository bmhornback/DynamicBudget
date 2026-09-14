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

  // 401(k) annual contributions vs limit
  const annual401k = retirement.annual401k + retirement.annual401kCatchUp;
  const limit401k = ANNUAL_401K_LIMIT + (inputs.userAge >= 50 ? 7500 : 0); // 2026 catch-up is $7,500

  // IRA annual contributions vs limit
  const annualIRA = retirement.annualIRA + retirement.annualIRACatchUp;
  const limitIRA = ANNUAL_IRA_LIMIT + (inputs.userAge >= 50 ? 1000 : 0); // $1,000 catch-up

  // Emergency fund: monthly contributions × months needed
  const efTarget = inputs.emergencyFundTarget > 0
    ? inputs.emergencyFundTarget
    : emergencyFundTargetCalculated;
  const efMonthsToGoal = effectiveEmergencyFundContribution > 0 && efTarget > 0
    ? Math.ceil(efTarget / effectiveEmergencyFundContribution)
    : null;

  // House fund: monthly contributions vs target
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

        {/* Emergency fund */}
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-1 mt-2">
          Savings Goals
        </p>
        {efTarget > 0 ? (
          <div>
            <ProgressBar
              label="Emergency Fund"
              sublabel={
                efMonthsToGoal !== null
                  ? `${formatCurrency(effectiveEmergencyFundContribution)}/mo · ${efMonthsToGoal} mo to goal`
                  : undefined
              }
              current={effectiveEmergencyFundContribution}
              target={efTarget / (efMonthsToGoal ?? 1) || effectiveEmergencyFundContribution}
              colorClass="bg-emerald-500"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 -mt-1 mb-1">
              Target: {formatCurrency(efTarget)} (6 months of essentials)
              {efMonthsToGoal !== null && ` · ${efMonthsToGoal} months to reach goal`}
            </p>
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-1">
            No emergency fund contribution set.
          </p>
        )}

        {/* House fund / equity */}
        {!isHomeowner && houseTarget > 0 ? (
          <div>
            <ProgressBar
              label="House Down Payment"
              sublabel={
                houseMonthsToGoal !== null
                  ? `${formatCurrency(houseMonthly)}/mo · ${houseMonthsToGoal} mo to goal`
                  : undefined
              }
              current={houseMonthly}
              target={houseTarget / (houseMonthsToGoal ?? 1) || houseMonthly}
              colorClass="bg-violet-500"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 -mt-1 mb-1">
              Target: {formatCurrency(houseTarget)}
              {houseMonthsToGoal !== null && ` · ${houseMonthsToGoal} months to reach goal`}
            </p>
          </div>
        ) : !isHomeowner && houseMonthly > 0 ? (
          <ProgressBar
            label="House Fund"
            sublabel={`${formatCurrency(houseMonthly)}/mo`}
            current={houseMonthly}
            target={houseMonthly}
            colorClass="bg-violet-500"
          />
        ) : null}
      </div>
    </BudgetCard>
  );
}
