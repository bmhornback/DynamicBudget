/**
 * Budget recommendations engine for MoveMath.
 * Generates contextual warnings and suggestions based on current budget state.
 */

import type { BudgetBreakdown, BudgetInputs, Recommendation } from '@/types/budget';
import { BUDGET_THRESHOLDS, ANNUAL_401K_LIMIT } from './budgetCalculations';

/**
 * Generate a list of contextual recommendations based on budget breakdown and inputs.
 */
export function generateRecommendations(
  inputs: BudgetInputs,
  breakdown: BudgetBreakdown
): Recommendation[] {
  const recs: Recommendation[] = [];

  const {
    rentAsPercentGross,
    rentAsPercentTakeHome,
    retirement,
    remainingMonthlyBuffer,
    netMonthlyIncome,
    totalTransportation,
    totalPets,
    annualHouseFund,
    emergencyFundTargetCalculated,
    totalSavings,
    totalInvestments,
    isOverBudget,
    deficit,
    surplus,
    totalLifestyle,
  } = breakdown;

  // ── Over/Under budget ─────────────────────────────────────────────────────
  if (isOverBudget) {
    recs.push({
      id: 'over_budget',
      severity: 'warning',
      message: `Budget is over by $${deficit.toLocaleString('en-US', { maximumFractionDigits: 0 })}/month.`,
      detail: 'Use Auto Balance or reduce expenses to bring the budget in line.',
    });
  } else if (remainingMonthlyBuffer < BUDGET_THRESHOLDS.minMonthlyBuffer && remainingMonthlyBuffer >= 0) {
    recs.push({
      id: 'low_buffer',
      severity: 'warning',
      message: `Monthly buffer is below $${BUDGET_THRESHOLDS.minMonthlyBuffer} ($${remainingMonthlyBuffer.toFixed(0)}/month).`,
      detail: 'A thin buffer leaves little room for unexpected expenses.',
    });
  } else if (surplus > 0) {
    recs.push({
      id: 'surplus',
      severity: 'success',
      message: `You have a $${surplus.toFixed(0)}/month surplus.`,
      detail: 'Consider allocating the surplus to savings, investments, or your house fund.',
    });
  }

  // ── Rent warnings ─────────────────────────────────────────────────────────
  if (rentAsPercentGross > BUDGET_THRESHOLDS.rentPercentGross) {
    recs.push({
      id: 'rent_high_gross',
      severity: 'warning',
      message: `Rent is ${(rentAsPercentGross * 100).toFixed(1)}% of gross income — above the 30% guideline.`,
      detail: 'High rent-to-income ratios limit savings and financial flexibility.',
    });
  }

  if (rentAsPercentTakeHome > BUDGET_THRESHOLDS.rentPercentTakeHome) {
    recs.push({
      id: 'rent_high_takehome',
      severity: 'warning',
      message: `Rent is ${(rentAsPercentTakeHome * 100).toFixed(1)}% of take-home pay — above 40%.`,
      detail: 'Very high rent relative to take-home pay can make saving very difficult.',
    });
  }

  // ── Retirement ─────────────────────────────────────────────────────────────
  if (!retirement.isSaving15Percent) {
    recs.push({
      id: 'retirement_low',
      severity: 'warning',
      message: `Retirement savings rate is ${(retirement.retirementSavingsRate * 100).toFixed(1)}% — below the recommended 15%.`,
      detail: 'Consider increasing your 401(k) or IRA contributions.',
    });
  }

  if (!retirement.isMaxing401k) {
    const remaining = ANNUAL_401K_LIMIT - retirement.annual401k;
    recs.push({
      id: 'not_maxing_401k',
      severity: 'info',
      message: `You have $${remaining.toLocaleString('en-US', { maximumFractionDigits: 0 })}/year more room in your 401(k).`,
      detail: `Maxing out at $${ANNUAL_401K_LIMIT.toLocaleString('en-US')}/year provides significant tax benefits.`,
    });
  }

  // ── Emergency fund ────────────────────────────────────────────────────────
  const efMonthly = inputs.emergencyFundContribution;
  if (efMonthly <= 0) {
    recs.push({
      id: 'no_emergency_fund',
      severity: 'warning',
      message: 'No emergency fund contribution allocated.',
      detail: `Target: $${emergencyFundTargetCalculated.toLocaleString('en-US', { maximumFractionDigits: 0 })} (6 months of essential expenses).`,
    });
  } else if (inputs.emergencyFundTarget > 0 && efMonthly < inputs.emergencyFundTarget / 24) {
    recs.push({
      id: 'emergency_fund_slow',
      severity: 'info',
      message: 'Emergency fund savings pace is slow.',
      detail: `At the current rate, it would take over 2 years to reach your target.`,
    });
  }

  // ── House fund ────────────────────────────────────────────────────────────
  if (inputs.houseDownPaymentContribution > 0 && annualHouseFund < 12000) {
    recs.push({
      id: 'house_fund_slow',
      severity: 'info',
      message: `House fund is $${(annualHouseFund / 12).toFixed(0)}/month ($${annualHouseFund.toFixed(0)}/year).`,
      detail: 'In a high-cost market like San Diego, a larger monthly contribution may be needed.',
    });
  }

  // ── Pet costs ─────────────────────────────────────────────────────────────
  if (inputs.petsEnabled && breakdown.petCostsAsPercentTakeHome > BUDGET_THRESHOLDS.petPercentTakeHome) {
    recs.push({
      id: 'pet_costs_high',
      severity: 'warning',
      message: `Pet costs are ${(breakdown.petCostsAsPercentTakeHome * 100).toFixed(1)}% of take-home pay.`,
      detail: 'Consider reviewing pet-related discretionary expenses like daycare or boarding.',
    });
  }

  // ── Car costs ─────────────────────────────────────────────────────────────
  if (breakdown.carCostsAsPercentTakeHome > BUDGET_THRESHOLDS.carPercentTakeHome) {
    recs.push({
      id: 'car_costs_high',
      severity: 'warning',
      message: `Car costs are ${(breakdown.carCostsAsPercentTakeHome * 100).toFixed(1)}% of take-home pay — unusually high.`,
      detail: 'Consider refinancing, reducing insurance, or cutting transportation extras.',
    });
  }

  // ── Lifestyle ─────────────────────────────────────────────────────────────
  const lifestyleRate = netMonthlyIncome > 0 ? totalLifestyle / netMonthlyIncome : 0;
  if (lifestyleRate > BUDGET_THRESHOLDS.maxLifestylePercentTakeHome) {
    recs.push({
      id: 'lifestyle_high',
      severity: 'info',
      message: `Lifestyle spending is ${(lifestyleRate * 100).toFixed(1)}% of take-home pay.`,
      detail: 'Reducing discretionary spending can accelerate savings goals.',
    });
  }

  // ── Positive reinforcement ────────────────────────────────────────────────
  if (
    !isOverBudget &&
    remainingMonthlyBuffer >= BUDGET_THRESHOLDS.minMonthlyBuffer &&
    retirement.isSaving15Percent &&
    rentAsPercentGross <= BUDGET_THRESHOLDS.rentPercentGross
  ) {
    recs.push({
      id: 'budget_healthy',
      severity: 'success',
      message: 'This budget is aggressive but sustainable.',
      detail: 'You are saving well for retirement and keeping key ratios in check.',
    });
  }

  if (
    rentAsPercentGross > 0.35 &&
    retirement.retirementSavingsRate < 0.10 &&
    remainingMonthlyBuffer < 200
  ) {
    recs.push({
      id: 'budget_risky',
      severity: 'warning',
      message: 'This salary may be too tight for this rent and savings goal.',
      detail: 'Consider increasing salary, reducing rent, or scaling back savings targets temporarily.',
    });
  }

  return recs;
}
