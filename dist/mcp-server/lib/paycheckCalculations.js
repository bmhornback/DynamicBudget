"use strict";
/**
 * Paycheck calculator utilities for DynamicBudget.
 *
 * Converts monthly budget amounts to per-paycheck allocations based on
 * the user's selected pay frequency.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAY_FREQUENCY_SHORT_LABELS = exports.PAY_FREQUENCY_LABELS = exports.PAYCHECKS_PER_YEAR = void 0;
exports.monthlyToPaycheckMultiplier = monthlyToPaycheckMultiplier;
exports.toPerPaycheck = toPerPaycheck;
exports.calculatePaycheckBreakdown = calculatePaycheckBreakdown;
/** Number of paychecks per year for each frequency. */
exports.PAYCHECKS_PER_YEAR = {
    weekly: 52,
    biweekly: 26,
    semimonthly: 24,
    monthly: 12,
};
/** Human-readable label for each pay frequency. */
exports.PAY_FREQUENCY_LABELS = {
    weekly: 'Weekly (52×/yr)',
    biweekly: 'Bi-weekly (26×/yr)',
    semimonthly: 'Semi-monthly (24×/yr)',
    monthly: 'Monthly (12×/yr)',
};
/** Short label used in the dashboard card header. */
exports.PAY_FREQUENCY_SHORT_LABELS = {
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    semimonthly: 'Semi-monthly',
    monthly: 'Monthly',
};
/**
 * Returns the multiplier to convert a monthly amount to a per-paycheck amount.
 * monthly × multiplier = per-paycheck
 */
function monthlyToPaycheckMultiplier(frequency) {
    return 12 / exports.PAYCHECKS_PER_YEAR[frequency];
}
/** Convert a monthly dollar amount to a per-paycheck amount. */
function toPerPaycheck(monthlyAmount, frequency) {
    return monthlyAmount * monthlyToPaycheckMultiplier(frequency);
}
/**
 * Build a full per-paycheck breakdown from budget inputs and calculated breakdown.
 */
