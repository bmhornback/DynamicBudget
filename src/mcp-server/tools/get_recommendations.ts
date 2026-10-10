/**
 * get_recommendations tool implementation.
 * Generates a prioritized list of financial recommendations based on
 * a user's budget profile: housing ratio, savings rate, emergency fund,
 * retirement contributions, debt burden, and spending balance.
 */

import { calculateBudgetBreakdown } from '../../../lib/budgetCalculations.js';
import { generateRecommendations } from '../../../lib/recommendations.js';
import { buildBudgetInputs, round2, type McpCoreBudgetParams } from '../adapters.js';

export interface RecommendationItem {
  id: string;
  severity: 'warning' | 'success' | 'info' | 'tip';
  message: string;
  detail?: string;
}

export interface GetRecommendationsResult {
  salary: number;
  state: string;
  net_monthly_income: number;
  savings_rate_gross: number;
  housing_percent_gross: number;
  recommendations: RecommendationItem[];
  recommendation_count: number;
  warning_count: number;
  success_count: number;
}

export function getRecommendations(params: McpCoreBudgetParams): GetRecommendationsResult {
  const inputs = buildBudgetInputs(params);
  const bd = calculateBudgetBreakdown(inputs);
  const recs = generateRecommendations(inputs, bd);

  const mappedRecs: RecommendationItem[] = recs.map((r: { id: string; severity: string; message: string; detail?: string }) => ({
    id: r.id,
    severity: r.severity as RecommendationItem['severity'],
    message: r.message,
    detail: r.detail,
  }));

  const warningCount = mappedRecs.filter((r) => r.severity === 'warning').length;
  const successCount = mappedRecs.filter((r) => r.severity === 'success').length;

  return {
    salary: params.salary,
    state: params.state,
    net_monthly_income: round2(bd.netMonthlyIncome),
    savings_rate_gross: round2(bd.retirement.retirementSavingsRate),
    housing_percent_gross: round2(bd.primaryHousingPaymentAsPercentGross),
    recommendations: mappedRecs,
    recommendation_count: mappedRecs.length,
    warning_count: warningCount,
    success_count: successCount,
  };
}
