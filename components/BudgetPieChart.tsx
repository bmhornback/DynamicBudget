'use client';

import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { BudgetBreakdown, BudgetInputs } from '@/types/budget';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import BudgetCard from './BudgetCard';

interface BudgetPieChartProps {
  breakdown: BudgetBreakdown;
  inputs: BudgetInputs;
}

const SLICE_COLORS: Record<string, string> = {
  Taxes: '#f87171',        // red-400
  Retirement: '#60a5fa',   // blue-400
  Housing: '#a78bfa',      // violet-400
  Utilities: '#94a3b8',    // slate-400
  Transportation: '#fb923c', // orange-400
  Pets: '#f472b6',         // pink-400
  'Food & Groceries': '#facc15', // yellow-400
  'Health, Medical & Insurance': '#34d399', // emerald-400
  Lifestyle: '#2dd4bf',    // teal-400
  'Savings & Investing': '#4ade80', // green-400
  'Debt Payoff': '#c084fc', // purple-400
  Buffer: '#e2e8f0',       // slate-200
  Deficit: '#ef4444',      // red-500
};

interface TooltipPayloadEntry {
  name: string;
  value: number;
  payload: { shareOfGross: number };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-900 dark:text-gray-100">{entry.name}</p>
      <p className="text-gray-700 dark:text-gray-300">{formatCurrency(entry.value)}/mo</p>
      <p className="text-gray-500 dark:text-gray-400">{formatPercent(entry.payload.shareOfGross)}</p>
    </div>
  );
}

export default function BudgetPieChart({ breakdown, inputs }: BudgetPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const gross = breakdown.grossMonthly;
  if (gross <= 0) return null;

  const taxTotal = breakdown.taxes.totalTaxMonthly;
  const retirementTotal =
    breakdown.retirement.monthly401k +
    breakdown.retirement.monthly401kCatchUp +
    breakdown.retirement.monthlyIRA +
    breakdown.retirement.monthlyIRACatchUp +
    breakdown.monthlyHSA;
  const savingsTotal = breakdown.totalSavings + breakdown.totalInvestments;
  const bufferRaw = breakdown.remainingMonthlyBuffer;

  const slices = [
    { name: 'Taxes', value: taxTotal },
    { name: 'Retirement', value: retirementTotal },
    { name: 'Housing', value: breakdown.totalHousing },
    { name: 'Utilities', value: breakdown.totalUtilities },
    { name: 'Transportation', value: breakdown.totalTransportation },
    ...(inputs.petsEnabled ? [{ name: 'Pets', value: breakdown.totalPets }] : []),
    { name: 'Food & Groceries', value: breakdown.totalGroceriesFood },
    { name: 'Health, Medical & Insurance', value: breakdown.totalHealth },
    { name: 'Lifestyle', value: breakdown.totalLifestyle },
    { name: 'Savings & Investing', value: savingsTotal },
    ...(breakdown.totalDebtPayoff > 0 ? [{ name: 'Debt Payoff', value: breakdown.totalDebtPayoff }] : []),
    ...(bufferRaw > 0
      ? [{ name: 'Buffer', value: bufferRaw }]
      : bufferRaw < 0
      ? [{ name: 'Deficit', value: Math.abs(bufferRaw) }]
      : []),
  ]
    .filter((s) => s.value > 0)
    .map((s) => ({ ...s, shareOfGross: s.value / gross }));

  return (
    <BudgetCard title="Monthly Budget Breakdown" accent="blue">
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Gross income: {formatCurrency(gross)}/mo
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={slices}
              cx="50%"
              cy="45%"
              innerRadius="52%"
              outerRadius="72%"
              paddingAngle={2}
              dataKey="value"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              stroke="none"
            >
              {slices.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={SLICE_COLORS[entry.name] ?? '#94a3b8'}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.5}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => {
                const item = slices.find((s) => s.name === value);
                return (
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {value}{' '}
                    <span className="text-gray-500">
                      ({item ? formatPercent(item.shareOfGross) : ''})
                    </span>
                  </span>
                );
              }}
              wrapperStyle={{ fontSize: '11px', lineHeight: '1.8' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </BudgetCard>
  );
}
