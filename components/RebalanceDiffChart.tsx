'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { RebalanceResult } from '@/types/budget';
import { formatCurrency } from '@/lib/formatters';
import BudgetCard from './BudgetCard';

interface RebalanceDiffChartProps {
  result: RebalanceResult;
}

interface DiffRow {
  fieldId: string;
  label: string;
  before: number;
  after: number;
  delta: number;
}

/**
 * Before/after bar comparison chart for rebalance changes.
 * Reductions are colored red; increases are colored green.
 */
export default function RebalanceDiffChart({ result }: RebalanceDiffChartProps) {
  const rows: DiffRow[] = useMemo(
    () =>
      result.changes.map((c) => ({
        fieldId: c.fieldId,
        label: c.label,
        before: c.oldValue,
        after: c.newValue,
        delta: c.delta,
      })),
    [result.changes]
  );

  if (rows.length === 0) return null;

  return (
    <BudgetCard
      title="Rebalance Changes"
      accent={result.success ? 'green' : 'yellow'}
      className="mt-3"
    >
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Before vs. after comparison for each adjusted field.{' '}
        <span className="text-green-600 font-medium">Green</span> = increase,{' '}
        <span className="text-red-500 font-medium">Red</span> = reduction.
      </p>

      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 8, bottom: 4 }}
            barCategoryGap="30%"
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
            <XAxis
              type="number"
              tickFormatter={(v) => `$${v}`}
              tick={{ fontSize: 11 }}
              domain={[0, 'auto']}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 11 }}
              width={130}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'var(--tooltip-bg, #fff)',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="before" name="Before" fill="#93c5fd" animationDuration={500} />
            <Bar dataKey="after" name="After" animationDuration={700} animationBegin={100}>
              {rows.map((row, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={row.delta >= 0 ? '#22c55e' : '#ef4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Delta summary table */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <th className="text-left py-1 font-medium text-gray-500 dark:text-gray-400">Field</th>
              <th className="text-right py-1 font-medium text-gray-500 dark:text-gray-400">Before</th>
              <th className="text-right py-1 font-medium text-gray-500 dark:text-gray-400 pl-3">After</th>
              <th className="text-right py-1 font-medium text-gray-500 dark:text-gray-400 pl-3">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="py-1 text-gray-700 dark:text-gray-300">{row.label}</td>
                <td className="py-1 text-right tabular-nums text-gray-600 dark:text-gray-400">
                  {formatCurrency(row.before)}
                </td>
                <td className="py-1 text-right tabular-nums pl-3 text-gray-800 dark:text-gray-200">
                  {formatCurrency(row.after)}
                </td>
                <td
                  className={`py-1 text-right tabular-nums pl-3 font-semibold ${
                    row.delta >= 0 ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {row.delta >= 0 ? '+' : ''}
                  {formatCurrency(row.delta)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BudgetCard>
  );
}
