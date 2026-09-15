import { buildAnnualProjection } from '../annualProjection';
import { calculateBudgetBreakdown } from '../budgetCalculations';
import { DEFAULT_INPUTS } from '../defaultScenarios';
import type { BudgetInputs } from '@/types/budget';

function createInputs(overrides: Partial<BudgetInputs> = {}): BudgetInputs {
  return {
    ...DEFAULT_INPUTS,
    retirementContributionPercent: 0,
    employerMatchPercent: 0,
    userAge: 35,
    iraContribution: 0,
    maxOutIRA: false,
    taxableInvestments: 0,
    emergencyFundContribution: 0,
    emergencyFundTarget: 1_000_000,
    houseDownPaymentContribution: 0,
    houseDownPaymentTarget: 1_000_000,
    ...overrides,
  };
}

function futureValueMonthlyContributions(monthlyContribution: number, annualRate: number, years: number): number {
  if (monthlyContribution <= 0) return 0;
  if (annualRate === 0) return monthlyContribution * years * 12;

  const r = annualRate / 12;
  const n = years * 12;
  return monthlyContribution * ((Math.pow(1 + r, n) - 1) / r);
}

describe('buildAnnualProjection', () => {
  it('uses linear accumulation for retirement and taxable accounts at 0% growth', () => {
    const inputs = createInputs({
      iraContribution: 25,
      taxableInvestments: 500,
    });

    const breakdown = calculateBudgetBreakdown(inputs);
    const projection = buildAnnualProjection(inputs, breakdown, 0);

    expect(projection).toEqual([
      expect.objectContaining({ year: 1, retirement401k: 0, ira: 300, taxableInvestments: 6000 }),
      expect.objectContaining({ year: 3, retirement401k: 0, ira: 900, taxableInvestments: 18000 }),
      expect.objectContaining({ year: 5, retirement401k: 0, ira: 1500, taxableInvestments: 30000 }),
      expect.objectContaining({ year: 10, retirement401k: 0, ira: 3000, taxableInvestments: 60000 }),
    ]);
  });

  it('handles very small monthly contributions without instability', () => {
    const inputs = createInputs({ taxableInvestments: 0.01 });

    const breakdown = calculateBudgetBreakdown(inputs);
    const projection = buildAnnualProjection(inputs, breakdown, 0);

    expect(projection.find((point) => point.year === 1)?.taxableInvestments).toBe(0);
    expect(projection.find((point) => point.year === 10)?.taxableInvestments).toBe(1);
    expect(projection.every((point) => Number.isFinite(point.total))).toBe(true);
  });

  it('always applies a fixed 2% annual rate to house and emergency funds', () => {
    const inputs = createInputs({
      houseDownPaymentContribution: 100,
      emergencyFundContribution: 50,
    });

    const breakdown = calculateBudgetBreakdown(inputs);
    const zeroGrowthProjection = buildAnnualProjection(inputs, breakdown, 0);
    const highGrowthProjection = buildAnnualProjection(inputs, breakdown, 0.5);

    expect(highGrowthProjection.map((point) => point.houseFund)).toEqual(
      zeroGrowthProjection.map((point) => point.houseFund)
    );
    expect(highGrowthProjection.map((point) => point.emergencyFund)).toEqual(
      zeroGrowthProjection.map((point) => point.emergencyFund)
    );

    const yearOne = highGrowthProjection.find((point) => point.year === 1);
    expect(yearOne?.houseFund).toBe(Math.round(futureValueMonthlyContributions(100, 0.02, 1)));
    expect(yearOne?.emergencyFund).toBe(Math.round(futureValueMonthlyContributions(50, 0.02, 1)));
  });
});
