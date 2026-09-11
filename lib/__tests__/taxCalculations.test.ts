import {
  federalIncomeTaxEstimate,
  stateIncomeTaxEstimate,
  payrollTaxEstimate,
  calculateRetirementContribution,
  calculateNetMonthlyIncome,
  ANNUAL_401K_LIMIT,
} from '../taxCalculations';

describe('taxCalculations', () => {
  describe('federalIncomeTaxEstimate', () => {
    it('should calculate federal tax for single filer with no 401k', () => {
      // Single filer earning $50,000 (2026 brackets)
      // Taxable income: $50,000 - $16,100 (standard deduction) = $33,900
      // Tax: $1,240 (10% on $0-12,400) + $2,580 (12% on $12,400-33,900) = $3,820
      const result = federalIncomeTaxEstimate(50000, 'single', 0);
      expect(result).toBeCloseTo(3820, 0);
    });

    it('should calculate federal tax for married filing jointly', () => {
      // MFJ earning $100,000 (2026 brackets)
      // Taxable: $100,000 - $32,200 = $67,800
      // Tax: $2,480 (10% on $0-24,800) + $5,160 (12% on $24,800-67,800) = $7,640
      const result = federalIncomeTaxEstimate(100000, 'married_jointly', 0);
      expect(result).toBeCloseTo(7640, 0);
    });

    it('should calculate federal tax for head of household', () => {
      // HOH earning $60,000 (2026 brackets)
      // Taxable: $60,000 - $24,150 = $35,850
      // Tax: $1,770 (10% on $0-17,700) + $2,178 (12% on $17,700-35,850) = $3,948
      const result = federalIncomeTaxEstimate(60000, 'head_of_household', 0);
      expect(result).toBeCloseTo(3948, 0);
    });

    it('should account for 401k pre-tax deduction', () => {
      // $50,000 gross, $10,000 401k
      // Federal tax on $50,000 - $14,600 - $10,000 = $25,400
      const resultWithoutDeferral = federalIncomeTaxEstimate(50000, 'single', 0);
      const resultWithDeferral = federalIncomeTaxEstimate(50000, 'single', 10000);
      expect(resultWithDeferral).toBeLessThan(resultWithoutDeferral);
    });

    it('should handle zero taxable income', () => {
      const result = federalIncomeTaxEstimate(10000, 'single', 0);
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should handle high income (top bracket)', () => {
      // Single filer at $500,000
      const result = federalIncomeTaxEstimate(500000, 'single', 0);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(500000);
    });

    it('should cap 401k deduction at actual gross for very high contributions', () => {
      // 401k can't exceed gross income
      const result = federalIncomeTaxEstimate(50000, 'single', 100000);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  describe('stateIncomeTaxEstimate', () => {
    it('should return zero tax for no_state_tax', () => {
      const result = stateIncomeTaxEstimate(100000, 'no_state_tax', 'single', 0);
      expect(result).toBe(0);
    });

    it('should calculate California state tax for single filer', () => {
      // CA single earning $50,000
      // Taxable: $50,000 - $0 (no standard deduction at state level for CA)
      // Tax: $104.12 (1% up to 10,412) + $286.56 (2% on next 14,272) + ...
      const result = stateIncomeTaxEstimate(50000, 'CA', 'single', 0);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(50000);
    });

    it('should calculate California state tax for married filing jointly', () => {
      const result = stateIncomeTaxEstimate(100000, 'CA', 'married_jointly', 0);
      expect(result).toBeGreaterThan(0);
    });

    it('should calculate Georgia flat tax correctly', () => {
      // GA has flat 5.49% rate
      // $50,000 * 0.0549 = $2,745
      const result = stateIncomeTaxEstimate(50000, 'GA', 'single', 0);
      expect(result).toBeCloseTo(2745, 0);
    });

    it('should account for 401k pre-tax deduction for state tax', () => {
      const resultWithout = stateIncomeTaxEstimate(50000, 'GA', 'single', 0);
      const resultWith = stateIncomeTaxEstimate(50000, 'GA', 'single', 10000);
      expect(resultWith).toBeLessThan(resultWithout);
    });

    it('should handle zero income', () => {
      const result = stateIncomeTaxEstimate(0, 'CA', 'single', 0);
      expect(result).toBe(0);
    });
  });

  describe('payrollTaxEstimate', () => {
    it('should calculate payroll tax for single filer under $200k', () => {
      // $60,000 gross
      // SS: $60,000 * 0.062 = $3,720
      // Medicare: $60,000 * 0.0145 = $870
      // No additional Medicare
      // Total: $4,590
      const result = payrollTaxEstimate(60000, 'single');
      expect(result).toBeCloseTo(4590, 0);
    });

    it('should cap Social Security tax at wage base', () => {
      // $250,000 gross
      // SS: $168,600 * 0.062 = $10,453.20
      // Medicare: $250,000 * 0.0145 = $3,625
      // Additional Medicare: ($250,000 - $200,000) * 0.009 = $450
      // Total: $14,528.20
      const result = payrollTaxEstimate(250000, 'single');
      expect(result).toBeCloseTo(14528.2, 0);
    });

    it('should handle additional Medicare tax for married high earners', () => {
      // MFJ at $300,000
      // SS: $168,600 * 0.062 = $10,453.20
      // Medicare: $300,000 * 0.0145 = $4,350
      // Additional Medicare: ($300,000 - $250,000) * 0.009 = $450
      // Total: $15,253.20
      const result = payrollTaxEstimate(300000, 'married_jointly');
      expect(result).toBeCloseTo(15253.2, 0);
    });

    it('should have higher additional Medicare threshold for MFJ', () => {
      const resultSingle = payrollTaxEstimate(250000, 'single');
      const resultMFJ = payrollTaxEstimate(250000, 'married_jointly');
      expect(resultMFJ).toBeLessThan(resultSingle);
    });

    it('should handle zero income', () => {
      const result = payrollTaxEstimate(0, 'single');
      expect(result).toBe(0);
    });
  });

  describe('calculateRetirementContribution', () => {
    it('should calculate percentage-based 401k contribution', () => {
      const result = calculateRetirementContribution(100000, 10, false, 3);
      expect(result.annual401k).toBeCloseTo(10000, 0);
      expect(result.monthly401k).toBeCloseTo(833.33, 0);
      expect(result.isMaxing401k).toBe(false);
      expect(result.annualEmployerMatch).toBeCloseTo(3000, 0);
      expect(result.monthlyEmployerMatch).toBeCloseTo(250, 0);
    });

    it('should cap percentage-based contribution at annual limit', () => {
      // 20% of $200,000 = $40,000, but capped at $24,500
      const result = calculateRetirementContribution(200000, 20, false, 3);
      expect(result.annual401k).toBe(ANNUAL_401K_LIMIT);
      expect(result.isMaxing401k).toBe(true);
    });

    it('should max out 401k when flag is true', () => {
      const result = calculateRetirementContribution(100000, 5, true, 3);
      expect(result.annual401k).toBe(ANNUAL_401K_LIMIT);
      expect(result.isMaxing401k).toBe(true);
    });

    it('should respect limit even when maxing out', () => {
      const result = calculateRetirementContribution(200000, 50, true, 5);
      expect(result.annual401k).toBeLessThanOrEqual(ANNUAL_401K_LIMIT);
      expect(result.annual401k).toBe(ANNUAL_401K_LIMIT);
    });

    it('should calculate employer match correctly', () => {
      const result = calculateRetirementContribution(100000, 10, false, 5);
      // Employer match: 100000 * 0.05 = 5000
      expect(result.annualEmployerMatch).toBeCloseTo(5000, 0);
      expect(result.monthlyEmployerMatch).toBeCloseTo(416.67, 0);
    });

    it('should handle zero gross income', () => {
      const result = calculateRetirementContribution(0, 10, false, 3);
      expect(result.annual401k).toBe(0);
      expect(result.isMaxing401k).toBe(false);
      expect(result.annualEmployerMatch).toBe(0);
    });

    it('should handle zero contribution percentage', () => {
      const result = calculateRetirementContribution(100000, 0, false, 0);
      expect(result.annual401k).toBe(0);
      expect(result.annualEmployerMatch).toBe(0);
    });
  });

  describe('calculateNetMonthlyIncome', () => {
    it('should calculate net monthly income for basic scenario', () => {
      const result = calculateNetMonthlyIncome(
        60000, // grossAnnual
        'single',
        'no_state_tax',
        5000, // annual401k
        0, // annualIRA
        0, // bonusIncome
        0 // otherMonthlyIncome
      );

      expect(result.grossMonthly).toBeCloseTo(5000, 0);
      expect(result.total401kMonthly).toBeCloseTo(416.67, 0);
      expect(result.netMonthly).toBeGreaterThan(0);
      expect(result.netMonthly).toBeLessThan(result.grossMonthly);
      expect(result.effectiveTaxRate).toBeGreaterThan(0);
      expect(result.effectiveTaxRate).toBeLessThan(0.5);
    });

    it('should include bonus income in tax calculations', () => {
      const resultWithoutBonus = calculateNetMonthlyIncome(
        100000,
        'single',
        'GA',
        10000,
        0,
        0,
        0
      );

      const resultWithBonus = calculateNetMonthlyIncome(
        100000,
        'single',
        'GA',
        10000,
        0,
        20000, // bonus income
        0
      );

      expect(resultWithBonus.totalTaxAnnual).toBeGreaterThan(
        resultWithoutBonus.totalTaxAnnual
      );
    });

    it('should include other monthly income', () => {
      const result = calculateNetMonthlyIncome(
        60000,
        'single',
        'no_state_tax',
        5000,
        0,
        0,
        500 // other monthly income
      );

      expect(result.grossMonthly).toBeCloseTo(5500, 0);
    });

    it('should account for IRA contributions', () => {
      const resultWithoutIRA = calculateNetMonthlyIncome(
        60000,
        'single',
        'no_state_tax',
        5000,
        0,
        0,
        0
      );

      const resultWithIRA = calculateNetMonthlyIncome(
        60000,
        'single',
        'no_state_tax',
        5000,
        3000, // IRA
        0,
        0
      );

      expect(resultWithIRA.netMonthly).toBeLessThan(resultWithoutIRA.netMonthly);
    });

    it('should calculate effective tax rate correctly', () => {
      const result = calculateNetMonthlyIncome(
        100000,
        'single',
        'GA',
        10000,
        0,
        0,
        0
      );

      const expectedRate = result.totalTaxAnnual / 100000;
      expect(result.effectiveTaxRate).toBeCloseTo(expectedRate, 4);
    });

    it('should include state taxes in calculations', () => {
      const resultCA = calculateNetMonthlyIncome(
        100000,
        'single',
        'CA',
        10000,
        0,
        0,
        0
      );

      const resultNoState = calculateNetMonthlyIncome(
        100000,
        'single',
        'no_state_tax',
        10000,
        0,
        0,
        0
      );

      expect(resultCA.totalTaxAnnual).toBeGreaterThan(resultNoState.totalTaxAnnual);
      expect(resultCA.stateTaxAnnual).toBeGreaterThan(0);
      expect(resultNoState.stateTaxAnnual).toBe(0);
    });

    it('should break down taxes by component', () => {
      const result = calculateNetMonthlyIncome(
        100000,
        'single',
        'GA',
        10000,
        0,
        0,
        0
      );

      expect(result.federalTaxAnnual).toBeGreaterThan(0);
      expect(result.stateTaxAnnual).toBeGreaterThan(0);
      expect(result.payrollTaxAnnual).toBeGreaterThan(0);
      expect(result.totalTaxAnnual).toBeCloseTo(
        result.federalTaxAnnual + result.stateTaxAnnual + result.payrollTaxAnnual,
        0
      );
    });

    it('should handle zero income gracefully', () => {
      const result = calculateNetMonthlyIncome(0, 'single', 'no_state_tax', 0, 0, 0, 0);
      expect(result.netMonthly).toBe(0);
      expect(result.effectiveTaxRate).toBe(0);
    });

    it('should ensure net monthly is non-negative', () => {
      const result = calculateNetMonthlyIncome(
        50000,
        'single',
        'no_state_tax',
        40000, // Very high 401k
        7500, // Very high IRA
        0,
        0
      );
      expect(result.netMonthly).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases and validation', () => {
    it('should handle very high income across all functions', () => {
      const gross = 1000000;
      const filing = 'married_jointly';
      const state = 'CA';

      const federal = federalIncomeTaxEstimate(gross, filing, 24500);
      const stateT = stateIncomeTaxEstimate(gross, state, filing, 24500);
      const payroll = payrollTaxEstimate(gross, filing);

      expect(federal).toBeGreaterThan(0);
      expect(stateT).toBeGreaterThan(0);
      expect(payroll).toBeGreaterThan(0);
      expect(federal + stateT + payroll).toBeLessThan(gross);
    });

    it('should maintain consistency across filing statuses', () => {
      const gross = 100000;
      const single = federalIncomeTaxEstimate(gross, 'single', 0);
      const mfj = federalIncomeTaxEstimate(gross, 'married_jointly', 0);
      const hoh = federalIncomeTaxEstimate(gross, 'head_of_household', 0);

      // MFJ should generally pay less than single
      expect(mfj).toBeLessThan(single);
      // HOH between single and MFJ is reasonable
      expect(hoh).toBeGreaterThan(0);
    });
  });
});