function calculatePaycheckBreakdown(inputs, breakdown) {
    const frequency = inputs.payFrequency;
    const multiplier = monthlyToPaycheckMultiplier(frequency);
    const paychecksPerYear = exports.PAYCHECKS_PER_YEAR[frequency];
    const grossMonthly = breakdown.grossMonthly;
    const grossPerPaycheck = grossMonthly * multiplier;
    // Pre-tax deductions
    const preTaxDeductions = [];
    const monthly401k = breakdown.retirement.monthly401k;
    const isTraditional401k = !inputs.is401kRoth;
    if (monthly401k > 0 && isTraditional401k) {
        preTaxDeductions.push({
            label: '401(k) Traditional',
            perPaycheck: toPerPaycheck(monthly401k, frequency),
            monthly: monthly401k,
        });
    }
    const monthlyHsa = breakdown.retirement.monthlyHSA;
    if (monthlyHsa > 0) {
        preTaxDeductions.push({
            label: 'HSA',
            perPaycheck: toPerPaycheck(monthlyHsa, frequency),
            monthly: monthlyHsa,
        });
    }
    // Taxes (shown per paycheck as withheld amounts)
    const taxes = [];
    const monthlyFederal = breakdown.taxes.federalMonthly;
    if (monthlyFederal > 0) {
        taxes.push({
            label: 'Federal Income Tax',
            perPaycheck: toPerPaycheck(monthlyFederal, frequency),
            monthly: monthlyFederal,
        });
    }
    const monthlyState = breakdown.taxes.stateMonthly;
    if (monthlyState > 0) {
        taxes.push({
            label: 'State Income Tax',
            perPaycheck: toPerPaycheck(monthlyState, frequency),
            monthly: monthlyState,
        });
    }
    const monthlyFica = breakdown.taxes.payrollMonthly;
    if (monthlyFica > 0) {
        taxes.push({
            label: 'FICA (Social Security + Medicare)',
            perPaycheck: toPerPaycheck(monthlyFica, frequency),
            monthly: monthlyFica,
        });
    }
    // IRA contributions (Traditional = pre-tax, Roth = after-tax)
    const monthlyIRA = breakdown.retirement.monthlyIRA + breakdown.retirement.monthlyIRACatchUp;
    const iraType = breakdown.retirement.iraType;
    if (monthlyIRA > 0 && iraType === 'traditional') {
        preTaxDeductions.push({
            label: 'IRA (Traditional)',
            perPaycheck: toPerPaycheck(monthlyIRA, frequency),
            monthly: monthlyIRA,
        });
    }
    // After-tax retirement (Roth 401k, Roth IRA)
    const afterTaxRetirement = [];
    if (monthly401k > 0 && !isTraditional401k) {
        afterTaxRetirement.push({
            label: '401(k) Roth',
            perPaycheck: toPerPaycheck(monthly401k, frequency),
            monthly: monthly401k,
        });
    }
    if (monthlyIRA > 0 && iraType === 'roth') {
        afterTaxRetirement.push({
            label: 'IRA (Roth)',
            perPaycheck: toPerPaycheck(monthlyIRA, frequency),
            monthly: monthlyIRA,
        });
    }
    // Employer match (informational)
    const monthlyEmployerMatch = breakdown.retirement.monthlyEmployerMatch;
    const employerMatch = monthlyEmployerMatch > 0
        ? {
            label: 'Employer Match',
            perPaycheck: toPerPaycheck(monthlyEmployerMatch, frequency),
            monthly: monthlyEmployerMatch,
        }
        : null;
    // breakdown.netMonthlyIncome is already net of all taxes, Traditional 401k pre-tax deductions,
    // Roth 401k after-tax deductions, HSA, and IRA (see taxCalculations.ts calculateNetMonthlyIncome).
    // No further deductions are needed here.
    const netPerPaycheck = breakdown.netMonthlyIncome * multiplier;
    // Budget allocations grouped by category
    const allocations = [
        { label: 'Housing', perPaycheck: toPerPaycheck(breakdown.totalHousing, frequency), monthly: breakdown.totalHousing },
        { label: 'Utilities', perPaycheck: toPerPaycheck(breakdown.totalUtilities, frequency), monthly: breakdown.totalUtilities },
        { label: 'Transportation', perPaycheck: toPerPaycheck(breakdown.totalTransportation, frequency), monthly: breakdown.totalTransportation },
        { label: 'Groceries & Food', perPaycheck: toPerPaycheck(breakdown.totalGroceriesFood, frequency), monthly: breakdown.totalGroceriesFood },
        { label: 'Health, Medical & Insurance', perPaycheck: toPerPaycheck(breakdown.totalHealth, frequency), monthly: breakdown.totalHealth },
        ...(breakdown.totalPets > 0
            ? [{ label: 'Pets', perPaycheck: toPerPaycheck(breakdown.totalPets, frequency), monthly: breakdown.totalPets }]
            : []),
        { label: 'Lifestyle', perPaycheck: toPerPaycheck(breakdown.totalLifestyle, frequency), monthly: breakdown.totalLifestyle },
        { label: 'Savings & Investments', perPaycheck: toPerPaycheck(breakdown.totalSavings + breakdown.totalInvestments, frequency), monthly: breakdown.totalSavings + breakdown.totalInvestments },
        ...(breakdown.totalDebtPayoff > 0
            ? [{ label: 'Debt Payoff', perPaycheck: toPerPaycheck(breakdown.totalDebtPayoff, frequency), monthly: breakdown.totalDebtPayoff }]
            : []),
    ].filter((item) => item.monthly > 0);
    const bufferPerPaycheck = breakdown.remainingMonthlyBuffer * multiplier;
    return {
        frequency,
        paychecksPerYear,
        grossPerPaycheck,
        preTaxDeductions,
        taxes,
        afterTaxRetirement,
        employerMatch,
        netPerPaycheck,
        allocations,
        bufferPerPaycheck,
    };
}
