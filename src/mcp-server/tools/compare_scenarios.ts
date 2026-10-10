/**
 * compare_scenarios tool implementation.
 * Compares 2–4 named budget scenarios side by side, with a diff against
 * the first (baseline) scenario. Includes health score, taxes, expense
 * totals, savings rates, and surplus/deficit for each.
 */

import { calculateBudgetBreakdown } from '../../../lib/budgetCalculations.js';
import { calculateBudgetHealthScore } from '../../../lib/budgetHealthScore.js';
import { buildBudgetInputs, round2, type McpCoreBudgetParams } from '../adapters.js';

export interface ScenarioInput extends McpCoreBudgetParams {
  name: string;
  description?: string;
}

export interface ScenarioSnapshot {
  name: string;
  description?: string;
  salary: number;
  state: string;
  gross_monthly: number;
  net_monthly_income: number;
  taxes: {
    federal_monthly: number;
    state_monthly: number;
    fica_monthly: number;
    effective_total_rate: number;
  };
  expense_totals: {
    housing: number;
    utilities: number;
    transportation: number;
    groceries_food: number;
    health: number;
    lifestyle: number;
    savings: number;
    debt_payoff: number;
  };
  total_allocated: number;
  remaining_monthly_buffer: number;
  is_over_budget: boolean;
  surplus: number;
  deficit: number;
  savings_rate_gross: number;
  health_score: number;
  health_label: string;
}

export interface ScenarioDiff {
  name: string;
  vs_baseline: {
    net_monthly_income_delta: number;
    total_allocated_delta: number;
    remaining_buffer_delta: number;
    savings_rate_delta: number;
    health_score_delta: number;
    annual_state_tax_delta: number;
  };
}

export interface CompareScenariosResult {
  baseline: ScenarioSnapshot;
  comparisons: ScenarioSnapshot[];
  diffs: ScenarioDiff[];
  winner: string;
  winner_reason: string;
}

export interface CompareScenariosParams {
  scenarios: ScenarioInput[];
}

function buildSnapshot(scenario: ScenarioInput): ScenarioSnapshot & { taxes_annual_state: number } {
  const inputs = buildBudgetInputs(scenario);
  const bd = calculateBudgetBreakdown(inputs);
  const health = calculateBudgetHealthScore(bd);

  const federalMonthly = round2(bd.taxes.federalMonthly);
  const stateMonthly = round2(bd.taxes.stateMonthly);
  const ficaMonthly = round2(bd.taxes.payrollMonthly);
  const grossMonthly = round2(bd.taxes.grossMonthly);
  const netMonthly = round2(bd.netMonthlyIncome);
  const effectiveTotalRate = grossMonthly > 0
    ? round2((federalMonthly + stateMonthly + ficaMonthly) / grossMonthly)
    : 0;

  const savingsTotal = round2(
    bd.retirement.monthly401k +
    bd.retirement.monthly401kCatchUp +
    bd.retirement.monthlyIRA +
    bd.retirement.monthlyIRACatchUp +
    bd.retirement.monthlyHSA +
    bd.effectiveEmergencyFundContribution
  );

  return {
    name: scenario.name,
    description: scenario.description,
    salary: scenario.salary,
    state: scenario.state,
    gross_monthly: grossMonthly,
    net_monthly_income: netMonthly,
    taxes: {
      federal_monthly: federalMonthly,
      state_monthly: stateMonthly,
      fica_monthly: ficaMonthly,
      effective_total_rate: effectiveTotalRate,
    },
    expense_totals: {
      housing: round2(bd.totalHousing),
      utilities: round2(bd.totalUtilities),
      transportation: round2(bd.totalTransportation),
      groceries_food: round2(bd.totalGroceriesFood),
      health: round2(bd.totalHealth),
      lifestyle: round2(bd.totalLifestyle),
      savings: savingsTotal,
      debt_payoff: round2(bd.totalDebtPayoff ?? 0),
    },
    total_allocated: round2(bd.totalAllocated),
    remaining_monthly_buffer: round2(bd.remainingMonthlyBuffer),
    is_over_budget: bd.isOverBudget,
    surplus: round2(bd.surplus),
    deficit: round2(bd.deficit),
    savings_rate_gross: round2(bd.retirement.retirementSavingsRate),
    health_score: health.score,
    health_label: health.label,
    taxes_annual_state: round2(bd.taxes.stateAnnual),
  };
}

export function compareScenarios(params: CompareScenariosParams): CompareScenariosResult {
  const [baselineScenario, ...restScenarios] = params.scenarios;
  const baseline = buildSnapshot(baselineScenario);
  const comparisons = restScenarios.map(buildSnapshot);

  const diffs: ScenarioDiff[] = comparisons.map((snap) => ({
    name: snap.name,
    vs_baseline: {
      net_monthly_income_delta: round2(snap.net_monthly_income - baseline.net_monthly_income),
      total_allocated_delta: round2(snap.total_allocated - baseline.total_allocated),
      remaining_buffer_delta: round2(snap.remaining_monthly_buffer - baseline.remaining_monthly_buffer),
      savings_rate_delta: round2(snap.savings_rate_gross - baseline.savings_rate_gross),
      health_score_delta: round2(snap.health_score - baseline.health_score),
      annual_state_tax_delta: round2(snap.taxes_annual_state - baseline.taxes_annual_state),
    },
  }));

  // Determine winner by highest health score
  const all = [baseline, ...comparisons];
  const winnerSnap = all.reduce((best, s) => (s.health_score > best.health_score ? s : best), all[0]);
  const winnerReason = winnerSnap.is_over_budget
    ? `${winnerSnap.name} has the best health score (${winnerSnap.health_score}) among the scenarios, though it is still over budget.`
    : `${winnerSnap.name} has the highest budget health score (${winnerSnap.health_score}: ${winnerSnap.health_label}) with a $${winnerSnap.remaining_monthly_buffer.toFixed(0)}/mo buffer.`;

  // Strip internal-only `taxes_annual_state` field before returning
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { taxes_annual_state: _b, ...baselineClean } = baseline;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const comparisonsClean = comparisons.map(({ taxes_annual_state: _c, ...rest }) => rest);

  return {
    baseline: baselineClean,
    comparisons: comparisonsClean,
    diffs,
    winner: winnerSnap.name,
    winner_reason: winnerReason,
  };
}
