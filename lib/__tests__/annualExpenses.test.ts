import { calculateAnnualExpensePlan, calculateTotalSinkingFunds, monthsUntilNextDueMonth } from '../annualExpenses';

describe('annualExpenses', () => {
  const referenceDate = new Date('2026-09-15T00:00:00.000Z');

  it('calculates months until next due month across year boundaries', () => {
    expect(monthsUntilNextDueMonth(9, referenceDate)).toBe(1);
    expect(monthsUntilNextDueMonth(12, referenceDate)).toBe(3);
    expect(monthsUntilNextDueMonth(2, referenceDate)).toBe(5);
  });

  it('builds annual expense plans with monthly contributions and readiness flags', () => {
    const plan = calculateAnnualExpensePlan(
      [
        {
          id: 'insurance',
          name: 'Car Insurance Deductible',
          category: 'insurance',
          annualAmount: 1200,
          currentSaved: 300,
          dueMonth: 12,
          isEssential: true,
        },
      ],
      referenceDate
    );

    expect(plan).toHaveLength(1);
    expect(plan[0].monthsUntilDue).toBe(3);
    expect(plan[0].remainingAmount).toBe(900);
    expect(plan[0].recommendedMonthlyContribution).toBeCloseTo(300, 2);
    expect(plan[0].isDueSoon).toBe(true);
    expect(plan[0].isEssential).toBe(true);
  });

  it('totals sinking funds across multiple annual expenses', () => {
    const total = calculateTotalSinkingFunds(
      [
        {
          id: 'travel',
          name: 'Annual Travel',
          category: 'travel',
          annualAmount: 2400,
          currentSaved: 0,
          dueMonth: 3,
          isEssential: false,
        },
        {
          id: 'registration',
          name: 'Car Registration',
          category: 'car',
          annualAmount: 600,
          currentSaved: 300,
          dueMonth: 10,
          isEssential: true,
        },
      ],
      referenceDate
    );

    expect(total).toBeGreaterThan(0);
    expect(total).toBeCloseTo(700, 0);
  });
});
