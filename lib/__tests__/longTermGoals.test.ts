import { calculateBudgetBreakdown } from '../budgetCalculations';
import { DEFAULT_INPUTS } from '../defaultScenarios';
import {
  calculateLongTermGoalProjections,
  generateFinancialLiteracyInsights,
} from '../longTermGoals';

describe('longTermGoals', () => {
  it('maps house and retirement goals to their existing funding sources', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      houseDownPaymentContribution: 1800,
      retirementContributionPercent: 12,
      iraContribution: 300,
      hsaEligible: true,
      hsaContribution: 200,
      longTermGoals: [
        {
          id: 'house',
          name: 'House',
          category: 'house' as const,
          targetAmount: 150000,
          currentAmount: 10000,
          targetDate: '2030-12',
        },
        {
          id: 'retirement',
          name: 'Retirement',
          category: 'retirement' as const,
          targetAmount: 1000000,
          currentAmount: 50000,
          targetDate: '2055-01',
        },
      ],
    };

    const breakdown = calculateBudgetBreakdown(inputs);
    const goals = calculateLongTermGoalProjections(inputs, breakdown);

    expect(goals[0].currentMonthlyFunding).toBeCloseTo(1800, 2);
    expect(goals[0].fundingSourceLabel).toBe('house fund');
    expect(goals[1].currentMonthlyFunding).toBeCloseTo(
      breakdown.retirement.monthly401k + breakdown.retirement.monthlyIRA + breakdown.monthlyHSA,
      2
    );
    expect(goals[1].fundingSourceLabel).toBe('retirement contributions');
  });

  it('splits general cash savings across flexible goals', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      generalCashSavings: 900,
      longTermGoals: [
        {
          id: 'vacation',
          name: 'Vacation',
          category: 'vacation' as const,
          targetAmount: 3600,
          currentAmount: 0,
          targetDate: '2030-03',
        },
        {
          id: 'kids',
          name: 'Kids',
          category: 'kids' as const,
          targetAmount: 7200,
          currentAmount: 0,
          targetDate: '2030-03',
        },
      ],
    };

    const goals = calculateLongTermGoalProjections(inputs, calculateBudgetBreakdown(inputs));

    expect(goals[0].currentMonthlyFunding).toBeCloseTo(goals[0].requiredMonthlySavings, 2);
    expect(goals[1].currentMonthlyFunding).toBeCloseTo(goals[1].requiredMonthlySavings, 2);
  });

  it('sends leftover general savings to open-ended goals after timed goals are covered', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      generalCashSavings: 500,
      longTermGoals: [
        {
          id: 'vacation',
          name: 'Vacation',
          category: 'vacation' as const,
          targetAmount: 1200,
          currentAmount: 0,
          targetDate: '2030-09',
        },
        {
          id: 'custom',
          name: 'Boat',
          category: 'custom' as const,
          targetAmount: 10000,
          currentAmount: 0,
          targetDate: '',
        },
      ],
    };

    const goals = calculateLongTermGoalProjections(inputs, calculateBudgetBreakdown(inputs));
    const timedGoal = goals.find((goal) => goal.id === 'vacation');
    const openEndedGoal = goals.find((goal) => goal.id === 'custom');

    expect(timedGoal?.currentMonthlyFunding).toBeCloseTo(timedGoal?.requiredMonthlySavings ?? 0, 2);
    expect(openEndedGoal?.currentMonthlyFunding).toBeGreaterThan(0);
  });

  it('generates literacy guidance for weak retirement, no emergency fund, and behind goals', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      annualSalary: 90000,
      retirementContributionPercent: 2,
      emergencyFundContribution: 0,
      generalCashSavings: 100,
      longTermGoals: [
        {
          id: 'vacation',
          name: 'Vacation',
          category: 'vacation' as const,
          targetAmount: 12000,
          currentAmount: 0,
          targetDate: '2030-03',
        },
      ],
    };

    const breakdown = calculateBudgetBreakdown(inputs);
    const insights = generateFinancialLiteracyInsights(
      inputs,
      breakdown,
      calculateLongTermGoalProjections(inputs, breakdown)
    );
    const insightIds = insights.map((insight) => insight.id);

    expect(insightIds).toContain('retirement_compounding');
    expect(insightIds).toContain('emergency_fund_foundation');
    expect(insightIds).toContain('goal_tradeoffs');
  });

  it('flags high-interest debt when only minimum payments are covered', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      debts: [
        {
          id: 'card',
          name: 'Credit Card',
          balance: 8000,
          interestRate: 22,
          minimumPayment: 200,
        },
      ],
      extraDebtPayoff: 0,
      longTermGoals: [],
    };

    const breakdown = calculateBudgetBreakdown(inputs);
    const insights = generateFinancialLiteracyInsights(
      inputs,
      breakdown,
      calculateLongTermGoalProjections(inputs, breakdown)
    );

    expect(insights.map((insight) => insight.id)).toContain('debt_vs_savings');
  });
});

