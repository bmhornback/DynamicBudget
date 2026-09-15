'use client';

import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { BudgetBreakdown, BudgetInputs } from '@/types/budget';
import { formatCurrency } from '@/lib/formatters';
import { buildAnnualProjection, DEFAULT_GROWTH_RATE } from '@/lib/annualProjection';
import BudgetCard from './BudgetCard';

interface AnnualProjectionChartProps {
  breakdown: BudgetBreakdown;
  inputs: BudgetInputs;
}

const SERIES = [
  { key: 'retirement401k', label: '401(k) + Match', color: '#3b82f6' },
  { key: 'ira', label: 'IRA', color: '#8b5cf6' },
  { key: 'taxableInvestments', label: 'Taxable Investments', color: '#10b981' },
  { key: 'houseFund', label: 'House Fund', color: '#f59e0b' },
  { key: 'emergencyFund', label: 'Emergency Fund', color: '#ef4444' },
] as const;

function formatYAxis(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export default function AnnualProjectionChart({ breakdown, inputs }: AnnualProjectionChartProps) {
  const [growthRate, setGrowthRate] = useState(DEFAULT_GROWTH_RATE);

  const data = useMemo(
    () => buildAnnualProjection(inputs, breakdown, growthRate),
    [inputs, breakdown, growthRate]
  );

  const hasAnyContribution = data.some((d) => d.total > 0);

  return (
    <BudgetCard title="Annual Savings Projection" accent="blue">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Projected savings balances over 1, 3, 5, and 10 years based on current monthly
        contributions. 401(k)/IRA/Taxable use the growth rate below; House &amp; Emergency funds
        use a conservative 2% rate.
      </p>

      {/* Growth rate control */}
      <div className="flex items-center gap-3 mb-4">
        <label
          htmlFor="proj-growth-rate"
          className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap"
        >
          Annual growth rate:
        </label>
        <input
          id="proj-growth-rate"
          type="range"
          min={0}
          max={15}
          step={0.5}
          value={Math.round(growthRate * 100 * 2) / 2}
          onChange={(e) => setGrowthRate(parseFloat(e.target.value) / 100)}
          className="flex-1 accent-blue-600"
          aria-valuetext={`${(growthRate * 100).toFixed(1)}%`}
        />
        <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 tabular-nums w-10 text-right">
          {(growthRate * 100).toFixed(1)}%
        </span>
      </div>

      {!hasAnyContribution ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
          No active savings or investment contributions to project.
        </p>
      ) : (
        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} width={60} />
              <Tooltip
                formatter={(value, name) => {
                  const numericValue = Array.isArray(value) ? Number(value[0]) : Number(value);
                  return [formatCurrency(Number.isFinite(numericValue) ? numericValue : 0), String(name)];
                }}
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg, #fff)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: 12,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                iconType="plainline"
                iconSize={16}
              />
              {SERIES.filter((s) => data.some((d) => (d[s.key] as number) > 0)).map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ fill: s.color, r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                  animationDuration={600}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Totals table */}
      {hasAnyContribution && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left py-1 font-medium text-gray-500 dark:text-gray-400">Account</th>
                {data.map((d) => (
                  <th key={d.year} className="text-right py-1 font-medium text-gray-500 dark:text-gray-400 pl-3">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {SERIES.filter((s) => data.some((d) => (d[s.key] as number) > 0)).map((s) => (
                <tr key={s.key}>
                  <td className="py-1 text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: s.color }}
                    />
                    {s.label}
                  </td>
                  {data.map((d) => (
                    <td
                      key={d.year}
                      className="py-1 text-right text-gray-800 dark:text-gray-200 tabular-nums pl-3"
                    >
                      {formatCurrency(d[s.key] as number)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-gray-200 dark:border-gray-600 font-semibold">
                <td className="py-1 text-gray-800 dark:text-gray-200">Total</td>
                {data.map((d) => (
                  <td
                    key={d.year}
                    className="py-1 text-right text-blue-700 dark:text-blue-400 tabular-nums pl-3"
                  >
                    {formatCurrency(d.total)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </BudgetCard>
  );
}
