/**
 * Integration tests for the DynamicBudget MCP server tools.
 * These tests call the tool handler functions directly (no network/stdio).
 */

import { calculateMonthlyBudget } from '../tools/calculate_monthly_budget';
import { analyzeStateMove } from '../tools/analyze_state_move';
import { calculateRetirementSavings } from '../tools/calculate_retirement_savings';
import { getRecommendations } from '../tools/get_recommendations';
import { compareScenarios } from '../tools/compare_scenarios';

// ─── calculate_monthly_budget ────────────────────────────────────────────────

describe('calculate_monthly_budget', () => {
  it('returns a complete breakdown for a basic salary + state', () => {
    const result = calculateMonthlyBudget({ salary: 120_000, state: 'TX' });
    expect(result.gross_monthly).toBeCloseTo(10_000, 0);
    expect(result.net_monthly_income).toBeGreaterThan(0);
    expect(result.net_monthly_income).toBeLessThan(result.gross_monthly);
    expect(result.taxes.federal_monthly).toBeGreaterThan(0);
    expect(result.taxes.state_monthly).toBeCloseTo(0, 0); // TX has no state income tax
    expect(result.taxes.fica_monthly).toBeGreaterThan(0);
    expect(result.taxes.effective_federal_rate).toBeGreaterThan(0);
    expect(result.taxes.effective_total_rate).toBeGreaterThan(0);
    expect(typeof result.is_over_budget).toBe('boolean');
    expect(result.emergency_fund_target).toBeGreaterThanOrEqual(0);
  });

  it('returns higher net income in a no-state-tax state vs a high-tax state', () => {
    const tx = calculateMonthlyBudget({ salary: 150_000, state: 'TX' });
    const ca = calculateMonthlyBudget({ salary: 150_000, state: 'CA' });
    expect(tx.net_monthly_income).toBeGreaterThan(ca.net_monthly_income);
    expect(tx.taxes.state_monthly).toBeCloseTo(0, 0);
    expect(ca.taxes.state_monthly).toBeGreaterThan(0);
  });

  it('applies expenses correctly', () => {
    const result = calculateMonthlyBudget({
      salary: 100_000,
      state: 'TX',
      expenses: { rent: 2_000, groceries: 500, electric: 100 },
    });
    expect(result.expense_totals.housing).toBeCloseTo(2_000, 0);
    expect(result.expense_totals.groceries_food).toBeCloseTo(500, 0);
    expect(result.expense_totals.utilities).toBeCloseTo(100, 0);
  });

  it('reflects savings configuration in the output', () => {
    const noSavings = calculateMonthlyBudget({ salary: 100_000, state: 'TX' });
    const withSavings = calculateMonthlyBudget({
      salary: 100_000,
      state: 'TX',
      savings: {
        retirement_contribution_percent: 15,
        monthly_taxable_investments: 500,
        monthly_house_fund_contribution: 300,
      },
    });
    expect(withSavings.expense_totals.savings + withSavings.expense_totals.investments)
      .toBeGreaterThan(noSavings.expense_totals.savings + noSavings.expense_totals.investments);
  });

  it('reports is_over_budget when expenses exceed net income', () => {
    const result = calculateMonthlyBudget({
      salary: 50_000,
      state: 'CA',
      expenses: { rent: 5_000, groceries: 2_000, dining_out: 2_000, clothes: 1_000 },
    });
    expect(result.is_over_budget).toBe(true);
    expect(result.deficit).toBeGreaterThan(0);
  });

  it('reports surplus when expenses are low', () => {
    const result = calculateMonthlyBudget({
      salary: 200_000,
      state: 'TX',
      expenses: { rent: 500 },
    });
    expect(result.is_over_budget).toBe(false);
    expect(result.surplus).toBeGreaterThan(0);
  });

  it('housing_percent_gross reflects rent as a fraction of gross', () => {
    const result = calculateMonthlyBudget({
      salary: 120_000,
      state: 'TX',
      expenses: { rent: 3_000 },
    });
    // rent is $3k, gross monthly is $10k → 30%
    expect(result.housing_percent_gross).toBeCloseTo(0.3, 1);
  });

  it('returns numeric savings_rate_gross', () => {
    const result = calculateMonthlyBudget({
      salary: 100_000,
      state: 'TX',
      savings: { retirement_contribution_percent: 10 },
    });
    expect(result.savings_rate_gross).toBeGreaterThan(0);
    expect(result.savings_rate_gross).toBeLessThanOrEqual(1);
  });
});

// ─── analyze_state_move ───────────────────────────────────────────────────────

