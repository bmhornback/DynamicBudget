"use strict";
/**
 * calculate_monthly_budget tool implementation.
 * Returns a complete monthly budget breakdown for the given salary, state,
 * expenses, and savings configuration.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateMonthlyBudget = calculateMonthlyBudget;
const budgetCalculations_1 = require("../../../lib/budgetCalculations");
const adapters_1 = require("../adapters");
function calculateMonthlyBudget(params) {
    const inputs = (0, adapters_1.buildBudgetInputs)(params);
    const bd = (0, budgetCalculations_1.calculateBudgetBreakdown)(inputs);
    const federalMonthly = (0, adapters_1.round2)(bd.taxes.federalMonthly);
    const stateMonthly = (0, adapters_1.round2)(bd.taxes.stateMonthly);
    const ficaMonthly = (0, adapters_1.round2)(bd.taxes.payrollMonthly);
    const grossMonthly = (0, adapters_1.round2)(bd.taxes.grossMonthly);
    const netMonthly = (0, adapters_1.round2)(bd.netMonthlyIncome);
    const totalTaxMonthly = federalMonthly + stateMonthly + ficaMonthly;
    const effectiveFederalRate = (0, adapters_1.round2)(bd.taxes.federalAnnual / bd.taxes.grossAnnual);
    const effectiveTotalRate = grossMonthly > 0 ? (0, adapters_1.round2)(totalTaxMonthly / grossMonthly) : 0;
    const savingsTotal = (0, adapters_1.round2)(bd.retirement.monthly401k +
        bd.retirement.monthly401kCatchUp +
        bd.retirement.monthlyIRA +
        bd.retirement.monthlyIRACatchUp +
        bd.retirement.monthlyHSA +
        bd.effectiveEmergencyFundContribution);
    const investmentsTotal = (0, adapters_1.round2)(bd.totalInvestments);
    const debtPayoffTotal = (0, adapters_1.round2)(bd.totalDebtPayoff ?? 0);
    const totalAllocated = (0, adapters_1.round2)(bd.totalAllocated);
    const buffer = (0, adapters_1.round2)(bd.remainingMonthlyBuffer);
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
            housing: (0, adapters_1.round2)(bd.totalHousing),
            utilities: (0, adapters_1.round2)(bd.totalUtilities),
            transportation: (0, adapters_1.round2)(bd.totalTransportation),
            groceries_food: (0, adapters_1.round2)(bd.totalGroceriesFood),
            health: (0, adapters_1.round2)(bd.totalHealth),
            lifestyle: (0, adapters_1.round2)(bd.totalLifestyle),
            savings: savingsTotal,
            investments: investmentsTotal,
            debt_payoff: debtPayoffTotal,
        },
        total_allocated: totalAllocated,
        remaining_monthly_buffer: buffer,
        is_over_budget: bd.isOverBudget,
        surplus: (0, adapters_1.round2)(bd.surplus),
        deficit: (0, adapters_1.round2)(bd.deficit),
        savings_rate_gross: (0, adapters_1.round2)(bd.retirement.retirementSavingsRate),
        savings_rate_net: netMonthly > 0 ? (0, adapters_1.round2)(savingsTotal / netMonthly) : 0,
        housing_percent_gross: (0, adapters_1.round2)(bd.primaryHousingPaymentAsPercentGross),
        emergency_fund_target: (0, adapters_1.round2)(bd.emergencyFundTargetCalculated),
    };
}
