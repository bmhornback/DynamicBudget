import { rebalanceBudget } from '../rebalanceBudget';
import { DEFAULT_INPUTS } from '../defaultScenarios';
import type { BudgetInputs, RebalanceStrategy, SurplusAllocation } from '@/types/budget';

function createInputs(overrides: Partial<BudgetInputs> = {}): BudgetInputs {
  return {
    ...DEFAULT_INPUTS,
    annualSalary: 0,
    bonusIncome: 0,
    bonusTaxMode: 'blended_annual',
    esppIncome: 0,
    rsuVestingIncome: 0,
    otherMonthlyIncome: 0,
    retirementContributionPercent: 0,
    is401kRoth: false,
    maxOut401k: false,
    employerMatchPercent: 0,
    employerMatchCapPercent: 100,
    userAge: 0,
    partnerEnabled: false,
    partnerAnnualSalary: 0,
    partnerBonusIncome: 0,
    partnerRetirementContributionPercent: 0,
    partnerIs401kRoth: false,
    partnerMaxOut401k: false,
    partnerEmployerMatchPercent: 0,
    partnerEmployerMatchCapPercent: 100,
    partnerAge: 0,
    housingMode: 'renter',
    rent: 0,
    petRent: 0,
    rentersInsurance: 0,
    mortgagePayment: 0,
    propertyTax: 0,
    homeInsurance: 0,
    homeMaintenanceReserve: 0,
    parkingFee: 0,
    hoaFee: 0,
    electric: 0,
    gas: 0,
    water: 0,
    trash: 0,
    internet: 0,
    phone: 0,
    carSituation: 'no_car',
    carPayment: 0,
    fuel: 0,
    carInsurance: 0,
    carMaintenance: 0,
    carParking: 0,
    tolls: 0,
    rideShareTransit: 0,
    petsEnabled: false,
    numberOfPets: 0,
    petFood: 0,
    vetMedications: 0,
    petInsurance: 0,
    groomingSupplies: 0,
    dogDaycare: 0,
    boardingSitter: 0,
    emergencyPetFund: 0,
    groceries: 0,
    householdBasics: 0,
    diningOut: 0,
    healthInsurance: 0,
    dentalInsurance: 0,
    visionInsurance: 0,
    lifeInsurance: 0,
    prescriptions: 0,
    gymFitness: 0,
    therapyWellness: 0,
    emergencyFundContribution: 0,
    emergencyFundTarget: 0,
    houseDownPaymentContribution: 0,
    houseDownPaymentTarget: 0,
    taxableInvestments: 0,
    iraContribution: 0,
    iraType: 'traditional',
    maxOutIRA: false,
    hsaContribution: 0,
    hsaEligible: false,
    maxOutHSA: false,
    extraDebtPayoff: 0,
    debtPayoffStrategy: 'avalanche',
    debts: [],
    generalCashSavings: 0,
    isSavingsByPercentage: false,
    savingsPercentOfNetIncome: 0,
    longTermGoals: [],
    funEntertainment: 0,
    travel: 0,
    clothes: 0,
    subscriptions: 0,
    personalSpending: 0,
    gifts: 0,
    miscBuffer: 0,
    lockedFields: {},
    budgetMode: 'manual',
    rebalanceStrategy: 'reduce_lifestyle_first',
    surplusAllocation: 'leave_as_buffer',
    payFrequency: 'monthly',
    spendingHistory: { entries: [], lastUpdated: '', version: 1 },
    ...overrides,
  };
}

function createOverBudgetInputs(overrides: Partial<BudgetInputs> = {}): BudgetInputs {
  return createInputs({
    otherMonthlyIncome: 1000,
    funEntertainment: 100,
    diningOut: 200,
    travel: 150,
    personalSpending: 100,
    clothes: 50,
    subscriptions: 50,
    gifts: 50,
    miscBuffer: 50,
    taxableInvestments: 250,
    generalCashSavings: 100,
    houseDownPaymentContribution: 50,
    emergencyFundContribution: 50,
    ...overrides,
  });
}

