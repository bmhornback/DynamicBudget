"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDecisionSupportSummaries = generateDecisionSupportSummaries;
const longTermGoals_1 = require("./longTermGoals");
const formatters_1 = require("./formatters");
function generateDecisionSupportSummaries(inputs, breakdown, annualExpensePlan, goalProjections) {
    const summaries = [];
    const dueSoon = annualExpensePlan.filter((expense) => expense.isDueSoon);
    const underfundedDueSoon = dueSoon.filter((expense) => !expense.isFullyFunded);
    if (annualExpensePlan.length > 0) {
        summaries.push({
            id: 'annual-expense-readiness',
            title: 'Recurring bills are now visible before they hit',
            priority: underfundedDueSoon.length > 0 ? 'high' : 'medium',
            summary: `${(0, formatters_1.formatCurrency)(breakdown.totalSinkingFunds)}/month is reserved for ${annualExpensePlan.length} recurring annual expense${annualExpensePlan.length === 1 ? '' : 's'}.`,
            detail: underfundedDueSoon.length > 0
                ? `${underfundedDueSoon.length} due in the next 3 months still need ${(0, formatters_1.formatCurrency)(underfundedDueSoon.reduce((sum, expense) => sum + expense.remainingAmount, 0))}.`
                : 'No near-term annual expense gaps were detected.',
        });
    }
    if (inputs.houseDownPaymentTarget > 0 && breakdown.effectiveHouseDownPaymentContribution > 0) {
        const monthsToHousingGoal = (0, longTermGoals_1.calculateMonthsToGoal)(0, inputs.houseDownPaymentTarget, breakdown.effectiveHouseDownPaymentContribution);
        if (monthsToHousingGoal !== null) {
            summaries.push({
                id: 'housing-timing',
                title: inputs.housingMode === 'homeowner' ? 'Home equity build pace' : 'Home purchase timing',
                priority: monthsToHousingGoal > 60 ? 'medium' : 'low',
                summary: `${(0, formatters_1.formatCurrency)(breakdown.effectiveHouseDownPaymentContribution)}/month toward ${(0, formatters_1.formatCurrency)(inputs.houseDownPaymentTarget)} points to about ${monthsToHousingGoal} months.`,
                detail: `${(0, formatters_1.formatPercent)(breakdown.primaryHousingPaymentAsPercentTakeHome)} of take-home is already going to ${inputs.housingMode === 'homeowner' ? 'housing' : 'rent'}, so increasing this goal may require trimming other allocations first.`,
            });
        }
    }
    const highestDebtApr = Math.max(0, ...(inputs.debts ?? []).map((debt) => debt.interestRate ?? 0));
    if (highestDebtApr >= 8 && (inputs.taxableInvestments > 0 || inputs.generalCashSavings > 0)) {
        summaries.push({
            id: 'debt-vs-investing',
            title: 'Debt payoff may beat medium-term investing',
            priority: highestDebtApr >= 15 ? 'high' : 'medium',
            summary: `Your highest tracked debt APR is ${highestDebtApr.toFixed(1)}% while ${(0, formatters_1.formatCurrency)(inputs.taxableInvestments + inputs.generalCashSavings)}/month is going to flexible investing or cash goals.`,
            detail: 'If that debt is not strategic or low-rate, redirecting part of those dollars can produce a guaranteed return and free cash flow sooner.',
        });
    }
    if (breakdown.isDualIncome && breakdown.householdNetMonthly > 0) {
        const partnerShare = breakdown.partnerNetMonthly / breakdown.householdNetMonthly;
        summaries.push({
            id: 'dual-income-reliance',
            title: 'Household plan depends on both paychecks',
            priority: partnerShare >= 0.35 ? 'medium' : 'low',
            summary: `About ${(0, formatters_1.formatPercent)(partnerShare)} of household take-home comes from the partner income path.`,
            detail: `Use the saved-budget comparison flow to model a one-income fallback if job risk, parental leave, or relocation timing is part of the decision.`,
        });
    }
    const behindGoals = goalProjections.filter((goal) => goal.status === 'behind' || goal.status === 'past_due');
    if (behindGoals.length > 0 && breakdown.totalSinkingFunds > 0) {
        summaries.push({
            id: 'goal-vs-recurring-tradeoff',
            title: 'Recurring bills compete with longer-term goals',
            priority: 'medium',
            summary: `${behindGoals.length} long-term goal${behindGoals.length === 1 ? '' : 's'} are behind while ${(0, formatters_1.formatCurrency)(breakdown.totalSinkingFunds)}/month is reserved for recurring bills.`,
            detail: 'That tradeoff is often correct, but it helps explain why flexible goals may move slower until upcoming annual obligations are better funded.',
        });
    }
    return summaries.slice(0, 4);
}
