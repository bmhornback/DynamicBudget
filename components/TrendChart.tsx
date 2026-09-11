'use client';

import { useMemo } from 'react';
import {
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import type { TrackableCategory, BudgetInputs, SpendingHistory } from '@/types/budget';
import { getMonthlyComparison } from '@/lib/spendingTrends';

interface TrendChartProps {
  category: TrackableCategory;
  spendingHistory: SpendingHistory | undefined;
  inputs: BudgetInputs;
  months?: number;
}

export default function TrendChart({
  category,
  spendingHistory,
  inputs,
  months = 6,
}: TrendChartProps) {
  const chartData = useMemo(() => {
    if (!spendingHistory) return [];
    
    const comparison = getMonthlyComparison(category, spendingHistory, inputs, months);
    
    return comparison.map((item) => ({
      month: item.month,
      budgeted: item.budgeted,
      actual: item.actual,
      variance: item.variance,
    }));
  }, [category, spendingHistory, inputs, months]);

  if (!spendingHistory || chartData.length === 0 || chartData.every((d) => d.actual === 0)) {
    return null;
  }

  const hasData = chartData.some((d) => d.actual > 0);
  if (!hasData) return null;

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const [year, month] = value.split('-');
              return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
                month: 'short',
              });
            }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number | string) => 
              typeof value === 'number' ? `$${value.toFixed(2)}` : '$0.00'
            }
            labelFormatter={(label: string) => {
              const [year, month] = (label || '').split('-');
              return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              });
            }}
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '8px',
            }}
          />
          <Legend />
          <Bar dataKey="budgeted" fill="#3b82f6" name="Budgeted" />
          <Line 
            type="monotone" 
            dataKey="actual" 
            stroke="#ef4444" 
            strokeWidth={2}
            name="Actual"
            dot={{ fill: '#ef4444', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
