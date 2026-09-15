/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';
import DynamicBudgetPage from '../page';
import { DEFAULT_INPUTS } from '@/lib/defaultScenarios';

jest.mock('recharts', () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) => children as React.ReactElement ?? null;

  return {
    ResponsiveContainer: passthrough,
    AreaChart: passthrough,
    Area: passthrough,
    XAxis: passthrough,
    YAxis: passthrough,
    CartesianGrid: passthrough,
    Tooltip: passthrough,
    PieChart: passthrough,
    Pie: passthrough,
    Cell: passthrough,
    BarChart: passthrough,
    Bar: passthrough,
    LineChart: passthrough,
    Line: passthrough,
    Legend: passthrough,
    ComposedChart: passthrough,
    ReferenceLine: passthrough,
  };
});

describe('DynamicBudget page smoke test', () => {
  const STORAGE_KEY = 'dynamicbudget_budget_inputs';

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders without crashing and shows the default surplus banner', () => {
    const balancedInputs = {
      ...DEFAULT_INPUTS,
      annualSalary: DEFAULT_INPUTS.annualSalary * 2,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      inputs: balancedInputs,
      timestamp: new Date().toISOString(),
    }));

    render(<DynamicBudgetPage />);

    expect(screen.getByRole('heading', { name: 'DynamicBudget' })).toBeTruthy();
    expect(screen.getByText(/^Surplus:/)).toBeTruthy();
  });
});
