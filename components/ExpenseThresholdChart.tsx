'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { BudgetBreakdown, BudgetInputs } from '@/types/budget';
import { formatPercent } from '@/lib/formatters';
import BudgetCard from './BudgetCard';

interface ExpenseThresholdChartProps {
  breakdown: BudgetBreakdown;
  inputs: BudgetInputs;
}

interface CategoryEntry {
  name: string;
  value: number;   // % of take-home (0–1)
  threshold: number; // recommended max (0–1)
}

function categoryColor(value: number, threshold: number): string {
  const ratio = value / threshold;
  if (ratio > 1) return '#f87171';      // red-400 — over threshold
  if (ratio > 0.85) return '#fbbf24';  // amber-400 — approaching
  return '#4ade80';                     // green-400 — good
}

interface TooltipPayloadEntry {
  payload: CategoryEntry;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadEntry[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  const over = d.value > d.threshold;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-900 dark:text-gray-100">{d.name}</p>
      <p className={`${over ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}>
        {formatPercent(d.value)} of take-home
      </p>
      <p className="text-gray-500 dark:text-gray-400 text-xs">
        Recommended max: {formatPercent(d.threshold)}
      </p>
      {over && (
        <p className="text-red-500 text-xs font-medium mt-0.5">
          ⚠ {formatPercent(d.value - d.threshold)} over limit
        </p>
      )}
    </div>
  );
}

export default function ExpenseThresholdChart({ breakdown, inputs }: ExpenseThresholdChartProps) {
  const net = breakdown.netMonthlyIncome;
  if (net <= 0) return null;

  const pct = (v: number) => v / net;

  const data: CategoryEntry[] = [
    { name: 'Housing', value: pct(breakdown.totalHousing), threshold: 0.35 },
    { name: 'Transportation', value: pct(breakdown.totalTransportation), threshold: 0.15 },
    { name: 'Food & Groceries', value: pct(breakdown.totalGroceriesFood), threshold: 0.15 },
    { name: 'Utilities', value: pct(breakdown.totalUtilities), threshold: 0.10 },
    { name: 'Health', value: pct(breakdown.totalHealth), threshold: 0.10 },
    { name: 'Lifestyle', value: pct(breakdown.totalLifestyle), threshold: 0.10 },
    ...(inputs.petsEnabled
      ? [{ name: 'Pets', value: pct(breakdown.totalPets), threshold: 0.05 }]
      : []),
  ];

  const maxValue = Math.max(...data.map((d) => Math.max(d.value, d.threshold))) * 1.15;

  return (
    <BudgetCard title="Expenses vs Recommended Limits" accent="amber">
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Each bar shows % of take-home. Dashed line is recommended maximum.
        </p>
        <ResponsiveContainer width="100%" height={data.length * 46 + 20}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 48, left: 88, bottom: 0 }}
            barSize={14}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              domain={[0, maxValue]}
              tickFormatter={(v: number) => formatPercent(v)}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              width={84}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            {Array.from(new Set(data.map((d) => d.threshold))).map((threshold) => (
              <ReferenceLine
                key={`ref-${threshold}`}
                x={threshold}
                stroke="#94a3b8"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                ifOverflow="visible"
              />
            ))}
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={categoryColor(entry.value, entry.threshold)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-green-400" />Under limit</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-amber-400" />Approaching</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-sm bg-red-400" />Over limit</span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-0 border-t-2 border-dashed border-slate-400 mt-1.5" style={{ width: 14 }} />Threshold</span>
        </div>
      </div>
    </BudgetCard>
  );
}
