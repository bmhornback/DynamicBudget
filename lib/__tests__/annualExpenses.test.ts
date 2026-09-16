import { calculateAnnualExpensePlan, calculateTotalSinkingFunds, monthsUntilNextDueMonth } from '../annualExpenses';

describe('annualExpenses', () => {
  const referenceDate = new Date('2026-09-15T00:00:00.000Z');

  it('calculates months until next due month across year boundaries', () => {
    expect(monthsUntilNextDueMonth(9, referenceDate)).toBe(1);
    expect(monthsUntilNextDueMonth(12, referenceDate)).toBe(3);
    expect(monthsUntilNextDueMonth(2, referenceDate)).toBe(5);
  });

  it('clamps out-of-range dueMonth values to 1–12', () => {
    expect(monthsUntilNextDueMonth(0, referenceDate)).toBe(4);  // clamps to 1 → Jan (4 months from Sep)
    expect(monthsUntilNextDueMonth(13, referenceDate)).toBe(3); // clamps to 12 → Dec
  });

  it('defaults non-finite dueMonth to December', () => {
    expect(monthsUntilNextDueMonth(NaN, referenceDate)).toBe(3);
    expect(monthsUntilNextDueMonth(Infinity, referenceDate)).toBe(3);
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

  it('marks a fully-funded expense correctly', () => {
    const plan = calculateAnnualExpensePlan(
      [
        {
          id: 'travel',
          name: 'Travel',
          category: 'travel',
          annualAmount: 1000,
          currentSaved: 1000,
          dueMonth: 12,
          isEssential: false,
        },
      ],
      referenceDate
    );

    expect(plan).toHaveLength(1);
    expect(plan[0].isFullyFunded).toBe(true);
    expect(plan[0].remainingAmount).toBe(0);
    expect(plan[0].recommendedMonthlyContribution).toBe(0);
    expect(plan[0].fundedRatio).toBe(1);
  });

  it('caps fundedRatio at 1 when currentSaved exceeds annualAmount', () => {
    const plan = calculateAnnualExpensePlan(
      [
        {
          id: 'misc',
          name: 'Misc',
          category: 'other',
          annualAmount: 500,
          currentSaved: 800,
          dueMonth: 6,
          isEssential: false,
        },
      ],
      referenceDate
    );

    expect(plan[0].fundedRatio).toBe(1);
    expect(plan[0].remainingAmount).toBe(0);
  });

  it('filters out expenses with annualAmount of 0', () => {
    const plan = calculateAnnualExpensePlan(
      [
        {
          id: 'zero',
          name: 'Zero',
          category: 'other',
          annualAmount: 0,
          currentSaved: 0,
          dueMonth: 6,
          isEssential: false,
        },
      ],
      referenceDate
    );

    expect(plan).toHaveLength(0);
  });

  it('handles null/undefined expenses array gracefully', () => {
    // calculateAnnualExpensePlan uses `expenses ?? []` (line 41) — null is safe
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(calculateAnnualExpensePlan(null as any, referenceDate)).toHaveLength(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(calculateTotalSinkingFunds(null as any, referenceDate)).toBe(0);
  });

  it('handles non-finite dueMonth inside calculateAnnualExpensePlan', () => {
    const plan = calculateAnnualExpensePlan(
      [
        {
          id: 'weird',
          name: 'Weird',
          category: 'other',
          annualAmount: 1200,
          currentSaved: 0,
          dueMonth: NaN,
          isEssential: false,
        },
      ],
      referenceDate
    );

    expect(plan).toHaveLength(1);
    // annualExpenses.ts normalizes dueMonth before storing it on the plan object (line 45-60)
    expect(plan[0].dueMonth).toBe(12); // NaN → normalized to default 12
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

  it('returns zero sinking funds for empty input', () => {
    expect(calculateTotalSinkingFunds([], referenceDate)).toBe(0);
  });
});
