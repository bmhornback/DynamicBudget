import { calculateBudgetBreakdown, BUDGET_THRESHOLDS } from '../budgetCalculations';
import { DEFAULT_INPUTS } from '../defaultScenarios';

describe('budgetCalculations', () => {
  describe('calculateBudgetBreakdown', () => {
    it('should calculate budget breakdown with DEFAULT_INPUTS', () => {
      const result = calculateBudgetBreakdown(DEFAULT_INPUTS);

      // Check that all required fields exist
      expect(result).toHaveProperty('grossMonthly');
      expect(result).toHaveProperty('netMonthlyIncome');
      expect(result).toHaveProperty('taxes');
      expect(result).toHaveProperty('retirement');
      expect(result).toHaveProperty('totalAllocated');
      expect(result).toHaveProperty('remainingMonthlyBuffer');

      // Check that values are numeric and non-negative
      expect(result.grossMonthly).toBeGreaterThan(0);
      expect(result.netMonthlyIncome).toBeGreaterThan(0);
      expect(result.totalAllocated).toBeGreaterThanOrEqual(0);
    });

    it('should calculate correct gross monthly from annual salary', () => {
      const inputs = { ...DEFAULT_INPUTS, annualSalary: 120000, bonusIncome: 0 };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.grossMonthly).toBeCloseTo(10000, 0);
      expect(result.taxes.grossAnnual).toBeCloseTo(120000, 0);
    });

    it('should include bonus income in gross calculations', () => {
      const inputs = { ...DEFAULT_INPUTS, bonusIncome: 20000 };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.taxes.grossAnnual).toBeCloseTo(
        DEFAULT_INPUTS.annualSalary + 20000,
        0
      );
    });

    it('should calculate housing expense total correctly', () => {
      const inputs = {
        ...DEFAULT_INPUTS,
        rent: 1500,
        petRent: 50,
        rentersInsurance: 25,
        parkingFee: 75,
        hoaFee: 0,
      };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.totalHousing).toBeCloseTo(1650, 0);
    });

    it('should calculate utilities expense total correctly', () => {
      const inputs = {
        ...DEFAULT_INPUTS,
        electric: 100,
        gas: 50,
        water: 30,
        trash: 25,
        internet: 70,
        phone: 80,
      };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.totalUtilities).toBeCloseTo(355, 0);
    });

    it('should calculate transportation expense total correctly', () => {
      const inputs = {
        ...DEFAULT_INPUTS,
        carPayment: 300,
        fuel: 150,
        carInsurance: 120,
        carMaintenance: 80,
        carParking: 50,
        tolls: 30,
        rideShareTransit: 40,
      };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.totalTransportation).toBeCloseTo(770, 0);
    });

    it('should calculate pets expenses when enabled', () => {
      const inputs = {
        ...DEFAULT_INPUTS,
        petsEnabled: true,
        petFood: 100,
        vetMedications: 50,
        petInsurance: 40,
        groomingSupplies: 30,
        dogDaycare: 200,
        boardingSitter: 80,
        emergencyPetFund: 40,
      };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.totalPets).toBeCloseTo(540, 0);
    });

    it('should return zero pet expenses when disabled', () => {
      const inputs = { ...DEFAULT_INPUTS, petsEnabled: false };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.totalPets).toBe(0);
    });

    it('should calculate groceries and food total correctly', () => {
      const inputs = {
        ...DEFAULT_INPUTS,
        groceries: 500,
        householdBasics: 100,
        diningOut: 200,
      };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.totalGroceriesFood).toBeCloseTo(800, 0);
    });

    it('should calculate health expense total correctly', () => {
      const inputs = {
        ...DEFAULT_INPUTS,
        healthInsurance: 200,
        prescriptions: 50,
        gymFitness: 75,
        therapyWellness: 100,
      };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.totalHealth).toBeCloseTo(425, 0);
    });

    it('should calculate lifestyle expense total correctly', () => {
      const inputs = {
        ...DEFAULT_INPUTS,
        funEntertainment: 200,
        travel: 150,
        clothes: 100,
        subscriptions: 30,
        personalSpending: 200,
        gifts: 40,
        miscBuffer: 80,
      };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.totalLifestyle).toBeCloseTo(800, 0);
    });

    it('should calculate savings totals correctly', () => {
      const inputs = {
        ...DEFAULT_INPUTS,
        emergencyFundContribution: 300,
        houseDownPaymentContribution: 800,
        generalCashSavings: 200,
      };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.totalSavings).toBeCloseTo(1300, 0);
    });

    it('should calculate investments total correctly', () => {
      const inputs = {
        ...DEFAULT_INPUTS,
        taxableInvestments: 400,
        extraDebtPayoff: 100,
      };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.totalInvestments).toBeCloseTo(500, 0);
    });

    it('should keep fixed savings and investments separate in fixed savings mode', () => {
      const inputs = {
        ...DEFAULT_INPUTS,
        isSavingsByPercentage: false,
        emergencyFundContribution: 300,
        houseDownPaymentContribution: 400,
        generalCashSavings: 50,
        taxableInvestments: 250,
        extraDebtPayoff: 150,
      };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.calculatedSavingsFromPercentage).toBe(0);
      expect(result.totalSavings).toBeCloseTo(750, 0);
      expect(result.totalInvestments).toBeCloseTo(400, 0);
      expect(result.totalAllocated).toBeCloseTo(
        result.totalHousing +
          result.totalUtilities +
          result.totalTransportation +
          result.totalPets +
          result.totalGroceriesFood +
          result.totalHealth +
          result.totalLifestyle +
          750 +
          400,
        0
      );
    });

    it.each([0, 15, 50])(
      'should calculate percentage-based savings correctly at %i percent of net income',
      (savingsPercentOfNetIncome) => {
        const inputs = {
          ...DEFAULT_INPUTS,
          isSavingsByPercentage: true,
          savingsPercentOfNetIncome,
          emergencyFundContribution: 300,
          houseDownPaymentContribution: 400,
          generalCashSavings: 50,
          taxableInvestments: 250,
          extraDebtPayoff: 150,
        };
        const result = calculateBudgetBreakdown(inputs);
        const expectedSavings = result.netMonthlyIncome * (savingsPercentOfNetIncome / 100);

        expect(result.calculatedSavingsFromPercentage).toBeCloseTo(expectedSavings, 2);
        expect(result.totalSavings).toBeCloseTo(expectedSavings, 2);
        expect(result.totalInvestments).toBe(0);
        expect(result.totalAllocated).toBeCloseTo(
          result.totalHousing +
            result.totalUtilities +
            result.totalTransportation +
            result.totalPets +
            result.totalGroceriesFood +
            result.totalHealth +
            result.totalLifestyle +
            expectedSavings,
          2
        );
        expect(result.remainingMonthlyBuffer).toBeCloseTo(
          result.netMonthlyIncome - result.totalAllocated,
          2
        );
      }
    );

    it('should default and clamp percentage-based savings inputs from persisted data', () => {
      const defaultedResult = calculateBudgetBreakdown({
        ...DEFAULT_INPUTS,
        isSavingsByPercentage: true,
        savingsPercentOfNetIncome: undefined as unknown as number,
      });
      const clampedResult = calculateBudgetBreakdown({
        ...DEFAULT_INPUTS,
        isSavingsByPercentage: true,
        savingsPercentOfNetIncome: 75,
      });

      expect(defaultedResult.totalSavings).toBeCloseTo(
        defaultedResult.netMonthlyIncome * 0.3,
        2
      );
      expect(clampedResult.totalSavings).toBeCloseTo(
        clampedResult.netMonthlyIncome * 0.5,
        2
      );
      expect(clampedResult.totalInvestments).toBe(0);
    });

    it('should calculate total allocated expenses correctly', () => {
      const inputs = {
        ...DEFAULT_INPUTS,
        rent: 1000,
        electric: 50,
        carPayment: 0,
        petsEnabled: false,
        groceries: 300,
        healthInsurance: 100,
        funEntertainment: 100,
        emergencyFundContribution: 200,
        taxableInvestments: 100,
      };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.totalAllocated).toBeCloseTo(
        result.totalHousing +
          result.totalUtilities +
          result.totalTransportation +
          result.totalPets +
          result.totalGroceriesFood +
          result.totalHealth +
          result.totalLifestyle +
          result.totalSavings +
          result.totalInvestments,
        0
      );
    });

    it('should detect when budget is over-budget', () => {
      const inputs = {
        ...DEFAULT_INPUTS,
        annualSalary: 30000, // Very low income
        rent: 5000, // Excessive rent
      };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.isOverBudget).toBe(true);
      expect(result.deficit).toBeGreaterThan(0);
      expect(result.surplus).toBe(0);
    });

    it('should detect when budget has surplus', () => {
      const inputs = {
        ...DEFAULT_INPUTS,
        annualSalary: 500000, // High income
        rent: 2000, // Moderate rent
      };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.isOverBudget).toBe(false);
      expect(result.surplus).toBeGreaterThan(0);
      expect(result.deficit).toBe(0);
    });

    it('should handle zero salary', () => {
      const inputs = { ...DEFAULT_INPUTS, annualSalary: 0 };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.netMonthlyIncome).toBe(0);
      expect(result.grossMonthly).toBe(0);
    });

    it('should handle zero rent', () => {
      const inputs = { ...DEFAULT_INPUTS, rent: 0 };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.totalHousing).toBeLessThan(DEFAULT_INPUTS.rent);
    });

    it('should calculate rent as percent of gross correctly', () => {
      const inputs = { ...DEFAULT_INPUTS, annualSalary: 120000, rent: 3000 };
      const result = calculateBudgetBreakdown(inputs);

      const expectedPercent = 3000 / 10000; // 3000 / monthly gross
      expect(result.rentAsPercentGross).toBeCloseTo(expectedPercent, 2);
    });

    it('should calculate rent as percent of take-home correctly', () => {
      const inputs = { ...DEFAULT_INPUTS };
      const result = calculateBudgetBreakdown(inputs);

      const expectedPercent =
        inputs.rent / result.netMonthlyIncome;
      expect(result.rentAsPercentTakeHome).toBeCloseTo(expectedPercent, 2);
    });

    it('should calculate retirement savings rate correctly', () => {
      const inputs = {
        ...DEFAULT_INPUTS,
        annualSalary: 100000,
        retirementContributionPercent: 15,
        maxOut401k: false,
      };
      const result = calculateBudgetBreakdown(inputs);

      // 15% of 100k = 15k per year
      const expectedRate = 15000 / 100000;
      expect(result.retirement.retirementSavingsRate).toBeCloseTo(expectedRate, 2);
    });

    it('should detect when saving 15 percent of salary', () => {
      const inputs = {
        ...DEFAULT_INPUTS,
        annualSalary: 100000,
        retirementContributionPercent: 15,
        maxOut401k: false,
        iraContribution: 0,
      };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.retirement.isSaving15Percent).toBe(true);
    });

    it('should detect when NOT saving 15 percent of salary', () => {
      const inputs = {
        ...DEFAULT_INPUTS,
        annualSalary: 100000,
        retirementContributionPercent: 5,
        maxOut401k: false,
      };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.retirement.isSaving15Percent).toBe(false);
    });

    it('should calculate fixed vs variable expenses', () => {
      const result = calculateBudgetBreakdown(DEFAULT_INPUTS);

      // Fixed should include housing + utilities + transportation + health
      // Variable should include groceries + lifestyle + pets
      expect(result.totalFixedExpenses).toBe(
        result.totalHousing +
          result.totalUtilities +
          result.totalTransportation +
          result.totalHealth
      );

      expect(result.totalVariableExpenses).toBe(
        result.totalGroceriesFood + result.totalLifestyle + result.totalPets
      );
    });

    it('should calculate emergency fund target as 6x monthly essentials', () => {
      const result = calculateBudgetBreakdown(DEFAULT_INPUTS);

      expect(result.emergencyFundTargetCalculated).toBeCloseTo(
        result.essentialExpensesMonthly * 6,
        0
      );
    });

    it('should calculate annual savings correctly', () => {
      const result = calculateBudgetBreakdown(DEFAULT_INPUTS);

      const expectedAnnual =
        (result.totalSavings + result.totalInvestments) * 12 +
        result.retirement.annual401k +
        result.retirement.annualIRA;

      expect(result.totalAnnualSavingsIncludingRetirement).toBeCloseTo(
        expectedAnnual,
        0
      );
    });

    it('should calculate savings rate (gross) correctly', () => {
      const result = calculateBudgetBreakdown(DEFAULT_INPUTS);

      const expectedRate =
        (result.totalSavings +
          result.totalInvestments +
          result.retirement.monthly401k +
          result.retirement.monthlyIRA) /
        result.grossMonthly;

      expect(result.savingsRateGross).toBeCloseTo(expectedRate, 3);
    });

    it('should handle other monthly income', () => {
      const inputs = {
        ...DEFAULT_INPUTS,
        otherMonthlyIncome: 1000,
      };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.grossMonthly).toBeGreaterThan(
        calculateBudgetBreakdown(DEFAULT_INPUTS).grossMonthly
      );
    });

    it('should cap IRA contribution at annual limit', () => {
      const inputs = {
        ...DEFAULT_INPUTS,
        iraContribution: 1000, // 1000/month = 12000/year, cap at 7500
      };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.retirement.annualIRA).toBeLessThanOrEqual(7500);
    });

    it('should calculate tax breakdown correctly', () => {
      const result = calculateBudgetBreakdown(DEFAULT_INPUTS);

      expect(result.taxes.federalAnnual).toBeGreaterThanOrEqual(0);
      expect(result.taxes.stateAnnual).toBeGreaterThanOrEqual(0);
      expect(result.taxes.payrollAnnual).toBeGreaterThanOrEqual(0);
      expect(result.taxes.totalTaxAnnual).toBeCloseTo(
        result.taxes.federalAnnual +
          result.taxes.stateAnnual +
          result.taxes.payrollAnnual,
        0
      );
      expect(result.taxes.effectiveTaxRate).toBeGreaterThanOrEqual(0);
      expect(result.taxes.effectiveTaxRate).toBeLessThan(1);
    });

    it('should calculate car costs as percent of take-home correctly', () => {
      const result = calculateBudgetBreakdown(DEFAULT_INPUTS);

      const expectedPercent = result.totalTransportation / result.netMonthlyIncome;
      expect(result.carCostsAsPercentTakeHome).toBeCloseTo(expectedPercent, 2);
    });

    it('should calculate pet costs as percent of take-home correctly', () => {
      const result = calculateBudgetBreakdown(DEFAULT_INPUTS);

      const expectedPercent = result.totalPets / result.netMonthlyIncome;
      expect(result.petCostsAsPercentTakeHome).toBeCloseTo(expectedPercent, 2);
    });

    it('should return non-negative remaining buffer for balanced budget', () => {
      const inputs = {
        ...DEFAULT_INPUTS,
        annualSalary: 200000,
      };
      const result = calculateBudgetBreakdown(inputs);

      if (!result.isOverBudget) {
        expect(result.remainingMonthlyBuffer).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle annual house fund calculation', () => {
      const inputs = {
        ...DEFAULT_INPUTS,
        houseDownPaymentContribution: 1000,
      };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.annualHouseFund).toBeCloseTo(12000, 0);
    });

    it('should handle annual taxable investments calculation', () => {
      const inputs = {
        ...DEFAULT_INPUTS,
        taxableInvestments: 500,
      };
      const result = calculateBudgetBreakdown(inputs);

      expect(result.annualTaxableInvestments).toBeCloseTo(6000, 0);
    });
  });

  describe('BUDGET_THRESHOLDS', () => {
    it('should have all expected threshold values', () => {
      expect(BUDGET_THRESHOLDS).toHaveProperty('rentPercentGross');
      expect(BUDGET_THRESHOLDS).toHaveProperty('rentPercentTakeHome');
      expect(BUDGET_THRESHOLDS).toHaveProperty('petPercentTakeHome');
      expect(BUDGET_THRESHOLDS).toHaveProperty('carPercentTakeHome');
      expect(BUDGET_THRESHOLDS).toHaveProperty('minMonthlyBuffer');
      expect(BUDGET_THRESHOLDS).toHaveProperty('minRetirementRate');
    });

    it('should have sensible threshold values', () => {
      expect(BUDGET_THRESHOLDS.rentPercentGross).toBeGreaterThan(0);
      expect(BUDGET_THRESHOLDS.rentPercentGross).toBeLessThan(1);
      expect(BUDGET_THRESHOLDS.rentPercentTakeHome).toBeGreaterThan(
        BUDGET_THRESHOLDS.rentPercentGross
      );
      expect(BUDGET_THRESHOLDS.minRetirementRate).toBe(0.15);
    });
  });
});
