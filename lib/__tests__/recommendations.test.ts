import { calculateBudgetBreakdown } from '../budgetCalculations';
import { DEFAULT_INPUTS } from '../defaultScenarios';
import { generateRecommendations } from '../recommendations';

describe('recommendations', () => {
  it('uses housing payment ids for homeowner housing warnings', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      housingMode: 'homeowner' as const,
      annualSalary: 120000,
      mortgagePayment: 4500,
      houseDownPaymentContribution: 500,
    };

    const recommendations = generateRecommendations(inputs, calculateBudgetBreakdown(inputs));
    const recommendationIds = recommendations.map((recommendation) => recommendation.id);

    expect(recommendationIds).toContain('housing_payment_high_gross');
    expect(recommendationIds).toContain('housing_payment_high_takehome');
    expect(recommendationIds).toContain('housing_fund_slow');
    expect(recommendationIds).not.toContain('rent_high_gross');
    expect(recommendationIds).not.toContain('rent_high_takehome');
    expect(recommendationIds).not.toContain('house_fund_slow');
  });

  it('flags over-budget when expenses exceed income', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      annualSalary: 60000,
      rent: 4000,
      emergencyFundContribution: 1000,
    };
    const recommendations = generateRecommendations(inputs, calculateBudgetBreakdown(inputs));
    const ids = recommendations.map((r) => r.id);
    expect(ids).toContain('over_budget');
  });

  it('flags low buffer when budget is tight but not over', () => {
    // DEFAULT_INPUTS runs slightly over budget. Adding $700/month other income brings the
    // buffer into the 0–249 range (verified to be ~$69/month), triggering low_buffer.
    const inputs = { ...DEFAULT_INPUTS, otherMonthlyIncome: 700 };
    const breakdown = calculateBudgetBreakdown(inputs);
    expect(breakdown.remainingMonthlyBuffer).toBeGreaterThanOrEqual(0);
    expect(breakdown.remainingMonthlyBuffer).toBeLessThan(250);
    const ids = generateRecommendations(inputs, breakdown).map((r) => r.id);
    expect(ids).toContain('low_buffer');
  });

  it('generates surplus recommendation when budget has room', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      annualSalary: 200000,
      rent: 1000,
      emergencyFundContribution: 200,
      taxableInvestments: 0,
      houseDownPaymentContribution: 0,
      generalCashSavings: 0,
    };
    const breakdown = calculateBudgetBreakdown(inputs);
    const ids = generateRecommendations(inputs, breakdown).map((r) => r.id);
    expect(ids).toContain('surplus');
  });

  it('flags no emergency fund contribution when emergencyFundContribution is zero', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      emergencyFundContribution: 0,
    };
    const ids = generateRecommendations(inputs, calculateBudgetBreakdown(inputs)).map((r) => r.id);
    expect(ids).toContain('no_emergency_fund');
  });

  it('flags slow emergency fund pace when contribution is too low relative to target', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      emergencyFundContribution: 10,
      emergencyFundTarget: 30000,
    };
    const ids = generateRecommendations(inputs, calculateBudgetBreakdown(inputs)).map((r) => r.id);
    expect(ids).toContain('emergency_fund_slow');
  });

  it('flags high pet costs', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      annualSalary: 60000,
      petsEnabled: true,
      petFood: 800,
      vetMedications: 400,
      dogDaycare: 600,
      groomingSupplies: 200,
    };
    const breakdown = calculateBudgetBreakdown(inputs);
    expect(breakdown.petCostsAsPercentTakeHome).toBeGreaterThan(0.15);
    const ids = generateRecommendations(inputs, breakdown).map((r) => r.id);
    expect(ids).toContain('pet_costs_high');
  });

  it('flags high car costs', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      annualSalary: 60000,
      carPayment: 1200,
      carInsurance: 400,
      fuel: 300,
      carMaintenance: 200,
    };
    const breakdown = calculateBudgetBreakdown(inputs);
    expect(breakdown.carCostsAsPercentTakeHome).toBeGreaterThan(0.15);
    const ids = generateRecommendations(inputs, breakdown).map((r) => r.id);
    expect(ids).toContain('car_costs_high');
  });

  it('flags high lifestyle spending', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      annualSalary: 80000,
      diningOut: 1500,
      funEntertainment: 1500,
      clothing: 500,
      subscriptions: 200,
      personalCare: 200,
    };
    const breakdown = calculateBudgetBreakdown(inputs);
    // Production computes lifestyleRate = totalLifestyle / netMonthlyIncome
    expect(breakdown.totalLifestyle).toBeGreaterThan(breakdown.netMonthlyIncome * 0.30);
    const ids = generateRecommendations(inputs, breakdown).map((r) => r.id);
    expect(ids).toContain('lifestyle_high');
  });

  it('flags budget_risky for very high housing + low retirement + thin buffer', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      annualSalary: 72000,
      rent: 2800,
      retirementContributionPercent: 1, // 1% → well below 10%
      emergencyFundContribution: 50,
      taxableInvestments: 0,
      houseDownPaymentContribution: 0,
      generalCashSavings: 0,
      iraContribution: 0,
    };
    const breakdown = calculateBudgetBreakdown(inputs);
    expect(breakdown.primaryHousingPaymentAsPercentGross).toBeGreaterThan(0.35);
    expect(breakdown.retirement.retirementSavingsRate).toBeLessThan(0.10);
    expect(breakdown.remainingMonthlyBuffer).toBeLessThan(200);
    const ids = generateRecommendations(inputs, breakdown).map((r) => r.id);
    expect(ids).toContain('budget_risky');
  });

  it('flags budget_healthy for a well-structured budget', () => {
    // salary=160000 TX (no state income tax) with 15% retirement → 401k=$24k/year (15% of gross, under cap)
    const inputs = {
      ...DEFAULT_INPUTS,
      annualSalary: 160000,
      state: 'TX' as const,
      retirementContributionPercent: 15,
      rent: 2000,
      emergencyFundContribution: 500,
      taxableInvestments: 500,
      houseDownPaymentContribution: 500,
      generalCashSavings: 0,
    };
    const breakdown = calculateBudgetBreakdown(inputs);
    expect(breakdown.isOverBudget).toBe(false);
    expect(breakdown.remainingMonthlyBuffer).toBeGreaterThanOrEqual(250);
    expect(breakdown.retirement.isSaving15Percent).toBe(true);
    expect(breakdown.primaryHousingPaymentAsPercentGross).toBeLessThanOrEqual(0.30);
    const ids = generateRecommendations(inputs, breakdown).map((r) => r.id);
    expect(ids).toContain('budget_healthy');
  });

  it('warns when Traditional IRA income is in the partial phase-out range (single)', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      annualSalary: 82000,
      filingStatus: 'single' as const,
      iraType: 'traditional' as const,
      iraContribution: 500,
    };
    const ids = generateRecommendations(inputs, calculateBudgetBreakdown(inputs)).map((r) => r.id);
    expect(ids).toContain('ira_phaseout_partial');
  });

  it('warns when Traditional IRA income exceeds the full phase-out (single)', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      annualSalary: 100000,
      filingStatus: 'single' as const,
      iraType: 'traditional' as const,
      iraContribution: 500,
    };
    const ids = generateRecommendations(inputs, calculateBudgetBreakdown(inputs)).map((r) => r.id);
    expect(ids).toContain('ira_phaseout_full');
  });

  it('warns when Traditional IRA income is in the partial phase-out range (MFJ)', () => {
    // MFJ phase-out per TRADITIONAL_IRA_PHASEOUT_MFJ_START/END in taxCalculations.ts ($123k–$143k, labeled 2026)
    const inputs = {
      ...DEFAULT_INPUTS,
      annualSalary: 133000,
      filingStatus: 'married_jointly' as const,
      iraType: 'traditional' as const,
      iraContribution: 500,
    };
    const ids = generateRecommendations(inputs, calculateBudgetBreakdown(inputs)).map((r) => r.id);
    expect(ids).toContain('ira_phaseout_partial');
  });

  it('warns when Traditional IRA income exceeds the full phase-out (MFJ)', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      annualSalary: 160000,
      filingStatus: 'married_jointly' as const,
      iraType: 'traditional' as const,
      iraContribution: 500,
    };
    const ids = generateRecommendations(inputs, calculateBudgetBreakdown(inputs)).map((r) => r.id);
    expect(ids).toContain('ira_phaseout_full');
  });

  it('adds long-term goal pacing recommendations when a goal is behind', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      generalCashSavings: 100,
      longTermGoals: [
        {
          id: 'vacation',
          name: 'Vacation',
          category: 'vacation' as const,
          targetAmount: 12000,
          currentAmount: 0,
          targetDate: '2030-03',
        },
        {
          id: 'kids',
          name: 'Kids',
          category: 'kids' as const,
          targetAmount: 12000,
          currentAmount: 0,
          targetDate: '2030-03',
        },
      ],
    };

    const recommendations = generateRecommendations(inputs, calculateBudgetBreakdown(inputs));
    const recommendationIds = recommendations.map((recommendation) => recommendation.id);

    expect(recommendationIds).toContain('goal_behind_vacation');
    expect(recommendationIds).toContain('goal_pool_underfunded');
  });

  it('prompts users to add deadlines for goals without a target month', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      longTermGoals: [
        {
          id: 'custom-goal',
          name: 'Other Major Purchase',
          category: 'custom' as const,
          targetAmount: 5000,
          currentAmount: 500,
          targetDate: '',
        },
      ],
    };

    const recommendations = generateRecommendations(inputs, calculateBudgetBreakdown(inputs));

    expect(recommendations.map((recommendation) => recommendation.id)).toContain('goal_missing_deadline');
  });

  it('flags underfunded annual expenses that are due soon', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      annualExpenses: [
        {
          id: 'insurance',
          name: 'Car Insurance',
          category: 'insurance' as const,
          annualAmount: 1200,
          currentSaved: 0,
          dueMonth: new Date().getMonth() + 1,
          isEssential: true,
        },
      ],
    };

    const recommendations = generateRecommendations(inputs, calculateBudgetBreakdown(inputs));

    expect(recommendations.map((recommendation) => recommendation.id)).toContain('annual_expense_due_soon');
  });

  it('acknowledges annual expense planning when recurring bills are funded over time', () => {
    const laterInYear = ((new Date().getMonth() + 5) % 12) + 1;
    const inputs = {
      ...DEFAULT_INPUTS,
      annualExpenses: [
        {
          id: 'travel',
          name: 'Travel',
          category: 'travel' as const,
          annualAmount: 1200,
          currentSaved: 900,
          dueMonth: laterInYear,
          isEssential: false,
        },
      ],
    };

    const recommendations = generateRecommendations(inputs, calculateBudgetBreakdown(inputs));

    expect(recommendations.map((recommendation) => recommendation.id)).toContain('annual_expense_planning');
  });
});
