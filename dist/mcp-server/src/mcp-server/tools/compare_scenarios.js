"use strict";
/**
 * compare_scenarios tool implementation.
 * Compares 2–4 named budget scenarios side by side, with a diff against
 * the first (baseline) scenario. Includes health score, taxes, expense
 * totals, savings rates, and surplus/deficit for each.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareScenarios = compareScenarios;
const budgetCalculations_1 = require("@/lib/budgetCalculations");
const budgetHealthScore_1 = require("@/lib/budgetHealthScore");
const adapters_1 = require("../adapters");
function buildSnapshot(scenario) {
    const inputs = (0, adapters_1.buildBudgetInputs)(scenario);
    const bd = (0, budgetCalculations_1.calculateBudgetBreakdown)(inputs);
    const health = (0, budgetHealthScore_1.calculateBudgetHealthScore)(bd);
    const federalMonthly = (0, adapters_1.round2)(bd.taxes.federalMonthly);
    const stateMonthly = (0, adapters_1.round2)(bd.taxes.stateMonthly);
    const ficaMonthly = (0, adapters_1.round2)(bd.taxes.payrollMonthly);
    const grossMonthly = (0, adapters_1.round2)(bd.taxes.grossMonthly);
    const netMonthly = (0, adapters_1.round2)(bd.netMonthlyIncome);
    const effectiveTotalRate = grossMonthly > 0
        ? (0, adapters_1.round2)((federalMonthly + stateMonthly + ficaMonthly) / grossMonthly)
        : 0;
    const savingsTotal = (0, adapters_1.round2)(bd.retirement.monthly401k +
        bd.retirement.monthly401kCatchUp +
        bd.retirement.monthlyIRA +
        bd.retirement.monthlyIRACatchUp +
        bd.retirement.monthlyHSA +
        bd.effectiveEmergencyFundContribution);
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
            housing: (0, adapters_1.round2)(bd.totalHousing),
            utilities: (0, adapters_1.round2)(bd.totalUtilities),
            transportation: (0, adapters_1.round2)(bd.totalTransportation),
            groceries_food: (0, adapters_1.round2)(bd.totalGroceriesFood),
            health: (0, adapters_1.round2)(bd.totalHealth),
            lifestyle: (0, adapters_1.round2)(bd.totalLifestyle),
            savings: savingsTotal,
            debt_payoff: (0, adapters_1.round2)(bd.totalDebtPayoff ?? 0),
        },
        total_allocated: (0, adapters_1.round2)(bd.totalAllocated),
        remaining_monthly_buffer: (0, adapters_1.round2)(bd.remainingMonthlyBuffer),
        is_over_budget: bd.isOverBudget,
        surplus: (0, adapters_1.round2)(bd.surplus),
        deficit: (0, adapters_1.round2)(bd.deficit),
        savings_rate_gross: (0, adapters_1.round2)(bd.retirement.retirementSavingsRate),
        health_score: health.score,
        health_label: health.label,
        taxes_annual_state: (0, adapters_1.round2)(bd.taxes.stateAnnual),
    };
}
function compareScenarios(params) {
    const [baselineScenario, ...restScenarios] = params.scenarios;
    const baseline = buildSnapshot(baselineScenario);
    const comparisons = restScenarios.map(buildSnapshot);
    const diffs = comparisons.map((snap) => ({
        name: snap.name,
        vs_baseline: {
            net_monthly_income_delta: (0, adapters_1.round2)(snap.net_monthly_income - baseline.net_monthly_income),
            total_allocated_delta: (0, adapters_1.round2)(snap.total_allocated - baseline.total_allocated),
            remaining_buffer_delta: (0, adapters_1.round2)(snap.remaining_monthly_buffer - baseline.remaining_monthly_buffer),
            savings_rate_delta: (0, adapters_1.round2)(snap.savings_rate_gross - baseline.savings_rate_gross),
            health_score_delta: (0, adapters_1.round2)(snap.health_score - baseline.health_score),
            annual_state_tax_delta: (0, adapters_1.round2)(snap.taxes_annual_state - baseline.taxes_annual_state),
        },
    }));
    // Determine winner by highest health score
    const all = [baseline, ...comparisons];
    const winnerSnap = all.reduce((best, s) => (s.health_score > best.health_score ? s : best), all[0]);
    const winnerReason = winnerSnap.is_over_budget
        ? `${winnerSnap.name} has the best health score (${winnerSnap.health_score}) among the scenarios, though it is still over budget.`
        : `${winnerSnap.name} has the highest budget health score (${winnerSnap.health_score}: ${winnerSnap.health_label}) with a $${winnerSnap.remaining_monthly_buffer.toFixed(0)}/mo buffer.`;
    const { taxes_annual_state: _b, ...baselineClean } = baseline;
    const comparisonsClean = comparisons.map(({ taxes_annual_state: _c, ...rest }) => rest);
    return {
        baseline: baselineClean,
        comparisons: comparisonsClean,
        diffs,
        winner: winnerSnap.name,
        winner_reason: winnerReason,
    };
}
