"use strict";
/**
 * get_recommendations tool implementation.
 * Generates a prioritized list of financial recommendations based on
 * a user's budget profile: housing ratio, savings rate, emergency fund,
 * retirement contributions, debt burden, and spending balance.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendations = getRecommendations;
const budgetCalculations_1 = require("../../../lib/budgetCalculations");
const recommendations_1 = require("../../../lib/recommendations");
const adapters_1 = require("../adapters");
function getRecommendations(params) {
    const inputs = (0, adapters_1.buildBudgetInputs)(params);
    const bd = (0, budgetCalculations_1.calculateBudgetBreakdown)(inputs);
    const recs = (0, recommendations_1.generateRecommendations)(inputs, bd);
    const mappedRecs = recs.map((r) => ({
        id: r.id,
        severity: r.severity,
        message: r.message,
        detail: r.detail,
    }));
    const warningCount = mappedRecs.filter((r) => r.severity === 'warning').length;
    const successCount = mappedRecs.filter((r) => r.severity === 'success').length;
    return {
        salary: params.salary,
        state: params.state,
        net_monthly_income: (0, adapters_1.round2)(bd.netMonthlyIncome),
        savings_rate_gross: (0, adapters_1.round2)(bd.retirement.retirementSavingsRate),
        housing_percent_gross: (0, adapters_1.round2)(bd.primaryHousingPaymentAsPercentGross),
        recommendations: mappedRecs,
        recommendation_count: mappedRecs.length,
        warning_count: warningCount,
        success_count: successCount,
    };
}
