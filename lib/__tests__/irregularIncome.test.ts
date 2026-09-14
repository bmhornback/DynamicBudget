import { calculateIrregularIncomeAnalysis } from '../irregularIncome';
import { calculateBudgetBreakdown } from '../budgetCalculations';
import { DEFAULT_INPUTS } from '../defaultScenarios';
import type { BudgetInputs } from '@/types/budget';

function makeInputs(overrides: Partial<BudgetInputs> = {}): BudgetInputs {
  return { ...DEFAULT_INPUTS, ...overrides };
}

describe('calculateIrregularIncomeAnalysis', () => {
  describe('with 0% variability', () => {
    it('returns three identical gross scenarios', () => {
      const inputs = makeInputs({ annualSalary: 120000, incomeVariabilityPercent: 0 });
      const bd = calculateBudgetBreakdown(inputs);
      const result = calculateIrregularIncomeAnalysis(inputs, bd);
      expect(result.scenarios).toHaveLength(3);
      expect(result.scenarios[0].grossAnnual).toBe(120000); // P25
      expect(result.scenarios[1].grossAnnual).toBe(120000); // P50
      expect(result.scenarios[2].grossAnnual).toBe(120000); // P75
    });

    it('reports P25 gross monthly equal to P50', () => {
      const inputs = makeInputs({ annualSalary: 120000, incomeVariabilityPercent: 0 });
      const bd = calculateBudgetBreakdown(inputs);
      const { scenarios } = calculateIrregularIncomeAnalysis(inputs, bd);
      expect(scenarios[0].grossMonthly).toBeCloseTo(scenarios[1].grossMonthly, 0);
    });
  });

  describe('with 20% variability', () => {
    it('P25 annual = base × 0.8', () => {
      const inputs = makeInputs({ annualSalary: 120000, incomeVariabilityPercent: 20 });
      const bd = calculateBudgetBreakdown(inputs);
      const { scenarios } = calculateIrregularIncomeAnalysis(inputs, bd);
      expect(scenarios[0].grossAnnual).toBeCloseTo(96000, 0);
    });

    it('P75 annual = base × 1.2', () => {
      const inputs = makeInputs({ annualSalary: 120000, incomeVariabilityPercent: 20 });
      const bd = calculateBudgetBreakdown(inputs);
      const { scenarios } = calculateIrregularIncomeAnalysis(inputs, bd);
      expect(scenarios[2].grossAnnual).toBeCloseTo(144000, 0);
    });

    it('P50 uses the base breakdown directly (no recalculation)', () => {
      const inputs = makeInputs({ annualSalary: 120000, incomeVariabilityPercent: 20 });
      const bd = calculateBudgetBreakdown(inputs);
      const { scenarios } = calculateIrregularIncomeAnalysis(inputs, bd);
      expect(scenarios[1].breakdown).toBe(bd); // same reference
    });

    it('scenario labels are P25, P50, P75', () => {
      const inputs = makeInputs({ annualSalary: 120000, incomeVariabilityPercent: 20 });
      const bd = calculateBudgetBreakdown(inputs);
      const { scenarios } = calculateIrregularIncomeAnalysis(inputs, bd);
      expect(scenarios.map((s) => s.label)).toEqual(['P25', 'P50', 'P75']);
    });

    it('P25 net income < P50 net income', () => {
      const inputs = makeInputs({ annualSalary: 120000, incomeVariabilityPercent: 20 });
      const bd = calculateBudgetBreakdown(inputs);
      const { scenarios } = calculateIrregularIncomeAnalysis(inputs, bd);
      expect(scenarios[0].breakdown.netMonthlyIncome).toBeLessThan(
        scenarios[1].breakdown.netMonthlyIncome
      );
    });

    it('P75 net income > P50 net income', () => {
      const inputs = makeInputs({ annualSalary: 120000, incomeVariabilityPercent: 20 });
      const bd = calculateBudgetBreakdown(inputs);
      const { scenarios } = calculateIrregularIncomeAnalysis(inputs, bd);
      expect(scenarios[2].breakdown.netMonthlyIncome).toBeGreaterThan(
        scenarios[1].breakdown.netMonthlyIncome
      );
    });
  });

  describe('at-risk expenses', () => {
    it('is empty when P25 is not over budget', () => {
      // Very high salary, low expenses → P25 still positive
      const inputs = makeInputs({
        annualSalary: 300000,
        incomeVariabilityPercent: 10,
        funEntertainment: 100,
        diningOut: 200,
      });
      const bd = calculateBudgetBreakdown(inputs);
      const { atRiskExpenses, isP25OverBudget } = calculateIrregularIncomeAnalysis(inputs, bd);
      expect(isP25OverBudget).toBe(false);
      expect(atRiskExpenses).toHaveLength(0);
    });

    it('is non-empty when P25 is over budget', () => {
      // Very high expenses, modest salary → P25 over budget
      const inputs = makeInputs({
        annualSalary: 60000,
        incomeVariabilityPercent: 50,
        rent: 2500,
        diningOut: 800,
        funEntertainment: 600,
        travel: 400,
        clothes: 300,
      });
      const bd = calculateBudgetBreakdown(inputs);
      const { atRiskExpenses, isP25OverBudget } = calculateIrregularIncomeAnalysis(inputs, bd);
      expect(isP25OverBudget).toBe(true);
      expect(atRiskExpenses.length).toBeGreaterThan(0);
    });

    it('at-risk expenses are sorted descending by amount', () => {
      const inputs = makeInputs({
        annualSalary: 60000,
        incomeVariabilityPercent: 50,
        rent: 2500,
        diningOut: 800,
        funEntertainment: 600,
        travel: 400,
      });
      const bd = calculateBudgetBreakdown(inputs);
      const { atRiskExpenses } = calculateIrregularIncomeAnalysis(inputs, bd);
      for (let i = 1; i < atRiskExpenses.length; i++) {
        expect(atRiskExpenses[i - 1].monthlyAmount).toBeGreaterThanOrEqual(
          atRiskExpenses[i].monthlyAmount
        );
      }
    });

    it('at-risk expenses exclude zero-amount items', () => {
      const inputs = makeInputs({
        annualSalary: 60000,
        incomeVariabilityPercent: 50,
        rent: 2500,
        diningOut: 0, // excluded
        travel: 0,   // excluded
        funEntertainment: 500,
      });
      const bd = calculateBudgetBreakdown(inputs);
      const { atRiskExpenses } = calculateIrregularIncomeAnalysis(inputs, bd);
      atRiskExpenses.forEach((e) => {
        expect(e.monthlyAmount).toBeGreaterThan(0);
      });
    });
  });

  describe('p25Deficit', () => {
    it('is 0 when P25 is not over budget', () => {
      const inputs = makeInputs({
        annualSalary: 300000,
        incomeVariabilityPercent: 5,
      });
      const bd = calculateBudgetBreakdown(inputs);
      const { p25Deficit } = calculateIrregularIncomeAnalysis(inputs, bd);
      expect(p25Deficit).toBe(0);
    });

    it('is positive when P25 is over budget', () => {
      // Very high expenses, modest salary → P25 over budget
      const inputs = makeInputs({
        annualSalary: 60000,
        incomeVariabilityPercent: 60,
        rent: 2500,
        funEntertainment: 1000,
      });
      const bd = calculateBudgetBreakdown(inputs);
      const { p25Deficit, isP25OverBudget } = calculateIrregularIncomeAnalysis(inputs, bd);
      expect(isP25OverBudget).toBe(true);
      expect(p25Deficit).toBeGreaterThan(0);
    });
  });

  describe('variabilityPercent clamping', () => {
    it('clamps negative values to 0', () => {
      const inputs = makeInputs({ annualSalary: 120000, incomeVariabilityPercent: -20 });
      const bd = calculateBudgetBreakdown(inputs);
      const { variabilityPercent } = calculateIrregularIncomeAnalysis(inputs, bd);
      expect(variabilityPercent).toBe(0);
    });

    it('clamps values above 100 to 100', () => {
      const inputs = makeInputs({ annualSalary: 120000, incomeVariabilityPercent: 150 });
      const bd = calculateBudgetBreakdown(inputs);
      const { variabilityPercent } = calculateIrregularIncomeAnalysis(inputs, bd);
      expect(variabilityPercent).toBe(100);
    });

    it('P25 annual salary is non-negative even at 100% variability', () => {
      const inputs = makeInputs({ annualSalary: 120000, incomeVariabilityPercent: 100 });
      const bd = calculateBudgetBreakdown(inputs);
      const { scenarios } = calculateIrregularIncomeAnalysis(inputs, bd);
      expect(scenarios[0].grossAnnual).toBeGreaterThanOrEqual(0);
    });
  });

  describe('bonus income scaling', () => {
    it('bonus income is scaled proportionally at P25', () => {
      const inputs = makeInputs({
        annualSalary: 120000,
        bonusIncome: 12000,
        incomeVariabilityPercent: 25,
      });
      const bd = calculateBudgetBreakdown(inputs);
      const result = calculateIrregularIncomeAnalysis(inputs, bd);
      // P25 salary = 90000, ratio = 0.75 → bonus = 9000, total annual gross = 99000
      expect(result.scenarios[0].grossAnnual).toBeCloseTo(99000, 0);
      // grossMonthly includes bonus/12 + otherMonthlyIncome (no otherMonthlyIncome here)
      expect(result.scenarios[0].grossMonthly).toBeCloseTo(99000 / 12, 0);
    });
  });
});
