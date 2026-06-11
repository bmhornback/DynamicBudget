'use client';

import React from 'react';
import type { BudgetBreakdown, BudgetInputs } from '@/types/budget';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import BudgetCard from './BudgetCard';

interface ExpenseSummaryProps {
  breakdown: BudgetBreakdown;
  inputs: BudgetInputs;
}

function SummaryRow({
  label,
  value,
  percent,
  warning,
}: {
  label: string;
  value: number;
  percent?: number;
  warning?: boolean;
}) {
  return (
    <div className={`flex justify-between items-center py-1.5 ${warning ? 'text-amber-700' : ''}`}>
      <span className={`text-sm ${warning ? 'text-amber-700' : 'text-gray-600'}`}>{label}</span>
      <div className="text-right">
        <span className="text-sm font-medium tabular-nums">{formatCurrency(value)}</span>
        {percent !== undefined && (
          <span className="text-xs text-gray-400 ml-1">({formatPercent(percent)})</span>
        )}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-gray-100 my-1" />;
}

export default function ExpenseSummary({ breakdown, inputs }: ExpenseSummaryProps) {
  const {
    totalHousing,
    totalUtilities,
    totalTransportation,
    totalPets,
    totalGroceriesFood,
    totalHealth,
    totalLifestyle,
    totalAllocated,
    netMonthlyIncome,
    rentAsPercentGross,
    rentAsPercentTakeHome,
    petCostsAsPercentTakeHome,
    carCostsAsPercentTakeHome,
  } = breakdown;

  return (
    <BudgetCard title="Expense Summary" accent="purple">
      <div>
        <SummaryRow
          label="Housing"
          value={totalHousing}
          percent={netMonthlyIncome > 0 ? totalHousing / netMonthlyIncome : 0}
          warning={rentAsPercentGross > 0.30}
        />
        <SummaryRow
          label="Utilities & Phone"
          value={totalUtilities}
          percent={netMonthlyIncome > 0 ? totalUtilities / netMonthlyIncome : 0}
        />
        <SummaryRow
          label="Transportation"
          value={totalTransportation}
          percent={carCostsAsPercentTakeHome}
          warning={carCostsAsPercentTakeHome > 0.15}
        />
        {inputs.petsEnabled && (
          <SummaryRow
            label="Pets"
            value={totalPets}
            percent={petCostsAsPercentTakeHome}
            warning={petCostsAsPercentTakeHome > 0.15}
          />
        )}
        <SummaryRow
          label="Groceries & Food"
          value={totalGroceriesFood}
          percent={netMonthlyIncome > 0 ? totalGroceriesFood / netMonthlyIncome : 0}
        />
        <SummaryRow
          label="Health & Medical"
          value={totalHealth}
          percent={netMonthlyIncome > 0 ? totalHealth / netMonthlyIncome : 0}
        />
        <SummaryRow
          label="Lifestyle"
          value={totalLifestyle}
          percent={netMonthlyIncome > 0 ? totalLifestyle / netMonthlyIncome : 0}
        />
        <Divider />
        <div className="flex justify-between items-center py-1.5 font-semibold">
          <span className="text-sm text-gray-900">Total Expenses</span>
          <span className="text-sm tabular-nums">{formatCurrency(totalAllocated)}</span>
        </div>

        {/* Rent percentages */}
        <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-1 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>Rent as % of gross</span>
            <span className={rentAsPercentGross > 0.30 ? 'text-amber-600 font-medium' : ''}>
              {formatPercent(rentAsPercentGross)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Rent as % of take-home</span>
            <span className={rentAsPercentTakeHome > 0.40 ? 'text-red-600 font-medium' : ''}>
              {formatPercent(rentAsPercentTakeHome)}
            </span>
          </div>
        </div>
      </div>
    </BudgetCard>
  );
}