describe('analyze_state_move', () => {
  it('returns state profiles for both states', () => {
    const result = analyzeStateMove({ current_state: 'CA', target_state: 'TX', salary: 150_000 });
    expect(result.current_state.state).toBe('CA');
    expect(result.target_state.state).toBe('TX');
    expect(result.current_state.coli_index).toBeGreaterThan(0);
    expect(result.target_state.coli_index).toBeGreaterThan(0);
  });

  it('shows CA has higher state tax than TX', () => {
    const result = analyzeStateMove({ current_state: 'CA', target_state: 'TX', salary: 150_000 });
    expect(result.current_state.annual_state_tax).toBeGreaterThan(0);
    expect(result.target_state.annual_state_tax).toBeCloseTo(0, 0);
    expect(result.tax_impact.annual_state_tax_delta).toBeLessThan(0); // saving money moving to TX
  });

  it('calculates COLI impact correctly for CA→TX', () => {
    const result = analyzeStateMove({ current_state: 'CA', target_state: 'TX', salary: 150_000 });
    expect(result.coli_impact.from_index).toBeGreaterThan(result.coli_impact.to_index);
    expect(result.coli_impact.percent_change).toBeLessThan(0); // cheaper in TX
    expect(result.coli_impact.purchasing_power_equivalent_salary).toBeGreaterThan(0);
  });

  it('references the target state in the lower-cost recommendation text', () => {
    const result = analyzeStateMove({ current_state: 'CA', target_state: 'TX', salary: 150_000 });
    const message = result.recommendations.find(
      (r) => r.severity === 'success' && r.message.includes('Cost of living')
    )?.message ?? '';
    expect(message).toContain('TX');
    expect(message).not.toContain('CA');
  });

  it('includes a summary string', () => {
    const result = analyzeStateMove({ current_state: 'NY', target_state: 'FL', salary: 100_000 });
    expect(typeof result.summary).toBe('string');
    expect(result.summary.length).toBeGreaterThan(20);
  });

  it('returns recommendations array', () => {
    const result = analyzeStateMove({ current_state: 'CA', target_state: 'TX', salary: 150_000 });
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
    result.recommendations.forEach((r) => {
      expect(['warning', 'info', 'success']).toContain(r.severity);
      expect(typeof r.message).toBe('string');
    });
  });

  it('handles same-state comparison gracefully', () => {
    const result = analyzeStateMove({ current_state: 'TX', target_state: 'TX', salary: 100_000 });
    expect(result.tax_impact.annual_state_tax_delta).toBeCloseTo(0, 1);
    expect(result.coli_impact.percent_change).toBeCloseTo(0, 1);
  });
});

// ─── calculate_retirement_savings ─────────────────────────────────────────────

describe('calculate_retirement_savings', () => {
  it('returns contribution details for a basic case', () => {
    const result = calculateRetirementSavings({ salary: 100_000, age: 35, years_to_retirement: 30 });
    expect(result.monthly_401k_employee).toBeGreaterThan(0);
    expect(result.monthly_401k_employer).toBeGreaterThan(0);
    expect(result.annual_401k_limit).toBeGreaterThan(0);
    expect(result.annual_ira_limit).toBeGreaterThan(0);
    expect(result.is_catch_up_eligible).toBe(false);
    expect(result.projected_balance_at_retirement).toBeGreaterThan(0);
  });

  it('enables catch-up contributions for age 50+', () => {
    const young = calculateRetirementSavings({ salary: 100_000, age: 40, years_to_retirement: 20 });
    const senior = calculateRetirementSavings({ salary: 100_000, age: 52, years_to_retirement: 13 });
    expect(young.is_catch_up_eligible).toBe(false);
    expect(young.catch_up_401k_extra_monthly).toBeCloseTo(0, 0);
    expect(senior.is_catch_up_eligible).toBe(true);
  });

  it('projects higher balance for more years', () => {
    const short = calculateRetirementSavings({ salary: 100_000, age: 45, years_to_retirement: 10 });
    const long = calculateRetirementSavings({ salary: 100_000, age: 35, years_to_retirement: 30 });
    expect(long.projected_balance_at_retirement).toBeGreaterThan(short.projected_balance_at_retirement);
  });

  it('projects higher balance when maxing out 401k', () => {
    const normal = calculateRetirementSavings({
      salary: 100_000, age: 35, years_to_retirement: 30,
      contribution_percent: 6,
    });
    const maxed = calculateRetirementSavings({
      salary: 100_000, age: 35, years_to_retirement: 30,
      max_out_401k: true,
    });
    expect(maxed.monthly_401k_employee).toBeGreaterThan(normal.monthly_401k_employee);
    expect(maxed.is_maxing_401k).toBe(true);
  });

  it('returns projection_by_year data points', () => {
    const result = calculateRetirementSavings({ salary: 100_000, age: 35, years_to_retirement: 30 });
    expect(Array.isArray(result.projection_by_year)).toBe(true);
    expect(result.projection_by_year.length).toBeGreaterThan(0);
    result.projection_by_year.forEach((pt) => {
      expect(typeof pt.year).toBe('number');
      expect(typeof pt.total).toBe('number');
    });
  });

  it('handles a zero expected return without producing NaN', () => {
    const result = calculateRetirementSavings({
      salary: 100_000,
      age: 35,
      years_to_retirement: 30,
      expected_annual_return: 0,
    });
    expect(Number.isFinite(result.projected_balance_at_retirement)).toBe(true);
    expect(result.projected_balance_at_retirement).toBeGreaterThan(0);
    expect(result.growth_rate_used).toBe(0);
  });

  it('flags traditional IRA phase-out warning near the threshold', () => {
    const result = calculateRetirementSavings({
      salary: 82_000, // within $77k–$87k single phase-out
      age: 35,
      years_to_retirement: 30,
      ira_contribution: 7_000,
      ira_type: 'traditional',
    });
    expect(result.traditional_ira_phase_out_warning).toBe(true);
  });

  it('does not flag Roth IRA as non-deductible warning', () => {
    const result = calculateRetirementSavings({
      salary: 82_000,
      age: 35,
      years_to_retirement: 30,
      ira_contribution: 7_000,
      ira_type: 'roth',
    });
    expect(result.traditional_ira_phase_out_warning).toBe(false);
  });
});