import {
  calculateMonthsToGoal,
  calculateRequiredContribution,
} from '../longTermGoals';

describe('calculateMonthsToGoal', () => {
  it('returns months to reach target at current contribution rate', () => {
    expect(calculateMonthsToGoal(0, 6000, 500)).toBe(12);
  });

  it('rounds up to the next whole month', () => {
    expect(calculateMonthsToGoal(0, 6001, 500)).toBe(13);
  });

  it('returns null when already funded', () => {
    expect(calculateMonthsToGoal(6000, 6000, 500)).toBeNull();
  });

  it('returns null when target is exceeded', () => {
    expect(calculateMonthsToGoal(7000, 6000, 500)).toBeNull();
  });

  it('returns null when monthly contribution is zero', () => {
    expect(calculateMonthsToGoal(0, 6000, 0)).toBeNull();
  });

  it('returns null when monthly contribution is negative', () => {
    expect(calculateMonthsToGoal(0, 6000, -100)).toBeNull();
  });

  it('returns 1 when remaining equals exactly one contribution', () => {
    expect(calculateMonthsToGoal(5500, 6000, 500)).toBe(1);
  });

  it('accounts for partial progress correctly', () => {
    expect(calculateMonthsToGoal(2000, 8000, 1000)).toBe(6);
  });
});

describe('calculateRequiredContribution', () => {
  it('computes required monthly contribution to reach goal in target months', () => {
    expect(calculateRequiredContribution(0, 12000, 12)).toBeCloseTo(1000, 5);
  });

  it('accounts for current amount already saved', () => {
    expect(calculateRequiredContribution(2000, 12000, 10)).toBeCloseTo(1000, 5);
  });

  it('returns null when already funded', () => {
    expect(calculateRequiredContribution(12000, 12000, 12)).toBeNull();
  });

  it('returns null when target months is zero', () => {
    expect(calculateRequiredContribution(0, 12000, 0)).toBeNull();
  });

  it('returns null when target months is negative', () => {
    expect(calculateRequiredContribution(0, 12000, -5)).toBeNull();
  });

  it('returns null when current exceeds target', () => {
    expect(calculateRequiredContribution(15000, 12000, 12)).toBeNull();
  });
});

describe('monthsAtCurrentRate in LongTermGoalProjection', () => {
  it('populates monthsAtCurrentRate for a behind goal', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      generalCashSavings: 600,
      longTermGoals: [
        {
          id: 'vacation',
          name: 'Vacation',
          category: 'vacation' as const,
          targetAmount: 6000,
          currentAmount: 0,
          targetDate: '',
        },
      ],
    };
    const breakdown = calculateBudgetBreakdown(inputs);
    const projections = calculateLongTermGoalProjections(inputs, breakdown);
    const vacation = projections.find((p) => p.id === 'vacation');
    expect(vacation).toBeDefined();
    expect(vacation!.monthsAtCurrentRate).not.toBeNull();
    expect(vacation!.monthsAtCurrentRate).toBe(Math.ceil(6000 / 600));
  });

  it('returns null monthsAtCurrentRate for a funded goal', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      generalCashSavings: 600,
      longTermGoals: [
        {
          id: 'funded',
          name: 'Funded Goal',
          category: 'vacation' as const,
          targetAmount: 6000,
          currentAmount: 6000,
          targetDate: '',
        },
      ],
    };
    const breakdown = calculateBudgetBreakdown(inputs);
    const projections = calculateLongTermGoalProjections(inputs, breakdown);
    const goal = projections.find((p) => p.id === 'funded');
    expect(goal!.monthsAtCurrentRate).toBeNull();
  });
});
