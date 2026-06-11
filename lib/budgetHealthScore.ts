/**
 * Budget health score calculation for MoveMath.
 * Returns a 0–100 score based on key affordability and savings metrics.
 */

import type { BudgetBreakdown, BudgetHealthScore, HealthScoreLabel } from '@/types/budget';
import { BUDGET_THRESHOLDS } from './budgetCalculations';

function clampScore(s: number): number {
  return Math.max(0, Math.min(100, s));
}

/**
 * Calculate a budget health score (0–100) and label based on the breakdown.
 */
export function calculateBudgetHealthScore(breakdown: BudgetBreakdown): BudgetHealthScore {
  const {
    rentAsPercentGross,
    rentAsPercentTakeHome,
    retirement,
    emergencyFundTargetCalculated,
    grossMonthly,
    netMonthlyIncome,
    remainingMonthlyBuffer,
    totalTransportation,
    totalPets,
    totalSavings,
    totalInvestments,
    houseDownPaymentContribution,
    emergencyFundContribution,
  } = breakdown as BudgetBreakdown & {
    houseDownPaymentContribution?: number;
    emergencyFundContribution?: number;
  };

  // ── Rent affordability (0–20 pts) ─────────────────────────────────────────
  let rentScore = 20;
  if (rentAsPercentGross > 0.40) rentScore = 0;
  else if (rentAsPercentGross > 0.35) rentScore = 5;
  else if (rentAsPercentGross > 0.30) rentScore = 10;
  else if (rentAsPercentGross > 0.25) rentScore = 15;

  // ── Retirement savings rate (0–20 pts) ───────────────────────────────────
  let retirementScore = 0;
  const retRate = retirement.retirementSavingsRate;
  if (retRate >= 0.20) retirementScore = 20;
  else if (retRate >= 0.15) retirementScore = 17;
  else if (retRate >= 0.10) retirementScore = 12;
  else if (retRate >= 0.05) retirementScore = 6;

  // ── Emergency fund contribution (0–15 pts) ───────────────────────────────
  // Score based on whether they're contributing meaningfully
  const efContrib = breakdown.totalSavings; // approximation — will refine below
  let efScore = 0;
  if (grossMonthly > 0) {
    const efRate = efContrib / grossMonthly;
    if (efRate >= 0.05) efScore = 15;
    else if (efRate >= 0.03) efScore = 10;
    else if (efRate >= 0.01) efScore = 5;
  }

  // ── House fund contribution (0–10 pts) ───────────────────────────────────
  let houseFundScore = 0;
  const hfContrib = breakdown.annualHouseFund / 12;
  if (hfContrib >= 2000) houseFundScore = 10;
  else if (hfContrib >= 1000) houseFundScore = 7;
  else if (hfContrib >= 500) houseFundScore = 4;
  else if (hfContrib > 0) houseFundScore = 2;

  // ── Monthly buffer (0–15 pts) ─────────────────────────────────────────────
  let bufferScore = 0;
  if (remainingMonthlyBuffer >= 1000) bufferScore = 15;
  else if (remainingMonthlyBuffer >= 500) bufferScore = 12;
  else if (remainingMonthlyBuffer >= 250) bufferScore = 8;
  else if (remainingMonthlyBuffer >= 0) bufferScore = 4;
  else bufferScore = 0; // over budget

  // ── Debt/car burden (0–10 pts) ────────────────────────────────────────────
  let carDebtScore = 10;
  const carRate = netMonthlyIncome > 0 ? totalTransportation / netMonthlyIncome : 0;
  if (carRate > 0.20) carDebtScore = 0;
  else if (carRate > 0.15) carDebtScore = 4;
  else if (carRate > 0.10) carDebtScore = 7;

  // ── Pet cost burden (0–5 pts) ─────────────────────────────────────────────
  let petScore = 5;
  const petRate = netMonthlyIncome > 0 ? totalPets / netMonthlyIncome : 0;
  if (petRate > 0.15) petScore = 0;
  else if (petRate > 0.10) petScore = 2;
  else if (petRate > 0.07) petScore = 3;

  // ── Total savings rate (0–5 pts) ──────────────────────────────────────────
  let savingsScore = 0;
  const totalMonthlySavings =
    totalSavings + totalInvestments + retirement.monthly401k + retirement.monthlyIRA;
  const totalSavingsRate = grossMonthly > 0 ? totalMonthlySavings / grossMonthly : 0;
  if (totalSavingsRate >= 0.25) savingsScore = 5;
  else if (totalSavingsRate >= 0.20) savingsScore = 4;
  else if (totalSavingsRate >= 0.15) savingsScore = 3;
  else if (totalSavingsRate >= 0.10) savingsScore = 1;

  const totalScore = clampScore(
    rentScore +
    retirementScore +
    efScore +
    houseFundScore +
    bufferScore +
    carDebtScore +
    petScore +
    savingsScore
  );

  let label: HealthScoreLabel;
  if (totalScore >= 90) label = 'Excellent';
  else if (totalScore >= 75) label = 'Strong';
  else if (totalScore >= 60) label = 'Workable';
  else if (totalScore >= 40) label = 'Tight';
  else label = 'Risky';

  return {
    score: totalScore,
    label,
    breakdown: {
      rentAffordability: rentScore,
      retirementRate: retirementScore,
      emergencyFundContrib: efScore,
      houseFundContrib: houseFundScore,
      monthlyBuffer: bufferScore,
      debtCarBurden: carDebtScore,
      petCostBurden: petScore,
      totalSavingsRate: savingsScore,
    },
  };
}

export const HEALTH_SCORE_COLORS: Record<HealthScoreLabel, string> = {
  Excellent: 'text-green-600',
  Strong: 'text-emerald-500',
  Workable: 'text-yellow-500',
  Tight: 'text-orange-500',
  Risky: 'text-red-600',
};

export const HEALTH_SCORE_BG_COLORS: Record<HealthScoreLabel, string> = {
  Excellent: 'bg-green-500',
  Strong: 'bg-emerald-500',
  Workable: 'bg-yellow-500',
  Tight: 'bg-orange-500',
  Risky: 'bg-red-600',
};
