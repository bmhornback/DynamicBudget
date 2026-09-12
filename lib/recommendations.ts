/**
 * Budget recommendations engine for MoveMath.
 * Generates contextual warnings and suggestions based on current budget state.
 */

import type { BudgetBreakdown, BudgetInputs, Recommendation } from '@/types/budget';
import { BUDGET_THRESHOLDS, ANNUAL_401K_LIMIT } from './budgetCalculations';
import { calculateLongTermGoalProjections, MONTHLY_COMPARISON_EPSILON } from './longTermGoals';
import {
  TRADITIONAL_IRA_PHASEOUT_SINGLE_START,
  TRADITIONAL_IRA_PHASEOUT_SINGLE_END,
  TRADITIONAL_IRA_PHASEOUT_MFJ_START,
  TRADITIONAL_IRA_PHASEOUT_MFJ_END,
} from './taxCalculations';

/**
 * Generate a list of contextual recommendations based on budget breakdown and inputs.
 */
export function generateRecommendations(
  inputs: BudgetInputs,
  breakdown: BudgetBreakdown
): Recommendation[] {
  const recs: Recommendation[] = [];
  const housingPaymentLabel = inputs.housingMode === 'homeowner' ? 'Housing payment' : 'Rent';
  const housingFundLabel = inputs.housingMode === 'homeowner' ? 'home equity fund' : 'house fund';
  const housingFundLabelTitleCase = housingFundLabel.charAt(0).toUpperCase() + housingFundLabel.slice(1);
  const goalProjections = calculateLongTermGoalProjections(inputs, breakdown);

  const {
    primaryHousingPaymentAsPercentGross,
    primaryHousingPaymentAsPercentTakeHome,
    retirement,
    remainingMonthlyBuffer,
    netMonthlyIncome,
    annualHouseFund,
    emergencyFundTargetCalculated,
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
      detail: `Consider allocating the surplus to savings, investments, or your ${housingFundLabel}.`,
    });
  }

  // ── Housing payment warnings ──────────────────────────────────────────────
  if (primaryHousingPaymentAsPercentGross > BUDGET_THRESHOLDS.rentPercentGross) {
    recs.push({
      id: 'housing_payment_high_gross',
      severity: 'warning',
      message: `${housingPaymentLabel} is ${(primaryHousingPaymentAsPercentGross * 100).toFixed(1)}% of gross income — above the 30% guideline.`,
      detail: 'High housing-cost-to-income ratios limit savings and financial flexibility.',
    });
  }

  if (primaryHousingPaymentAsPercentTakeHome > BUDGET_THRESHOLDS.rentPercentTakeHome) {
    recs.push({
      id: 'housing_payment_high_takehome',
      severity: 'warning',
      message: `${housingPaymentLabel} is ${(primaryHousingPaymentAsPercentTakeHome * 100).toFixed(1)}% of take-home pay — above 40%.`,
      detail: 'Very high housing costs relative to take-home pay can make saving very difficult.',
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
      id: 'housing_fund_slow',
      severity: 'info',
      message: `${housingFundLabelTitleCase} is $${(annualHouseFund / 12).toFixed(0)}/month ($${annualHouseFund.toFixed(0)}/year).`,
      detail: 'In a high-cost market like San Diego, a larger monthly contribution may be needed.',
    });
  }

  // ── Long-term goals ────────────────────────────────────────────────────────
  const behindGoals = goalProjections.filter((goal) => goal.status === 'behind' || goal.status === 'past_due');
  const generalGoals = goalProjections.filter((goal) =>
    ['vacation', 'kids', 'major_purchase', 'custom'].includes(goal.category)
  );
  const totalGeneralRequired = generalGoals.reduce((sum, goal) => sum + goal.requiredMonthlySavings, 0);

  if (behindGoals.length > 0) {
    behindGoals.slice(0, 3).forEach((goal) => {
      recs.push({
        id: `goal_behind_${goal.id}`,
        severity: goal.status === 'past_due' ? 'warning' : 'info',
        message:
          goal.status === 'past_due'
            ? `${goal.name} is past its target date and still needs ${formatCurrency(goal.remainingAmount)}.`
            : `${goal.name} needs ${formatCurrency(goal.requiredMonthlySavings)}/month to stay on pace.`,
        detail: `Current funding from ${goal.fundingSourceLabel} is about ${formatCurrency(goal.currentMonthlyFunding)}/month.`,
      });
    });
  }

  if (generalGoals.length >= 1 && totalGeneralRequired > inputs.generalCashSavings + MONTHLY_COMPARISON_EPSILON) {
    recs.push({
      id: 'goal_pool_underfunded',
      severity: 'info',
      message: 'Shared long-term goals need more monthly cash than your general savings bucket provides.',
      detail: `${formatCurrency(totalGeneralRequired)}/month is needed across flexible goals, versus ${formatCurrency(inputs.generalCashSavings)}/month currently allocated.`,
    });
  }

  if (goalProjections.some((goal) => goal.status === 'no_deadline' && goal.remainingAmount > 0)) {
    recs.push({
      id: 'goal_missing_deadline',
      severity: 'info',
      message: 'At least one long-term goal is missing a target month.',
      detail: 'Adding a target date turns a wish list into a monthly savings target you can track.',
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
    primaryHousingPaymentAsPercentGross <= BUDGET_THRESHOLDS.rentPercentGross
  ) {
    recs.push({
      id: 'budget_healthy',
      severity: 'success',
      message: 'This budget is aggressive but sustainable.',
      detail: 'You are saving well for retirement and keeping key ratios in check.',
    });
  }

  if (
    primaryHousingPaymentAsPercentGross > 0.35 &&
    retirement.retirementSavingsRate < 0.10 &&
    remainingMonthlyBuffer < 200
  ) {
    recs.push({
      id: 'budget_risky',
      severity: 'warning',
      message: 'This salary may be too tight for this housing and savings goal.',
      detail: `Consider increasing salary, reducing ${inputs.housingMode === 'homeowner' ? 'housing costs' : 'rent'}, or scaling back savings targets temporarily.`,
    });
  }

  // ── Traditional IRA Phase-Out Warning ──────────────────────────────────────
  if (inputs.iraType === 'traditional' && inputs.iraContribution > 0) {
    const grossAnnual = breakdown.taxes.grossAnnual;
    
    let phaseoutStart: number;
    let phaseoutEnd: number;

    if (inputs.filingStatus === 'married_jointly') {
      phaseoutStart = TRADITIONAL_IRA_PHASEOUT_MFJ_START;
      phaseoutEnd = TRADITIONAL_IRA_PHASEOUT_MFJ_END;
    } else {
      phaseoutStart = TRADITIONAL_IRA_PHASEOUT_SINGLE_START;
      phaseoutEnd = TRADITIONAL_IRA_PHASEOUT_SINGLE_END;
    }

    if (grossAnnual > phaseoutStart && grossAnnual < phaseoutEnd) {
      const percentThroughPhaseout = (grossAnnual - phaseoutStart) / (phaseoutEnd - phaseoutStart);
      const allowedPercent = 1 - percentThroughPhaseout;
      const maxAllowedIRA = allowedPercent * 7000;

      recs.push({
        id: 'ira_phaseout_partial',
        severity: 'info',
        message: `Your income is in the Traditional IRA deduction phase-out range.`,
        detail: `At your income level ($${grossAnnual.toLocaleString()}), only $${maxAllowedIRA.toFixed(0)}/year of Traditional IRA contributions are tax-deductible. Consider a Roth IRA if eligible.`,
      });
    } else if (grossAnnual >= phaseoutEnd) {
      recs.push({
        id: 'ira_phaseout_full',
        severity: 'warning',
        message: `Your income exceeds Traditional IRA contribution limits.`,
        detail: `At your income level ($${grossAnnual.toLocaleString()}), Traditional IRA contributions are not tax-deductible. Consider a Roth IRA or Backdoor Roth strategy.`,
      });
    }
  }

  return recs;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}
