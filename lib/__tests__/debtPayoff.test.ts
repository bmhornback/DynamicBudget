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

  it('returns null payoff timeline when no minimum or extra debt budget exists', () => {
    const projection = calculateDebtPayoffProjection(
      [
        {
          id: 'no_payment',
          name: 'No Payment Debt',
          balance: 1000,
          interestRate: 10,
          minimumPayment: 0,
        },
      ],
      0
    );

    expect(projection.monthlyBudget).toBe(0);
    expect(projection.monthsToDebtFree).toBeNull();
    expect(projection.schedule).toHaveLength(0);
  });

  it('targets different first debt by strategy', () => {
    const debts: DebtAccount[] = [
      {
        id: 'high_rate_big_balance',
        name: 'High Rate Big Balance',
        balance: 10000,
        interestRate: 24,
        minimumPayment: 100,
      },
      {
        id: 'low_rate_small_balance',
        name: 'Low Rate Small Balance',
        balance: 1200,
        interestRate: 4,
        minimumPayment: 50,
      },
    ];

    const avalanche = calculateDebtPayoffProjection(debts, 300, 'avalanche');
    const snowball = calculateDebtPayoffProjection(debts, 300, 'snowball');

    expect(avalanche.schedule[0].extraPaymentTargetDebtId).toBe('high_rate_big_balance');
    expect(snowball.schedule[0].extraPaymentTargetDebtId).toBe('low_rate_small_balance');
  });

  it('returns perDebt array with correct ids', () => {
    const projection = calculateDebtPayoffProjection(sampleDebts, 200, 'avalanche');

    expect(projection.perDebt).toHaveLength(2);
    expect(projection.perDebt.map((d) => d.id)).toEqual(
      expect.arrayContaining(['credit_card', 'car_loan'])
    );
  });

  it('perDebt records paidOffMonth for each debt', () => {
    const projection = calculateDebtPayoffProjection(sampleDebts, 200, 'avalanche');

    for (const d of projection.perDebt) {
      expect(d.paidOffMonth).not.toBeNull();
      expect(d.paidOffMonth).toBeGreaterThan(0);
    }
  });

  it('avalanche pays off highest-rate debt first', () => {
    const projection = calculateDebtPayoffProjection(sampleDebts, 200, 'avalanche');
    const creditCard = projection.perDebt.find((d) => d.id === 'credit_card');
    const carLoan = projection.perDebt.find((d) => d.id === 'car_loan');

    // Credit card (24% APR) should be targeted first with avalanche
    expect(creditCard?.paidOffMonth).toBeLessThan(carLoan?.paidOffMonth ?? Infinity);
  });

  it('snowball pays off smallest-balance debt first', () => {
    const projection = calculateDebtPayoffProjection(sampleDebts, 200, 'snowball');
    const creditCard = projection.perDebt.find((d) => d.id === 'credit_card');
    const carLoan = projection.perDebt.find((d) => d.id === 'car_loan');

    // Credit card ($5k) is smaller than car loan ($12k) so snowball targets it first
    expect(creditCard?.paidOffMonth).toBeLessThan(carLoan?.paidOffMonth ?? Infinity);
  });

  it('perDebt totalInterestPaid is non-negative and less than total interest', () => {
    const projection = calculateDebtPayoffProjection(sampleDebts, 200, 'avalanche');

    let sumPerDebtInterest = 0;
    for (const d of projection.perDebt) {
      expect(d.totalInterestPaid).toBeGreaterThanOrEqual(0);
      sumPerDebtInterest += d.totalInterestPaid;
    }
    // Sum of per-debt interest should approximately equal total (within rounding)
    expect(Math.abs(sumPerDebtInterest - projection.totalInterestPaid)).toBeLessThan(1);
  });

  it('perDebt is empty for empty debt list', () => {
    const projection = calculateDebtPayoffProjection([], 200);
    expect(projection.perDebt).toHaveLength(0);
  });

  it('perDebt has null paidOffMonth when no budget', () => {
    const projection = calculateDebtPayoffProjection(
      [{ id: 'a', name: 'A', balance: 1000, interestRate: 10, minimumPayment: 0 }],
      0
    );
    expect(projection.perDebt[0].paidOffMonth).toBeNull();
  });
});
