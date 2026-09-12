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
});
