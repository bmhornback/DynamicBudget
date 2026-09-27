"use strict";
/**
 * calculate_retirement_savings tool implementation.
 * Returns 401(k)/IRA/HSA contribution details, catch-up eligibility,
 * tax implications, and a projected balance at retirement.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRetirementSavings = calculateRetirementSavings;
const budgetCalculations_1 = require("@/lib/budgetCalculations");
const annualProjection_1 = require("@/lib/annualProjection");
const taxCalculations_1 = require("@/lib/taxCalculations");
const adapters_1 = require("../adapters");
function calculateRetirementSavings(params) {
    const inputs = (0, adapters_1.buildBudgetInputs)({
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
        inputs.state = params.state;
    }
    const bd = (0, budgetCalculations_1.calculateBudgetBreakdown)(inputs);
    const ret = bd.retirement;
    const growthRate = params.expected_annual_return ?? 0.07;
    // Build year-by-year projection using existing engine
    const projectionPoints = (0, annualProjection_1.buildAnnualProjection)(inputs, bd, growthRate);
    // The engine projects 1, 3, 5, 10 years. For retirement we also add the
    // exact retirement year if it's not already covered.
    const yearsTarget = params.years_to_retirement;
    let projectedBalance = 0;
    if (yearsTarget <= 1) {
        projectedBalance = projectionPoints[0]?.total ?? 0;
    }
    else if (yearsTarget <= 3) {
        projectedBalance = projectionPoints[1]?.total ?? 0;
    }
    else if (yearsTarget <= 5) {
        projectedBalance = projectionPoints[2]?.total ?? 0;
    }
    else if (yearsTarget <= 10) {
        projectedBalance = projectionPoints[3]?.total ?? 0;
    }
    else {
        // Extrapolate for longer horizons using compound growth on the 10-year balance
        const base10 = projectionPoints[3]?.total ?? 0;
        const extraYears = yearsTarget - 10;
        const monthly401k = ret.monthly401k + ret.monthly401kCatchUp + ret.monthlyEmployerMatchCapped;
        const monthlyIra = ret.monthlyIRA + ret.monthlyIRACatchUp;
        const r = growthRate / 12;
        const n = extraYears * 12;
        const fvBase = base10 * Math.pow(1 + growthRate, extraYears);
        const fvNew = (monthly401k + monthlyIra) > 0
            ? (monthly401k + monthlyIra) * ((Math.pow(1 + r, n) - 1) / r)
            : 0;
        projectedBalance = fvBase + fvNew;
    }
    const catchUpEligible = params.age >= 50;
    const annual401kLimit = (0, taxCalculations_1.get401kLimit)(params.age);
    const annualIRALimit = (0, taxCalculations_1.getIRALimit)(params.age);
    // Traditional IRA deductibility check
    const filingStatus = params.filing_status ?? 'single';
    const phaseStart = filingStatus === 'married_jointly'
        ? taxCalculations_1.TRADITIONAL_IRA_PHASEOUT_MFJ_START
        : taxCalculations_1.TRADITIONAL_IRA_PHASEOUT_SINGLE_START;
    const phaseEnd = filingStatus === 'married_jointly'
        ? taxCalculations_1.TRADITIONAL_IRA_PHASEOUT_MFJ_END
        : taxCalculations_1.TRADITIONAL_IRA_PHASEOUT_SINGLE_END;
    const iraType = params.ira_type ?? 'traditional';
    const traditionalIraDeductible = iraType === 'traditional' && params.salary < phaseEnd;
    const traditionalIraPhaseOutWarning = iraType === 'traditional' &&
        params.salary >= phaseStart &&
        params.salary < phaseEnd;
    return {
        monthly_401k_employee: (0, adapters_1.round2)(ret.monthly401k + ret.monthly401kCatchUp),
        monthly_401k_employer: (0, adapters_1.round2)(ret.monthlyEmployerMatchCapped),
        monthly_ira: (0, adapters_1.round2)(ret.monthlyIRA + ret.monthlyIRACatchUp),
        monthly_hsa: (0, adapters_1.round2)(ret.monthlyHSA),
        total_monthly_retirement_savings: (0, adapters_1.round2)(ret.totalMonthlyEmployee + ret.monthlyEmployerMatchCapped),
        annual_401k_limit: annual401kLimit,
        annual_ira_limit: annualIRALimit,
        is_maxing_401k: ret.isMaxing401k,
        is_catch_up_eligible: catchUpEligible,
        catch_up_401k_extra_monthly: (0, adapters_1.round2)(ret.monthly401kCatchUp),
        ira_type: iraType,
        traditional_ira_deductible: traditionalIraDeductible,
        traditional_ira_phase_out_warning: traditionalIraPhaseOutWarning,
        hsa_eligible: (params.hsa_contribution ?? 0) > 0,
        projected_balance_at_retirement: Math.round(projectedBalance),
        projection_by_year: projectionPoints.map((p) => ({
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