describe('rebalanceBudget', () => {
  describe('deficit strategies', () => {
    it.each([
      ['reduce_lifestyle_first', ['funEntertainment', 'diningOut']],
      ['reduce_investments_first', ['taxableInvestments']],
      ['reduce_house_fund_first', ['houseDownPaymentContribution', 'taxableInvestments']],
      ['reduce_flexible_proportionally', [
        'funEntertainment',
        'diningOut',
        'travel',
        'personalSpending',
        'clothes',
        'subscriptions',
        'gifts',
        'miscBuffer',
        'taxableInvestments',
        'generalCashSavings',
        'houseDownPaymentContribution',
        'emergencyFundContribution',
      ]],
      ['reduce_non_required_proportionally', [
        'funEntertainment',
        'diningOut',
        'travel',
        'personalSpending',
        'clothes',
        'subscriptions',
        'gifts',
        'miscBuffer',
        'taxableInvestments',
        'generalCashSavings',
        'houseDownPaymentContribution',
        'emergencyFundContribution',
      ]],
      ['recommendations_only', []],
    ] satisfies Array<[RebalanceStrategy, string[]]>)(
      'handles %s over-budget flows',
      (strategy, changedFields) => {
        const inputs = createOverBudgetInputs();

        const result = rebalanceBudget(inputs, strategy, 'leave_as_buffer');

        expect(result.updatedInputs).toBeDefined();
        expect(result.message).toContain('Budget');

        if (strategy === 'recommendations_only') {
          expect(result.success).toBe(false);
          expect(result.updatedInputs).toBe(inputs);
          expect(result.changes).toEqual([]);
          return;
        }

        expect(result.success).toBe(true);
        expect(result.newBuffer).toBeCloseTo(0, 6);
        expect(result.changes.map((change) => change.fieldId)).toEqual(changedFields);
      }
    );

    it('reduces lifestyle fields sequentially before touching investments', () => {
      const inputs = createOverBudgetInputs();

      const result = rebalanceBudget(inputs, 'reduce_lifestyle_first', 'leave_as_buffer');

      expect(result.updatedInputs.funEntertainment).toBe(0);
      expect(result.updatedInputs.diningOut).toBe(100);
      expect(result.updatedInputs.taxableInvestments).toBe(250);
      expect(result.changes).toEqual([
        expect.objectContaining({ fieldId: 'funEntertainment', oldValue: 100, newValue: 0, delta: -100 }),
        expect.objectContaining({ fieldId: 'diningOut', oldValue: 200, newValue: 100, delta: -100 }),
      ]);
    });

    it('reduces investments before lifestyle when requested', () => {
      const inputs = createOverBudgetInputs();

      const result = rebalanceBudget(inputs, 'reduce_investments_first', 'leave_as_buffer');

      expect(result.updatedInputs.taxableInvestments).toBe(50);
      expect(result.updatedInputs.funEntertainment).toBe(100);
      expect(result.changes).toEqual([
        expect.objectContaining({ fieldId: 'taxableInvestments', oldValue: 250, newValue: 50, delta: -200 }),
      ]);
    });

    it('reduces house fund before other savings when requested', () => {
      const inputs = createOverBudgetInputs();

      const result = rebalanceBudget(inputs, 'reduce_house_fund_first', 'leave_as_buffer');

      expect(result.updatedInputs.houseDownPaymentContribution).toBe(0);
      expect(result.updatedInputs.taxableInvestments).toBe(100);
      expect(result.updatedInputs.generalCashSavings).toBe(100);
    });

    it.each([
      'reduce_flexible_proportionally',
      'reduce_non_required_proportionally',
    ] satisfies RebalanceStrategy[])('reduces all unlocked flexible fields proportionally for %s', (strategy) => {
      const inputs = createOverBudgetInputs();

      const result = rebalanceBudget(inputs, strategy, 'leave_as_buffer');

      expect(result.changes).toHaveLength(12);
      expect(result.updatedInputs.funEntertainment).toBeCloseTo(100 * (5 / 6), 6);
      expect(result.updatedInputs.taxableInvestments).toBeCloseTo(250 * (5 / 6), 6);
      expect(result.updatedInputs.emergencyFundContribution).toBeCloseTo(50 * (5 / 6), 6);
    });

    it('skips locked fields during deficit rebalancing', () => {
      const inputs = createOverBudgetInputs({
        lockedFields: {
          funEntertainment: true,
          taxableInvestments: true,
        },
      });

      const result = rebalanceBudget(inputs, 'reduce_lifestyle_first', 'leave_as_buffer');

      expect(result.success).toBe(true);
      expect(result.updatedInputs.funEntertainment).toBe(100);
      expect(result.updatedInputs.taxableInvestments).toBe(250);
      expect(result.updatedInputs.diningOut).toBe(0);
      expect(result.changes.map((change) => change.fieldId)).toEqual(['diningOut']);
    });

    it('does not mutate inputs in recommendations-only mode', () => {
      const inputs = createOverBudgetInputs();
      const snapshot = structuredClone(inputs);

      const result = rebalanceBudget(inputs, 'recommendations_only', 'leave_as_buffer');

      expect(result.updatedInputs).toBe(inputs);
      expect(inputs).toEqual(snapshot);
    });
  });

  describe('surplus allocations', () => {
    it.each([
      ['house_fund', ['houseDownPaymentContribution'], 120, 0, 0, 0, 0],
      ['emergency_fund', ['emergencyFundContribution'], 0, 120, 0, 0, 0],
      ['taxable_investments', ['taxableInvestments'], 0, 0, 120, 0, 0],
      ['lifestyle', ['funEntertainment'], 0, 0, 0, 120, 0],
      ['debt_payoff', ['extraDebtPayoff'], 0, 0, 0, 0, 120],
      ['evenly_unlocked_savings', ['houseDownPaymentContribution', 'emergencyFundContribution', 'taxableInvestments', 'generalCashSavings'], 30, 30, 30, 0, 0],
      ['leave_as_buffer', [], 0, 0, 0, 0, 0],
    ] satisfies Array<[SurplusAllocation, string[], number, number, number, number, number]>)(
      'allocates surplus for %s',
      (allocation, changedFields, expectedHouse, expectedEmergency, expectedTaxable, expectedLifestyle, expectedDebt) => {
        const inputs = createInputs({ otherMonthlyIncome: 120 });

        const result = rebalanceBudget(inputs, 'reduce_lifestyle_first', allocation);

        expect(result.success).toBe(true);
        expect(result.changes.map((change) => change.fieldId)).toEqual(changedFields);
        expect(result.updatedInputs.houseDownPaymentContribution).toBe(expectedHouse);
        expect(result.updatedInputs.emergencyFundContribution).toBe(expectedEmergency);
        expect(result.updatedInputs.taxableInvestments).toBe(expectedTaxable);
        expect(result.updatedInputs.funEntertainment).toBe(expectedLifestyle);
        expect(result.updatedInputs.extraDebtPayoff).toBe(expectedDebt);
      }
    );

    it('spreads evenly-unlocked savings across only unlocked targets', () => {
      const inputs = createInputs({
        otherMonthlyIncome: 120,
        lockedFields: {
          houseDownPaymentContribution: true,
          taxableInvestments: true,
        },
      });

      const result = rebalanceBudget(inputs, 'reduce_lifestyle_first', 'evenly_unlocked_savings');

      expect(result.changes.map((change) => change.fieldId)).toEqual([
        'emergencyFundContribution',
        'generalCashSavings',
      ]);
      expect(result.updatedInputs.emergencyFundContribution).toBe(60);
      expect(result.updatedInputs.generalCashSavings).toBe(60);
      expect(result.updatedInputs.houseDownPaymentContribution).toBe(0);
      expect(result.updatedInputs.taxableInvestments).toBe(0);
    });
  });

  it('returns a balanced message without changes when already balanced', () => {
    const inputs = createInputs({ otherMonthlyIncome: 0 });

    const result = rebalanceBudget(inputs, 'reduce_lifestyle_first', 'leave_as_buffer');

    expect(result.success).toBe(true);
    expect(result.changes).toEqual([]);
    expect(result.message).toBe('Budget is already balanced.');
  });
});
