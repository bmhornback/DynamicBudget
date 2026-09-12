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

    expect(goals[0].currentMonthlyFunding).toBeCloseTo(300, 0);
    expect(goals[1].currentMonthlyFunding).toBeCloseTo(600, 0);
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
});
