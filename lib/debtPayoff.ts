import type { DebtAccount } from '@/types/budget';

export type DebtPayoffStrategy = 'avalanche' | 'snowball';

export interface DebtPayoffMonth {
  month: number;
  remainingBalance: number;
  principalPaid: number;
  interestPaid: number;
  extraPaymentTargetDebtId?: string;
}

export interface DebtPayoffProjection {
  monthsToDebtFree: number | null;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  monthlyBudget: number;
  schedule: DebtPayoffMonth[];
}

interface WorkingDebt extends DebtAccount {
  remainingBalance: number;
}

export const MAX_DEBT_PAYOFF_YEARS = 50;
export const MAX_DEBT_PAYOFF_MONTHS = MAX_DEBT_PAYOFF_YEARS * 12;

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function sortDebts(debts: WorkingDebt[], strategy: DebtPayoffStrategy): WorkingDebt[] {
  if (strategy === 'snowball') {
    return [...debts].sort(
      (a, b) => a.remainingBalance - b.remainingBalance || b.interestRate - a.interestRate
    );
  }

  return [...debts].sort(
    (a, b) => b.interestRate - a.interestRate || a.remainingBalance - b.remainingBalance
  );
}

export function calculateDebtPayoffProjection(
  debts: DebtAccount[],
  extraDebtPayment: number,
  strategy: DebtPayoffStrategy = 'avalanche'
): DebtPayoffProjection {
  const normalizedDebts: WorkingDebt[] = debts
    .filter((debt) => debt.balance > 0)
    .map((debt) => ({
      ...debt,
      minimumPayment: Math.max(0, debt.minimumPayment),
      interestRate: Math.max(0, debt.interestRate),
      remainingBalance: debt.balance,
    }));

  if (normalizedDebts.length === 0) {
    return {
      monthsToDebtFree: 0,
      totalPrincipalPaid: 0,
      totalInterestPaid: 0,
      monthlyBudget: 0,
      schedule: [],
    };
  }

  const baseMinimum = normalizedDebts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
  const monthlyBudget = roundCents(baseMinimum + Math.max(0, extraDebtPayment));

  if (monthlyBudget <= 0) {
    return {
      monthsToDebtFree: null,
      totalPrincipalPaid: 0,
      totalInterestPaid: 0,
      monthlyBudget: 0,
      schedule: [],
    };
  }

  let totalPrincipalPaid = 0;
  let totalInterestPaid = 0;
  const schedule: DebtPayoffMonth[] = [];

  for (let month = 1; month <= MAX_DEBT_PAYOFF_MONTHS; month += 1) {
    let paymentPool = monthlyBudget;
    let monthInterest = 0;
    let monthPrincipal = 0;

    for (const debt of normalizedDebts) {
      if (debt.remainingBalance <= 0) continue;
      const monthlyRate = debt.interestRate / 100 / 12;
      const interest = roundCents(debt.remainingBalance * monthlyRate);
      debt.remainingBalance = roundCents(debt.remainingBalance + interest);
      monthInterest += interest;
    }

    // orderedDebts shares object references with normalizedDebts by design
    // so mutations stay synchronized while letting strategy control payment order.
    const orderedDebts = sortDebts(normalizedDebts, strategy);

    for (const debt of orderedDebts) {
      if (debt.remainingBalance <= 0 || paymentPool <= 0) continue;
      const minimumPayment = Math.min(debt.minimumPayment, debt.remainingBalance, paymentPool);
      debt.remainingBalance = roundCents(debt.remainingBalance - minimumPayment);
      paymentPool = roundCents(paymentPool - minimumPayment);
      monthPrincipal += minimumPayment;
    }

    let extraPaymentTargetDebtId: string | undefined;
    for (const debt of orderedDebts) {
      if (paymentPool <= 0) break;
      if (debt.remainingBalance <= 0) continue;

      const additional = Math.min(debt.remainingBalance, paymentPool);
      debt.remainingBalance = roundCents(debt.remainingBalance - additional);
      paymentPool = roundCents(paymentPool - additional);
      monthPrincipal += additional;
      if (additional > 0 && !extraPaymentTargetDebtId) {
        extraPaymentTargetDebtId = debt.id;
      }
    }

    // monthPrincipal tracks total payments made; subtract accrued interest to get
    // true principal reduction (i.e., payments that reduced the outstanding balance).
    const monthPrincipalReduction = roundCents(Math.max(0, monthPrincipal - monthInterest));
    totalInterestPaid = roundCents(totalInterestPaid + monthInterest);
    totalPrincipalPaid = roundCents(totalPrincipalPaid + monthPrincipalReduction);

    const remainingBalance = roundCents(
      normalizedDebts.reduce((sum, debt) => sum + Math.max(0, debt.remainingBalance), 0)
    );

    schedule.push({
      month,
      remainingBalance,
      principalPaid: monthPrincipalReduction,
      interestPaid: roundCents(monthInterest),
      extraPaymentTargetDebtId,
    });

    if (remainingBalance <= 0) {
      return {
        monthsToDebtFree: month,
        totalPrincipalPaid,
        totalInterestPaid,
        monthlyBudget,
        schedule,
      };
    }
  }

  return {
    monthsToDebtFree: null,
    totalPrincipalPaid,
    totalInterestPaid,
    monthlyBudget,
    schedule,
  };
}
