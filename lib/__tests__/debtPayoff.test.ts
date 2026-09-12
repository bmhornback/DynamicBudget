import { calculateDebtPayoffProjection } from '../debtPayoff';
import type { DebtAccount } from '@/types/budget';

const sampleDebts: DebtAccount[] = [
  {
    id: 'credit_card',
    name: 'Credit Card',
    balance: 5000,
    interestRate: 24,
    minimumPayment: 150,
  },
  {
    id: 'car_loan',
    name: 'Car Loan',
    balance: 12000,
    interestRate: 6,
    minimumPayment: 300,
  },
];

describe('calculateDebtPayoffProjection', () => {
  it('returns immediate payoff for empty debt list', () => {
    const projection = calculateDebtPayoffProjection([], 200);

    expect(projection.monthsToDebtFree).toBe(0);
    expect(projection.totalInterestPaid).toBe(0);
    expect(projection.schedule).toHaveLength(0);
  });

  it('pays down debt over time with extra payment', () => {
    const projection = calculateDebtPayoffProjection(sampleDebts, 200);

    expect(projection.monthsToDebtFree).not.toBeNull();
    expect(projection.monthlyBudget).toBe(650);
    expect(projection.totalInterestPaid).toBeGreaterThan(0);
    expect(projection.schedule[projection.schedule.length - 1].remainingBalance).toBe(0);
  });

  it('avalanche strategy should not take longer than snowball for same inputs', () => {
    const avalanche = calculateDebtPayoffProjection(sampleDebts, 100, 'avalanche');
    const snowball = calculateDebtPayoffProjection(sampleDebts, 100, 'snowball');

    expect(avalanche.monthsToDebtFree).not.toBeNull();
    expect(snowball.monthsToDebtFree).not.toBeNull();
    expect((avalanche.monthsToDebtFree ?? Infinity)).toBeLessThanOrEqual(
      snowball.monthsToDebtFree ?? Infinity
    );
  });
});
