/**
 * calculate_retirement_savings tool implementation.
 * Returns 401(k)/IRA/HSA contribution details, catch-up eligibility,
 * tax implications, and a projected balance at retirement.
 */

import { calculateBudgetBreakdown } from '../../../lib/budgetCalculations';
import { buildAnnualProjection } from '../../../lib/annualProjection';
import {
  get401kLimit,
  getIRALimit,
  TRADITIONAL_IRA_PHASEOUT_SINGLE_START,
  TRADITIONAL_IRA_PHASEOUT_SINGLE_END,
  TRADITIONAL_IRA_PHASEOUT_MFJ_START,
  TRADITIONAL_IRA_PHASEOUT_MFJ_END,
} from '../../../lib/taxCalculations';
import { buildBudgetInputs, round2 } from '../adapters';
import type { StateOfResidence } from '../../../types/budget';

export interface RetirementSavingsParams {
  salary: number;
  age: number;
  years_to_retirement: number;
  filing_status?: string;
  state?: string;
  contribution_percent?: number;
  max_out_401k?: boolean;
  employer_match_percent?: number;
  ira_contribution?: number;
  ira_type?: string;
  hsa_contribution?: number;
  expected_annual_return?: number;
}

export interface RetirementProjectionYear {
  year: number;
  label: string;
  retirement_401k: number;
  ira: number;
  total: number;
}

export interface RetirementSavingsResult {
  monthly_401k_employee: number;
  monthly_401k_employer: number;
  monthly_ira: number;
  monthly_hsa: number;
  total_monthly_retirement_savings: number;
  annual_401k_limit: number;
  annual_ira_limit: number;
  is_maxing_401k: boolean;
  is_catch_up_eligible: boolean;
  catch_up_401k_extra_monthly: number;
  ira_type: string;
  traditional_ira_deductible: boolean;
  traditional_ira_phase_out_warning: boolean;
  hsa_eligible: boolean;
  projected_balance_at_retirement: number;
  projection_by_year: RetirementProjectionYear[];
  growth_rate_used: number;
  years_to_retirement: number;
}

export function calculateRetirementSavings(params: RetirementSavingsParams): RetirementSavingsResult {
  const inputs = buildBudgetInputs({
    salary: params.salary,
    state: params.state ?? 'no_state_tax',
    filing_status: params.filing_status,
    age: params.age,
    savings: {
      retirement_contribution_percent: params.contribution_percent ?? 6,
      max_out_401k: params.max_out_401k,
      employer_match_percent: params.employer_match_percent ?? 3,
      ira_contribution: params.ira_contribution ?? 0,
      ira_type: params.ira_type ?? 'traditional',
      hsa_contribution: params.hsa_contribution ?? 0,
    },
  });
  // Override state with the tool's state param (state is optional in this tool)
  if (params.state) {
    inputs.state = params.state as StateOfResidence;
  }

  const bd = calculateBudgetBreakdown(inputs);
  const ret = bd.retirement;
  const growthRate = params.expected_annual_return ?? 0.07;

  // Build year-by-year projection using existing engine
  const projectionPoints = buildAnnualProjection(inputs, bd, growthRate);

  // The engine projects 1, 3, 5, 10 years. For retirement we also add the
  // exact retirement year if it's not already covered.
  const yearsTarget = params.years_to_retirement;
  let projectedBalance = 0;

  if (yearsTarget <= 1) {
    projectedBalance = projectionPoints[0]?.total ?? 0;
  } else if (yearsTarget <= 3) {
    projectedBalance = projectionPoints[1]?.total ?? 0;
  } else if (yearsTarget <= 5) {
    projectedBalance = projectionPoints[2]?.total ?? 0;
  } else if (yearsTarget <= 10) {
    projectedBalance = projectionPoints[3]?.total ?? 0;
  } else {
    // Extrapolate for longer horizons using compound growth on the 10-year balance
    const base10 = projectionPoints[3]?.total ?? 0;
    const extraYears = yearsTarget - 10;
    const monthly401k = ret.monthly401k + ret.monthly401kCatchUp + ret.monthlyEmployerMatchCapped;
    const monthlyIra = ret.monthlyIRA + ret.monthlyIRACatchUp;
    const r = growthRate / 12;
    const n = extraYears * 12;
    const fvBase = base10 * Math.pow(1 + growthRate, extraYears);
    const monthlyContribution = monthly401k + monthlyIra;
    const fvNew = monthlyContribution > 0
      ? (growthRate === 0
        ? monthlyContribution * n
        : monthlyContribution * ((Math.pow(1 + r, n) - 1) / r))
      : 0;
    projectedBalance = fvBase + fvNew;
  }

  const catchUpEligible = params.age >= 50;
  const annual401kLimit = get401kLimit(params.age);
  const annualIRALimit = getIRALimit(params.age);

  // Traditional IRA deductibility check
  const filingStatus = params.filing_status ?? 'single';
  const phaseStart = filingStatus === 'married_jointly'
    ? TRADITIONAL_IRA_PHASEOUT_MFJ_START
    : TRADITIONAL_IRA_PHASEOUT_SINGLE_START;
  const phaseEnd = filingStatus === 'married_jointly'
    ? TRADITIONAL_IRA_PHASEOUT_MFJ_END
    : TRADITIONAL_IRA_PHASEOUT_SINGLE_END;
  const iraType = params.ira_type ?? 'traditional';
  const traditionalIraDeductible = iraType === 'traditional' && params.salary < phaseEnd;
  const traditionalIraPhaseOutWarning =
    iraType === 'traditional' &&
    params.salary >= phaseStart &&
    params.salary < phaseEnd;

  return {
    monthly_401k_employee: round2(ret.monthly401k + ret.monthly401kCatchUp),
    monthly_401k_employer: round2(ret.monthlyEmployerMatchCapped),
    monthly_ira: round2(ret.monthlyIRA + ret.monthlyIRACatchUp),
    monthly_hsa: round2(ret.monthlyHSA),
    total_monthly_retirement_savings: round2(ret.totalMonthlyEmployee + ret.monthlyEmployerMatchCapped),
    annual_401k_limit: annual401kLimit,
    annual_ira_limit: annualIRALimit,
    is_maxing_401k: ret.isMaxing401k,
    is_catch_up_eligible: catchUpEligible,
    catch_up_401k_extra_monthly: round2(ret.monthly401kCatchUp),
    ira_type: iraType,
    traditional_ira_deductible: traditionalIraDeductible,
    traditional_ira_phase_out_warning: traditionalIraPhaseOutWarning,
    hsa_eligible: (params.hsa_contribution ?? 0) > 0,
    projected_balance_at_retirement: Math.round(projectedBalance),
    projection_by_year: projectionPoints.map((p: { year: number; label: string; retirement401k: number; ira: number; total: number }) => ({
      year: p.year,
      label: p.label,
      retirement_401k: Math.round(p.retirement401k),
      ira: Math.round(p.ira),
      total: Math.round(p.total),
    })),
    growth_rate_used: growthRate,
    years_to_retirement: yearsTarget,
  };
}
