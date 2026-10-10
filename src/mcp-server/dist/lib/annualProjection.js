"use strict";
/**
 * Annual savings projection calculations for DynamicBudget.
 * Projects savings balances over 1, 3, 5, and 10 years using
 * fixed monthly contributions and a configurable annual growth rate.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_GROWTH_RATE = void 0;
exports.buildAnnualProjection = buildAnnualProjection;
exports.DEFAULT_GROWTH_RATE = 0.07; // 7% annual
/**
 * Compound future value of monthly contributions.
 * FV = C * [((1 + r)^n - 1) / r]
 * where r = monthly rate, n = number of months.
 */
function futureValueMonthlyContributions(monthlyContribution, annualRate, years) {
    if (monthlyContribution <= 0)
        return 0;
    if (annualRate === 0)
        return monthlyContribution * years * 12;
    const r = annualRate / 12;
    const n = years * 12;
    return monthlyContribution * ((Math.pow(1 + r, n) - 1) / r);
}
/**
 * Build projection data points for 1, 3, 5, and 10 years.
 */
function buildAnnualProjection(inputs, breakdown, annualGrowthRate = exports.DEFAULT_GROWTH_RATE) {
    const { retirement, effectiveEmergencyFundContribution, effectiveHouseDownPaymentContribution } = breakdown;
    // Monthly contributions
    const monthly401k = retirement.monthly401k +
        retirement.monthly401kCatchUp +
        retirement.monthlyEmployerMatchCapped;
    const monthlyIRA = retirement.monthlyIRA + retirement.monthlyIRACatchUp;
    const monthlyTaxable = inputs.taxableInvestments;
    const monthlyHouse = effectiveHouseDownPaymentContribution;
    const monthlyEmergency = effectiveEmergencyFundContribution;
    const years = [1, 3, 5, 10];
    return years.map((year) => {
        const ret401k = futureValueMonthlyContributions(monthly401k, annualGrowthRate, year);
        const retIRA = futureValueMonthlyContributions(monthlyIRA, annualGrowthRate, year);
        const retTaxable = futureValueMonthlyContributions(monthlyTaxable, annualGrowthRate, year);
        // House fund and emergency fund earn a conservative savings-account rate (2%)
        const retHouse = futureValueMonthlyContributions(monthlyHouse, 0.02, year);
        const retEmergency = futureValueMonthlyContributions(monthlyEmergency, 0.02, year);
        return {
            label: `Year ${year}`,
            year,
            retirement401k: Math.round(ret401k),
            ira: Math.round(retIRA),
            taxableInvestments: Math.round(retTaxable),
            houseFund: Math.round(retHouse),
            emergencyFund: Math.round(retEmergency),
            total: Math.round(ret401k) + Math.round(retIRA) + Math.round(retTaxable) + Math.round(retHouse) + Math.round(retEmergency),
        };
    });
}