// ─── get_recommendations ──────────────────────────────────────────────────────

describe('get_recommendations', () => {
  it('returns recommendations array with standard budget', () => {
    const result = getRecommendations({
      salary: 100_000,
      state: 'TX',
      expenses: { rent: 2_500 },
      savings: { retirement_contribution_percent: 6 },
    });
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(typeof result.net_monthly_income).toBe('number');
    expect(typeof result.savings_rate_gross).toBe('number');
    expect(typeof result.housing_percent_gross).toBe('number');
  });

  it('warns when housing exceeds 30% of gross', () => {
    const result = getRecommendations({
      salary: 60_000, // $5k/mo gross
      state: 'TX',
      expenses: { rent: 2_000 }, // 40% of gross
    });
    const hasHousingWarning = result.recommendations.some(
      (r) => r.severity === 'warning' && r.message.toLowerCase().includes('rent')
    );
    expect(hasHousingWarning).toBe(true);
  });

  it('returns recommendation_count and warning/success counters', () => {
    const result = getRecommendations({ salary: 100_000, state: 'TX' });
    expect(result.recommendation_count).toBe(result.recommendations.length);
    expect(result.warning_count).toBeGreaterThanOrEqual(0);
    expect(result.success_count).toBeGreaterThanOrEqual(0);
  });

  it('includes salary and state in the result', () => {
    const result = getRecommendations({ salary: 120_000, state: 'CA' });
    expect(result.salary).toBe(120_000);
    expect(result.state).toBe('CA');
  });
});

// ─── compare_scenarios ────────────────────────────────────────────────────────

describe('compare_scenarios', () => {
  const baseScenario = {
    name: 'Current Budget',
    salary: 120_000,
    state: 'CA',
    expenses: { rent: 2_500 },
    savings: { retirement_contribution_percent: 10 },
  };

  const txScenario = {
    name: 'Move to Texas',
    salary: 120_000,
    state: 'TX',
    expenses: { rent: 1_800 },
    savings: { retirement_contribution_percent: 10 },
  };

  it('returns baseline and comparisons for 2 scenarios', () => {
    const result = compareScenarios({ scenarios: [baseScenario, txScenario] });
    expect(result.baseline.name).toBe('Current Budget');
    expect(result.comparisons).toHaveLength(1);
    expect(result.comparisons[0].name).toBe('Move to Texas');
  });

  it('shows that TX has lower taxes than CA', () => {
    const result = compareScenarios({ scenarios: [baseScenario, txScenario] });
    expect(result.comparisons[0].taxes.state_monthly).toBeLessThan(result.baseline.taxes.state_monthly);
  });

  it('computes diffs against the baseline', () => {
    const result = compareScenarios({ scenarios: [baseScenario, txScenario] });
    expect(result.diffs).toHaveLength(1);
    const diff = result.diffs[0];
    expect(diff.name).toBe('Move to Texas');
    expect(diff.vs_baseline.net_monthly_income_delta).toBeGreaterThan(0); // TX gives more take-home
    expect(typeof diff.vs_baseline.health_score_delta).toBe('number');
  });

  it('picks a winner by health score', () => {
    const result = compareScenarios({ scenarios: [baseScenario, txScenario] });
    expect(typeof result.winner).toBe('string');
    expect(typeof result.winner_reason).toBe('string');
    expect(result.winner_reason.length).toBeGreaterThan(10);
  });

  it('handles 3 scenarios', () => {
    const aggressiveSaver = {
      name: 'Max Out 401k',
      salary: 120_000,
      state: 'TX',
      expenses: { rent: 1_800 },
      savings: { max_out_401k: true },
    };
    const result = compareScenarios({ scenarios: [baseScenario, txScenario, aggressiveSaver] });
    expect(result.comparisons).toHaveLength(2);
    expect(result.diffs).toHaveLength(2);
  });

  it('each snapshot has required fields', () => {
    const result = compareScenarios({ scenarios: [baseScenario, txScenario] });
    [result.baseline, ...result.comparisons].forEach((snap) => {
      expect(typeof snap.net_monthly_income).toBe('number');
      expect(typeof snap.health_score).toBe('number');
      expect(typeof snap.health_label).toBe('string');
      expect(typeof snap.is_over_budget).toBe('boolean');
    });
  });
});
