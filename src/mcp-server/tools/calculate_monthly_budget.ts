/**
 * calculate_monthly_budget tool implementation.
 * Returns a complete monthly budget breakdown for the given salary, state,
 * expenses, and savings configuration.
 */

import { calculateBudgetBreakdown } from '@/lib/budgetCalculations';
import { buildBudgetInputs, round2, type McpCoreBudgetParams } from '../adapters';

export interface MonthlyBudgetResult {
  gross_monthly: number;
  net_monthly_income: number;
  taxes: {
    federal_monthly: number;
    state_monthly: number;
    fica_monthly: number;
    effective_federal_rate: number;
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
    investments: number;
    debt_payoff: number;
  };
  total_allocated: number;
  remaining_monthly_buffer: number;
  is_over_budget: boolean;
  surplus: number;
  deficit: number;
  savings_rate_gross: number;
  savings_rate_net: number;
  housing_percent_gross: number;
  emergency_fund_target: number;
}

export function calculateMonthlyBudget(params: McpCoreBudgetParams): MonthlyBudgetResult {
  const inputs = buildBudgetInputs(params);
  const bd = calculateBudgetBreakdown(inputs);

  const federalMonthly = round2(bd.taxes.federalMonthly);
  const stateMonthly = round2(bd.taxes.stateMonthly);
  const ficaMonthly = round2(bd.taxes.payrollMonthly);
  const grossMonthly = round2(bd.taxes.grossMonthly);
  const netMonthly = round2(bd.netMonthlyIncome);

  const totalTaxMonthly = federalMonthly + stateMonthly + ficaMonthly;
  const effectiveFederalRate = round2(bd.taxes.federalAnnual / bd.taxes.grossAnnual);
  const effectiveTotalRate = grossMonthly > 0 ? round2(totalTaxMonthly / grossMonthly) : 0;

  const savingsTotal = round2(
    bd.retirement.monthly401k +
    bd.retirement.monthly401kCatchUp +
    bd.retirement.monthlyIRA +
    bd.retirement.monthlyIRACatchUp +
    bd.retirement.monthlyHSA +
    bd.effectiveEmergencyFundContribution
  );
  const investmentsTotal = round2(bd.totalInvestments);
  const debtPayoffTotal = round2(bd.totalDebtPayoff ?? 0);

  const totalAllocated = round2(bd.totalAllocated);
  const buffer = round2(bd.remainingMonthlyBuffer);

  return {
    gross_monthly: grossMonthly,
    net_monthly_income: netMonthly,
    taxes: {
      federal_monthly: federalMonthly,
      state_monthly: stateMonthly,
      fica_monthly: ficaMonthly,
      effective_federal_rate: effectiveFederalRate,
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
      investments: investmentsTotal,
      debt_payoff: debtPayoffTotal,
    },
    total_allocated: totalAllocated,
    remaining_monthly_buffer: buffer,
    is_over_budget: bd.isOverBudget,
    surplus: round2(bd.surplus),
    deficit: round2(bd.deficit),
    savings_rate_gross: round2(bd.retirement.retirementSavingsRate),
    savings_rate_net: netMonthly > 0 ? round2(savingsTotal / netMonthly) : 0,
    housing_percent_gross: round2(bd.primaryHousingPaymentAsPercentGross),
    emergency_fund_target: round2(bd.emergencyFundTargetCalculated),
  };
}
