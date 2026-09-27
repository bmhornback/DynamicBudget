"use strict";
/**
 * analyze_state_move tool implementation.
 * Compares the financial impact of relocating from one US state to another:
 * state income tax delta, cost-of-living index change, purchasing-power
 * equivalent salary, and actionable recommendations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeStateMove = analyzeStateMove;
const budgetCalculations_1 = require("@/lib/budgetCalculations");
const coliData_1 = require("@/lib/coliData");
const adapters_1 = require("../adapters");
function buildStateProfile(salary, state, filing_status, age, retirement_contribution_percent) {
    const inputs = (0, adapters_1.buildBudgetInputs)({
        salary,
        state,
        filing_status,
        age,
        savings: { retirement_contribution_percent },
    });
    const bd = (0, budgetCalculations_1.calculateBudgetBreakdown)(inputs);
    const coliIndex = (0, coliData_1.getColiIndex)(state);
    return {
        state,
        coli_index: (0, adapters_1.round2)(coliIndex),
        coli_tier: (0, coliData_1.getColiTierLabel)(coliIndex),
        annual_state_tax: (0, adapters_1.round2)(bd.taxes.stateAnnual),
        monthly_state_tax: (0, adapters_1.round2)(bd.taxes.stateMonthly),
        net_monthly_income: (0, adapters_1.round2)(bd.netMonthlyIncome),
    };
}
function analyzeStateMove(params) {
    const current = buildStateProfile(params.salary, params.current_state, params.filing_status, params.age, params.retirement_contribution_percent);
    const target = buildStateProfile(params.salary, params.target_state, params.filing_status, params.age, params.retirement_contribution_percent);
    const annualStateTaxDelta = (0, adapters_1.round2)(target.annual_state_tax - current.annual_state_tax);
    const monthlyStateTaxDelta = (0, adapters_1.round2)(target.monthly_state_tax - current.monthly_state_tax);
    const netMonthlyIncomeDelta = (0, adapters_1.round2)(target.net_monthly_income - current.net_monthly_income);
    const fromIndex = current.coli_index;
    const toIndex = target.coli_index;
    const indexDelta = (0, adapters_1.round2)(toIndex - fromIndex);
    const percentChange = fromIndex > 0 ? (0, adapters_1.round2)(((toIndex - fromIndex) / fromIndex) * 100) : 0;
    const purchasingPower = (0, adapters_1.round2)((0, coliData_1.calculatePurchasingPower)(params.salary, params.current_state, params.target_state));
    const recommendations = [];
    if (annualStateTaxDelta < 0) {
        recommendations.push({
            severity: 'success',
            message: `Moving to ${params.target_state} saves you ~$${Math.abs(annualStateTaxDelta).toLocaleString('en-US', { maximumFractionDigits: 0 })} per year in state income taxes.`,
        });
    }
    else if (annualStateTaxDelta > 0) {
        recommendations.push({
            severity: 'warning',
            message: `Moving to ${params.target_state} increases your state income taxes by ~$${annualStateTaxDelta.toLocaleString('en-US', { maximumFractionDigits: 0 })} per year.`,
        });
    }
    else {
        recommendations.push({
            severity: 'info',
            message: `State income tax impact is minimal between ${params.current_state} and ${params.target_state}.`,
        });
    }
    if (percentChange > 10) {
        recommendations.push({
            severity: 'warning',
            message: `Cost of living is ${percentChange.toFixed(1)}% higher in ${params.target_state}. Your equivalent purchasing power salary would be $${purchasingPower.toLocaleString('en-US', { maximumFractionDigits: 0 })}.`,
        });
    }
    else if (percentChange < -10) {
        recommendations.push({
            severity: 'success',
            message: `Cost of living is ${Math.abs(percentChange).toFixed(1)}% lower in ${params.target_state}. Your $${params.salary.toLocaleString('en-US', { maximumFractionDigits: 0 })} salary goes further — equivalent to $${purchasingPower.toLocaleString('en-US', { maximumFractionDigits: 0 })} in ${params.current_state}.`,
        });
    }
    else {
        recommendations.push({
            severity: 'info',
            message: `Cost of living difference is modest (${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%) between the two states.`,
        });
    }
    const totalMonthlyDelta = netMonthlyIncomeDelta;
    const summaryDirection = totalMonthlyDelta >= 0 ? 'improves' : 'reduces';
    const summaryAmount = Math.abs(totalMonthlyDelta);
    const summary = `Moving from ${params.current_state} to ${params.target_state} on a $${params.salary.toLocaleString('en-US', { maximumFractionDigits: 0 })} salary ` +
        `${summaryDirection} your estimated monthly take-home by $${summaryAmount.toFixed(0)} ` +
        `(state tax ${annualStateTaxDelta < 0 ? 'savings' : 'increase'}: $${Math.abs(annualStateTaxDelta).toFixed(0)}/yr) ` +
        `while cost of living is ${percentChange >= 0 ? '' : ''}${percentChange.toFixed(1)}% ${percentChange >= 0 ? 'higher' : 'lower'}.`;
    return {
        current_state: current,
        target_state: target,
        tax_impact: {
            annual_state_tax_delta: annualStateTaxDelta,
            monthly_state_tax_delta: monthlyStateTaxDelta,
            net_monthly_income_delta: netMonthlyIncomeDelta,
        },
        coli_impact: {
            from_index: fromIndex,
            to_index: toIndex,
            index_delta: indexDelta,
            percent_change: percentChange,
            purchasing_power_equivalent_salary: purchasingPower,
        },
        summary,
        recommendations,
    };
}
