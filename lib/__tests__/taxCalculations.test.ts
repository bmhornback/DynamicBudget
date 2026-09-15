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

    it('should calculate capped employer match correctly', () => {
      // Employer offers 5%, but capped at 3%
      const result = calculateRetirementContribution(100000, 10, false, 5, 3);
      expect(result.annualEmployerMatch).toBeCloseTo(5000, 0); // Uncapped: 5%
      expect(result.annualEmployerMatchCapped).toBeCloseTo(3000, 0); // Capped: 3%
      expect(result.monthlyEmployerMatchCapped).toBeCloseTo(250, 0);
    });

    it('should not cap match when cap is 100%', () => {
      const result = calculateRetirementContribution(100000, 10, false, 5, 100);
      expect(result.annualEmployerMatch).toBeCloseTo(5000, 0);
      expect(result.annualEmployerMatchCapped).toBeCloseTo(5000, 0); // No difference
    });

    it('should handle 0% match cap', () => {
      const result = calculateRetirementContribution(100000, 10, false, 5, 0);
      expect(result.annualEmployerMatchCapped).toBeCloseTo(0, 0);
    });

    it('should calculate 401k catch-up contribution for age 50+', () => {
      // Age 50+: eligible for $7,500 catch-up when maxing out
      const resultAge50 = calculateRetirementContribution(100000, 10, true, 3, 100, 50);
      expect(resultAge50.annual401k).toBe(32000); // Standard limit (24500) + catch-up (7500)
      expect(resultAge50.annual401kCatchUp).toBe(7500); // Catch-up tracked separately
      expect(resultAge50.monthly401kCatchUp).toBeCloseTo(625, 0);
    });

    it('should not include 401k catch-up for age <50', () => {
      // Age 49: no catch-up
      const resultAge49 = calculateRetirementContribution(100000, 10, true, 3, 100, 49);
      expect(resultAge49.annual401k).toBe(24500); // Only standard limit
      expect(resultAge49.annual401kCatchUp).toBe(0);
    });

    it('should only apply catch-up when maxing out 401k', () => {
      // Age 50, not maxing out: no catch-up
      const resultNoMaxOut = calculateRetirementContribution(100000, 5, false, 3, 100, 50);
      expect(resultNoMaxOut.annual401kCatchUp).toBe(0);
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

    it('should apply 22% federal withholding model to bonus when enabled', () => {
      const resultBlended = calculateNetMonthlyIncome(
        300000,
        'single',
        'GA',
        10000,
        0,
        20000,
        0,
        'traditional',
        0,
        false,
        'blended_annual'
      );

      const resultLumpSum = calculateNetMonthlyIncome(
        300000,
        'single',
        'GA',
        10000,
        0,
        20000,
        0,
        'traditional',
        0,
        false,
        'lump_sum_withholding'
      );

      const expectedFederalLumpSum = federalIncomeTaxEstimate(300000, 'single', 10000) + 20000 * 0.22;
      expect(resultLumpSum.federalTaxAnnual).toBeCloseTo(expectedFederalLumpSum, 2);
      expect(resultLumpSum.federalTaxAnnual).not.toBeCloseTo(resultBlended.federalTaxAnnual, 2);
      expect(resultLumpSum.totalTaxAnnual).toBeGreaterThan(0);
    });

    it('should treat ESPP/RSU supplemental income as ordinary income', () => {
      const resultWithoutSupplemental = calculateNetMonthlyIncome(
        100000,
        'single',
        'GA',
        10000,
        0,
        0,
        0,
        'traditional',
        0,
        false,
        'blended_annual',
        0
      );

      const resultWithSupplemental = calculateNetMonthlyIncome(
        100000,
        'single',
        'GA',
        10000,
        0,
        0,
        0,
        'traditional',
        0,
        false,
        'blended_annual',
        25000
      );

      expect(resultWithSupplemental.grossMonthly).toBeCloseTo(
        resultWithoutSupplemental.grossMonthly + 25000 / 12,
        2
      );
      expect(resultWithSupplemental.totalTaxAnnual).toBeGreaterThan(
        resultWithoutSupplemental.totalTaxAnnual
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

    it('should treat Traditional IRA as pre-tax deduction', () => {
      const gross = 100000;
      const filing = 'single';
      const state = 'GA';

      const federalWithoutIRA = federalIncomeTaxEstimate(gross, filing, 0, 0, 0);
      const federalWithTraditionalIRA = federalIncomeTaxEstimate(gross, filing, 0, 7000, 0);

      // Traditional IRA should reduce federal tax
      expect(federalWithTraditionalIRA).toBeLessThan(federalWithoutIRA);

      const stateWithoutIRA = stateIncomeTaxEstimate(gross, state, filing, 0, 0, 0);
      const stateWithTraditionalIRA = stateIncomeTaxEstimate(gross, state, filing, 0, 7000, 0);

      // Traditional IRA should reduce state tax (simplified assumption)
      expect(stateWithTraditionalIRA).toBeLessThanOrEqual(stateWithoutIRA);
    });

    it('should handle Roth IRA as after-tax in net income calculation', () => {
      const gross = 100000;
      const filing = 'single';
      const state = 'GA';

      const resultTraditionalIRA = calculateNetMonthlyIncome(
        gross,
        filing,
        state,
        0,
        7000,
        0,
        0,
        'traditional',
        0
      );

      const resultRothIRA = calculateNetMonthlyIncome(
        gross,
        filing,
        state,
        0,
        7000,
        0,
        0,
        'roth',
        0
      );

      // Traditional IRA: reduces taxable income, so higher net income
      // Roth IRA: after-tax, so lower net income
      expect(resultTraditionalIRA.netMonthly).toBeGreaterThan(resultRothIRA.netMonthly);
      expect(resultTraditionalIRA.federalTaxAnnual).toBeLessThan(resultRothIRA.federalTaxAnnual);
    });

    it('should treat HSA as pre-tax deduction like 401k', () => {
      const gross = 100000;
      const filing = 'single';
      const state = 'GA';

      const resultWithoutHSA = calculateNetMonthlyIncome(
        gross,
        filing,
        state,
        5000,
        0,
        0,
        0,
        'traditional',
        0
      );

      const resultWithHSA = calculateNetMonthlyIncome(
        gross,
        filing,
        state,
        5000,
        0,
        0,
        0,
        'traditional',
        4150 // Annual HSA limit for individual
      );

      // HSA should reduce federal tax
      expect(resultWithHSA.federalTaxAnnual).toBeLessThan(resultWithoutHSA.federalTaxAnnual);
      // HSA reduces take-home (it's a deduction) but also reduces taxes
      expect(resultWithHSA.netMonthly).toBeLessThan(resultWithoutHSA.netMonthly);
      // The difference should be the HSA amount minus the tax savings
      const hsaMonthly = 4150 / 12;
      const totalTaxSavings = (resultWithoutHSA.totalTaxAnnual - resultWithHSA.totalTaxAnnual) / 12;
      const expectedDifference = hsaMonthly - totalTaxSavings;
      // Allow 5% tolerance due to state tax variations
      expect(resultWithoutHSA.netMonthly - resultWithHSA.netMonthly).toBeCloseTo(expectedDifference, 1);
    });

    it('should not reduce taxable income for Roth 401k', () => {
      const gross = 100000;
      const traditional401k = 10000;
      const roth401k = 10000;
      const filing = 'single';
      const state = 'no_state_tax';

      // Traditional 401k should reduce taxes
      const resultTraditional = calculateNetMonthlyIncome(
        gross,
        filing,
        state,
        traditional401k,
        0,
        0,
        0,
        'traditional',
        0,
        false // is401kRoth = false (Traditional)
      );

      // Roth 401k should NOT reduce taxes
      const resultRoth = calculateNetMonthlyIncome(
        gross,
        filing,
        state,
        roth401k,
        0,
        0,
        0,
        'traditional',
        0,
        true // is401kRoth = true (Roth)
      );

      // Traditional 401k should result in lower federal taxes
      expect(resultTraditional.federalTaxAnnual).toBeLessThan(resultRoth.federalTaxAnnual);

      // Both should have same 401k deduction from net pay
      expect(resultTraditional.total401kMonthly).toBeCloseTo(resultRoth.total401kMonthly, 0);

      // But Roth should have higher net monthly since it's not pre-tax
      // Actually, both get the same net impact because Roth is post-tax
      // Let's verify the math: Roth 401k should result in even lower net than Traditional
      expect(resultRoth.netMonthly).toBeLessThan(resultTraditional.netMonthly);
    });

    it('should combine Traditional IRA and HSA pre-tax deductions', () => {
      const gross = 100000;
      const filing = 'single';

      const resultNoDeductions = federalIncomeTaxEstimate(gross, filing, 0, 0, 0);
      const resultBothDeductions = federalIncomeTaxEstimate(gross, filing, 0, 7000, 4150);

      // Both Traditional IRA and HSA should reduce taxes
      expect(resultBothDeductions).toBeLessThan(resultNoDeductions);

      // Tax savings should be proportional to the deductions
      const deductionsTotal = 7000 + 4150;
      const marginalRate = 0.22; // Approximate marginal rate for $100k single filer
      const expectedTaxSavings = deductionsTotal * marginalRate;
      const actualTaxSavings = resultNoDeductions - resultBothDeductions;

      // Allow some flexibility due to bracket boundaries
      expect(actualTaxSavings).toBeGreaterThan(expectedTaxSavings * 0.8);
      expect(actualTaxSavings).toBeLessThan(expectedTaxSavings * 1.2);
    });
  });
});
