/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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
  const DEFAULT_INNER_WIDTH = window.innerWidth;

  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: DEFAULT_INNER_WIDTH,
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: DEFAULT_INNER_WIDTH,
    });
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

  it('toggles between the form and dashboard on mobile swipe gestures', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 390,
    });

    render(<DynamicBudgetPage />);

    const panel = screen.getByRole('tabpanel');

    expect(screen.getByRole('button', { name: 'Show dashboard panel' })).toBeTruthy();

    fireEvent.touchStart(panel, {
      touches: [{ clientX: 280, clientY: 240 }],
    });
    fireEvent.touchMove(panel, {
      touches: [
        { clientX: 180, clientY: 250 },
        { clientX: 220, clientY: 255 },
      ],
    });
    fireEvent.touchEnd(panel);

    expect(screen.getByRole('button', { name: 'Show dashboard panel' })).toBeTruthy();

    fireEvent.touchStart(panel, {
      touches: [{ clientX: 280, clientY: 240 }],
    });
    fireEvent.touchMove(panel, {
      touches: [{ clientX: 180, clientY: 250 }],
    });
    fireEvent.touchEnd(panel);

    expect(screen.getByRole('button', { name: 'Show editor panel' })).toBeTruthy();

    fireEvent.touchStart(panel, {
      touches: [{ clientX: 120, clientY: 220 }],
    });
    fireEvent.touchMove(panel, {
      touches: [{ clientX: 230, clientY: 210 }],
    });
    fireEvent.touchEnd(panel);

    expect(screen.getByRole('button', { name: 'Show dashboard panel' })).toBeTruthy();
  });

  it('renders sinking-fund planning when annual expenses exist', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      annualExpenses: [
        {
          id: 'registration',
          name: 'Car Registration',
          category: 'car' as const,
          annualAmount: 600,
          currentSaved: 100,
          dueMonth: 12,
          isEssential: true,
        },
      ],
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      inputs,
      timestamp: new Date().toISOString(),
    }));

    render(<DynamicBudgetPage />);

    expect(screen.getAllByText('Sinking Funds & Annual Expenses').length).toBeGreaterThan(0);
    expect(screen.getByText('Car Registration')).toBeTruthy();
    expect(screen.getByText('Decision Support')).toBeTruthy();
  });
});
