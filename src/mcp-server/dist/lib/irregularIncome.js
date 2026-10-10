"use strict";
/**
 * Irregular income support for DynamicBudget.
 *
 * Models income variability using a simple symmetric range:
 *   P25 = base gross × (1 – variabilityPct / 100)   ← a bad month
 *   P50 = base gross × 1.0                            ← a typical month
 *   P75 = base gross × (1 + variabilityPct / 100)   ← a good month
 *
 * Each scenario is a full calculateBudgetBreakdown result so that taxes,
 * retirement, and net income are all re-computed at the scenario salary.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateIrregularIncomeAnalysis = calculateIrregularIncomeAnalysis;
const budgetCalculations_1 = require("./budgetCalculations");
/**
 * Build a scaled copy of BudgetInputs with a different annual salary.
 * Bonus income is scaled proportionally to the salary ratio so that the
 * bonus-to-salary relationship is preserved across scenarios.
 *
 * Note: variability is applied to `annualSalary` only, not to total gross
 * (salary + bonus). This is intentional — variability represents fluctuation
 * in the base salary (e.g. hourly/commission variance), while the bonus is
 * treated as a dependent fraction of that salary.
 */
function scaleInputsToSalary(inputs, newAnnualSalary) {
    const salaryRatio = inputs.annualSalary > 0 ? newAnnualSalary / inputs.annualSalary : 1;
    return {
        ...inputs,
        annualSalary: newAnnualSalary,
        bonusIncome: Math.round(inputs.bonusIncome * salaryRatio),
    };
}
/**
 * Calculate P25 / P50 / P75 income scenarios and identify at-risk expenses.
 *
 * @param inputs          The current BudgetInputs (must have incomeVariabilityPercent set).
 * @param baseBreakdown   Pre-computed breakdown for the current inputs (P50); avoids a
 *                        redundant recalculation when the caller already has it.
 */
function calculateIrregularIncomeAnalysis(inputs, baseBreakdown) {
    const variabilityPercent = Math.max(0, Math.min(100, inputs.incomeVariabilityPercent ?? 0));
    const baseGrossAnnual = inputs.annualSalary;
    const baseGrossMonthly = baseBreakdown.grossMonthly;
    const p25Annual = baseGrossAnnual * (1 - variabilityPercent / 100);
    const p75Annual = baseGrossAnnual * (1 + variabilityPercent / 100);
    const p25Inputs = scaleInputsToSalary(inputs, p25Annual);
    const p75Inputs = scaleInputsToSalary(inputs, p75Annual);
    const p25Breakdown = (0, budgetCalculations_1.calculateBudgetBreakdown)(p25Inputs);
    const p75Breakdown = (0, budgetCalculations_1.calculateBudgetBreakdown)(p75Inputs);
    const scenarios = [
        {
            label: 'P25',
            percentile: 25,
            grossAnnual: p25Inputs.annualSalary + p25Inputs.bonusIncome,
            grossMonthly: p25Breakdown.grossMonthly,
            breakdown: p25Breakdown,
        },
        {
            label: 'P50',
            percentile: 50,
            grossAnnual: inputs.annualSalary + inputs.bonusIncome,
            grossMonthly: baseGrossMonthly,
            breakdown: baseBreakdown,
        },
        {
            label: 'P75',
            percentile: 75,
            grossAnnual: p75Inputs.annualSalary + p75Inputs.bonusIncome,
            grossMonthly: p75Breakdown.grossMonthly,
            breakdown: p75Breakdown,
        },
    ];
    const p25Deficit = Math.max(0, -p25Breakdown.remainingMonthlyBuffer);
    const isP25OverBudget = p25Deficit > 0;
    // Identify variable (cuttable) expenses, sorted descending by amount.
    // Only show when P25 is over budget — these are the spending levers.
    const atRiskExpenses = isP25OverBudget
        ? buildAtRiskExpenses(inputs)
        : [];
    return {
        variabilityPercent,
        baseGrossMonthly,
        scenarios,
        atRiskExpenses,
        isP25OverBudget,
        p25Deficit,
    };
}
function buildAtRiskExpenses(inputs) {
    const candidates = [
        // Variable / discretionary (non-essential)
        { label: 'Dining Out', monthlyAmount: inputs.diningOut, isEssential: false },
        { label: 'Entertainment', monthlyAmount: inputs.funEntertainment, isEssential: false },
        { label: 'Travel', monthlyAmount: inputs.travel, isEssential: false },
        { label: 'Clothes', monthlyAmount: inputs.clothes, isEssential: false },
        { label: 'Personal Spending', monthlyAmount: inputs.personalSpending, isEssential: false },
        { label: 'Gifts', monthlyAmount: inputs.gifts, isEssential: false },
        { label: 'Subscriptions', monthlyAmount: inputs.subscriptions, isEssential: false },
        { label: 'Misc Buffer', monthlyAmount: inputs.miscBuffer, isEssential: false },
        // Semi-essential
        { label: 'Groceries', monthlyAmount: inputs.groceries, isEssential: true },
        { label: 'Gym / Fitness', monthlyAmount: inputs.gymFitness, isEssential: false },
        { label: 'Therapy / Wellness', monthlyAmount: inputs.therapyWellness, isEssential: false },
        // Savings contributions (can be paused in an emergency)
        {
            label: 'House Down Payment Contribution',
            monthlyAmount: inputs.houseDownPaymentContribution,
            isEssential: false,
        },
        {
            label: 'General Cash Savings',
            monthlyAmount: inputs.generalCashSavings,
            isEssential: false,
        },
        {
            label: 'Taxable Investments',
            monthlyAmount: inputs.taxableInvestments,
            isEssential: false,
        },
    ];
    // Include pet-related discretionary costs when pets are enabled
    if (inputs.petsEnabled) {
        candidates.push({ label: 'Pet Grooming / Supplies', monthlyAmount: inputs.groomingSupplies, isEssential: false }, { label: 'Dog Daycare / Boarding', monthlyAmount: inputs.dogDaycare + inputs.boardingSitter, isEssential: false });
    }
    // Filter out zero amounts and sort descending
    return candidates
        .filter((e) => e.monthlyAmount > 0)
        .sort((a, b) => b.monthlyAmount - a.monthlyAmount);
}
