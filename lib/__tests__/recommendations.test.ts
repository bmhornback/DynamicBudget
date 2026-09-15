import { calculateBudgetBreakdown } from '../budgetCalculations';
import { DEFAULT_INPUTS } from '../defaultScenarios';
import { generateRecommendations } from '../recommendations';

describe('recommendations', () => {
  it('uses housing payment ids for homeowner housing warnings', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      housingMode: 'homeowner' as const,
      annualSalary: 120000,
      mortgagePayment: 4500,
      houseDownPaymentContribution: 500,
    };

    const recommendations = generateRecommendations(inputs, calculateBudgetBreakdown(inputs));
    const recommendationIds = recommendations.map((recommendation) => recommendation.id);

    expect(recommendationIds).toContain('housing_payment_high_gross');
    expect(recommendationIds).toContain('housing_payment_high_takehome');
    expect(recommendationIds).toContain('housing_fund_slow');
    expect(recommendationIds).not.toContain('rent_high_gross');
    expect(recommendationIds).not.toContain('rent_high_takehome');
    expect(recommendationIds).not.toContain('house_fund_slow');
  });

  it('adds long-term goal pacing recommendations when a goal is behind', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
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
        {
          id: 'kids',
          name: 'Kids',
          category: 'kids' as const,
          targetAmount: 12000,
          currentAmount: 0,
          targetDate: '2030-03',
        },
      ],
    };

    const recommendations = generateRecommendations(inputs, calculateBudgetBreakdown(inputs));
    const recommendationIds = recommendations.map((recommendation) => recommendation.id);

    expect(recommendationIds).toContain('goal_behind_vacation');
    expect(recommendationIds).toContain('goal_pool_underfunded');
  });

  it('prompts users to add deadlines for goals without a target month', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      longTermGoals: [
        {
          id: 'custom-goal',
          name: 'Other Major Purchase',
          category: 'custom' as const,
          targetAmount: 5000,
          currentAmount: 500,
          targetDate: '',
        },
      ],
    };

    const recommendations = generateRecommendations(inputs, calculateBudgetBreakdown(inputs));

    expect(recommendations.map((recommendation) => recommendation.id)).toContain('goal_missing_deadline');
  });

  it('flags underfunded annual expenses that are due soon', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      annualExpenses: [
        {
          id: 'insurance',
          name: 'Car Insurance',
          category: 'insurance' as const,
          annualAmount: 1200,
          currentSaved: 0,
          dueMonth: new Date().getMonth() + 1,
          isEssential: true,
        },
      ],
    };

    const recommendations = generateRecommendations(inputs, calculateBudgetBreakdown(inputs));

    expect(recommendations.map((recommendation) => recommendation.id)).toContain('annual_expense_due_soon');
  });

  it('acknowledges annual expense planning when recurring bills are funded over time', () => {
    const laterInYear = ((new Date().getMonth() + 5) % 12) + 1;
    const inputs = {
      ...DEFAULT_INPUTS,
      annualExpenses: [
        {
          id: 'travel',
          name: 'Travel',
          category: 'travel' as const,
          annualAmount: 1200,
          currentSaved: 900,
          dueMonth: laterInYear,
          isEssential: false,
        },
      ],
    };

    const recommendations = generateRecommendations(inputs, calculateBudgetBreakdown(inputs));

    expect(recommendations.map((recommendation) => recommendation.id)).toContain('annual_expense_planning');
  });
});
