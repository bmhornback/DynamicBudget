import { calculateBudgetBreakdown } from '../budgetCalculations';
import { calculateBudgetHealthScore, HEALTH_SCORE_COLORS, HEALTH_SCORE_BG_COLORS } from '../budgetHealthScore';
import { DEFAULT_INPUTS } from '../defaultScenarios';

describe('budgetHealthScore', () => {
  it('returns a score between 0 and 100', () => {
    const breakdown = calculateBudgetBreakdown(DEFAULT_INPUTS);
    const result = calculateBudgetHealthScore(breakdown);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('assigns an Excellent label for a very healthy budget', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      annualSalary: 250000,
      rent: 1500,
      contribution401k: 2041,
      emergencyFundContribution: 1000,
      houseDownPaymentContribution: 2000,
      taxableInvestments: 1000,
      generalCashSavings: 500,
    };
    const result = calculateBudgetHealthScore(calculateBudgetBreakdown(inputs));
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(['Excellent', 'Strong']).toContain(result.label);
  });

  it('assigns a Risky or Tight label for an unaffordable budget', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      annualSalary: 50000,
      rent: 3500,
      contribution401k: 0,
      emergencyFundContribution: 0,
      houseDownPaymentContribution: 0,
      taxableInvestments: 0,
      generalCashSavings: 0,
    };
    const result = calculateBudgetHealthScore(calculateBudgetBreakdown(inputs));
    expect(result.score).toBeLessThan(60);
    expect(['Risky', 'Tight']).toContain(result.label);
  });

  it('returns a Workable label for a mid-range budget', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      annualSalary: 100000,
      rent: 2200,
      contribution401k: 500,
      emergencyFundContribution: 150,
      houseDownPaymentContribution: 300,
      taxableInvestments: 200,
    };
    const result = calculateBudgetHealthScore(calculateBudgetBreakdown(inputs));
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.label).toBeDefined();
  });

  it('scores 0 for housing when housing is above 40% of gross', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      annualSalary: 50000,
      rent: 2500, // 2500 / (50000/12) = 60% of gross > 40%
    };
    const breakdown = calculateBudgetBreakdown(inputs);
    expect(breakdown.primaryHousingPaymentAsPercentGross).toBeGreaterThan(0.40);
    const result = calculateBudgetHealthScore(breakdown);
    expect(result.breakdown.housingAffordability).toBe(0);
  });

  it('scores 20 for housing when housing is at or below 25% of gross', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      annualSalary: 200000,
      rent: 1500, // well below 25% of gross
    };
    const breakdown = calculateBudgetBreakdown(inputs);
    expect(breakdown.primaryHousingPaymentAsPercentGross).toBeLessThan(0.25);
    const result = calculateBudgetHealthScore(breakdown);
    expect(result.breakdown.housingAffordability).toBe(20);
  });

  it('awards 20 retirement pts when saving 20%+ of gross', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      annualSalary: 150000,
      retirementContributionPercent: 20,
      iraContribution: 500,
    };
    const breakdown = calculateBudgetBreakdown(inputs);
    expect(breakdown.retirement.retirementSavingsRate).toBeGreaterThanOrEqual(0.20);
    const result = calculateBudgetHealthScore(breakdown);
    expect(result.breakdown.retirementRate).toBe(20);
  });

  it('awards maximum house fund score when contribution >= $2000/month', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      annualSalary: 250000,
      houseDownPaymentContribution: 2000,
    };
    const breakdown = calculateBudgetBreakdown(inputs);
    const result = calculateBudgetHealthScore(breakdown);
    expect(result.breakdown.houseFundContrib).toBe(10);
  });

  it('scores 0 for buffer when budget is over (remainingMonthlyBuffer < 0)', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      annualSalary: 48000,
      rent: 4000,
      emergencyFundContribution: 500,
    };
    const breakdown = calculateBudgetBreakdown(inputs);
    expect(breakdown.remainingMonthlyBuffer).toBeLessThan(0);
    const result = calculateBudgetHealthScore(breakdown);
    expect(result.breakdown.monthlyBuffer).toBe(0);
  });

  it('includes all breakdown sub-scores', () => {
    const result = calculateBudgetHealthScore(calculateBudgetBreakdown(DEFAULT_INPUTS));
    expect(result.breakdown).toMatchObject({
      housingAffordability: expect.any(Number),
      retirementRate: expect.any(Number),
      emergencyFundContrib: expect.any(Number),
      houseFundContrib: expect.any(Number),
      monthlyBuffer: expect.any(Number),
      debtCarBurden: expect.any(Number),
      petCostBurden: expect.any(Number),
      totalSavingsRate: expect.any(Number),
    });
  });

  it('HEALTH_SCORE_COLORS covers all five labels', () => {
    const labels = ['Excellent', 'Strong', 'Workable', 'Tight', 'Risky'] as const;
    for (const label of labels) {
      expect(HEALTH_SCORE_COLORS[label]).toBeTruthy();
      expect(HEALTH_SCORE_BG_COLORS[label]).toBeTruthy();
    }
  });
});
