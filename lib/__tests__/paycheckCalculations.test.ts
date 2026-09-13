import {
  PAYCHECKS_PER_YEAR,
  monthlyToPaycheckMultiplier,
  toPerPaycheck,
  calculatePaycheckBreakdown,
  PAY_FREQUENCY_LABELS,
  PAY_FREQUENCY_SHORT_LABELS,
} from '../paycheckCalculations';
import type { BudgetBreakdown, BudgetInputs } from '@/types/budget';
import { DEFAULT_INPUTS } from '../defaultScenarios';

// --- PAYCHECKS_PER_YEAR ---
describe('PAYCHECKS_PER_YEAR', () => {
  it('weekly = 52', () => expect(PAYCHECKS_PER_YEAR.weekly).toBe(52));
  it('biweekly = 26', () => expect(PAYCHECKS_PER_YEAR.biweekly).toBe(26));
  it('semimonthly = 24', () => expect(PAYCHECKS_PER_YEAR.semimonthly).toBe(24));
  it('monthly = 12', () => expect(PAYCHECKS_PER_YEAR.monthly).toBe(12));
});

// --- monthlyToPaycheckMultiplier ---
describe('monthlyToPaycheckMultiplier', () => {
  it('weekly: 12/52', () => expect(monthlyToPaycheckMultiplier('weekly')).toBeCloseTo(12 / 52, 10));
  it('biweekly: 12/26', () => expect(monthlyToPaycheckMultiplier('biweekly')).toBeCloseTo(12 / 26, 10));
  it('semimonthly: 0.5', () => expect(monthlyToPaycheckMultiplier('semimonthly')).toBeCloseTo(0.5, 10));
  it('monthly: 1', () => expect(monthlyToPaycheckMultiplier('monthly')).toBe(1));
});

// --- toPerPaycheck ---
describe('toPerPaycheck', () => {
  it('converts monthly to monthly correctly', () => {
    expect(toPerPaycheck(1200, 'monthly')).toBe(1200);
  });
  it('semi-monthly halves the amount', () => {
    expect(toPerPaycheck(1200, 'semimonthly')).toBe(600);
  });
  it('biweekly is slightly less than semi-monthly (more paychecks)', () => {
    const bw = toPerPaycheck(1200, 'biweekly');
    expect(bw).toBeCloseTo(1200 * (12 / 26), 5);
    expect(bw).toBeLessThan(toPerPaycheck(1200, 'semimonthly'));
  });
  it('weekly is less than biweekly', () => {
    expect(toPerPaycheck(1200, 'weekly')).toBeLessThan(toPerPaycheck(1200, 'biweekly'));
  });
  it('zero stays zero', () => {
    expect(toPerPaycheck(0, 'biweekly')).toBe(0);
  });
});

// --- PAY_FREQUENCY_LABELS ---
describe('PAY_FREQUENCY_LABELS', () => {
  it('has entries for all four frequencies', () => {
    expect(Object.keys(PAY_FREQUENCY_LABELS)).toEqual(
      expect.arrayContaining(['weekly', 'biweekly', 'semimonthly', 'monthly'])
    );
  });
  it('each label is a non-empty string', () => {
    for (const label of Object.values(PAY_FREQUENCY_LABELS)) {
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

// --- PAY_FREQUENCY_SHORT_LABELS ---
describe('PAY_FREQUENCY_SHORT_LABELS', () => {
  it('has all four frequencies', () => {
    expect(Object.keys(PAY_FREQUENCY_SHORT_LABELS)).toEqual(
      expect.arrayContaining(['weekly', 'biweekly', 'semimonthly', 'monthly'])
    );
  });
});

// --- calculatePaycheckBreakdown ---

/** Minimal BudgetBreakdown for tests */
function makeBreakdown(overrides: Partial<BudgetBreakdown> = {}): BudgetBreakdown {
  const base: BudgetBreakdown = {
    grossMonthly: 10000,
    netMonthlyIncome: 7000,
    taxes: {
      grossAnnual: 120000,
      grossMonthly: 10000,
      federalAnnual: 18000,
      federalMonthly: 1500,
      stateAnnual: 6000,
      stateMonthly: 500,
      payrollAnnual: 9180,
      payrollMonthly: 765,
      totalTaxAnnual: 33180,
      totalTaxMonthly: 2765,
      effectiveTaxRate: 0.2765,
    },
    retirement: {
      monthly401k: 750,
      annual401k: 9000,
      is401kRoth: false,
      isMaxing401k: false,
      monthly401kCatchUp: 0,
      annual401kCatchUp: 0,
      monthlyEmployerMatch: 300,
      annualEmployerMatch: 3600,
      monthlyEmployerMatchCapped: 300,
      annualEmployerMatchCapped: 3600,
      monthlyIRA: 0,
      annualIRA: 0,
      iraType: 'traditional',
      isMaxingIRA: false,
      monthlyIRACatchUp: 0,
      annualIRACatchUp: 0,
      monthlyHSA: 0,
      annualHSA: 0,
      isMaxingHSA: false,
      totalMonthlyEmployee: 750,
      totalAnnualEmployee: 9000,
      retirementSavingsRate: 0.075,
      isSaving15Percent: false,
    },
    totalHousing: 3000,
    totalUtilities: 340,
    totalTransportation: 490,
    totalPets: 860,
    totalGroceriesFood: 1050,
    totalHealth: 200,
    totalLifestyle: 800,
    totalSavings: 2200,
    totalInvestments: 500,
    totalDebtPayoff: 0,
    calculatedSavingsFromPercentage: 0,
    effectiveEmergencyFundContribution: 500,
    effectiveHouseDownPaymentContribution: 1700,
    monthlyRothIRA: 0,
    monthlyHSA: 0,
    totalFixedExpenses: 5000,
    totalVariableExpenses: 2000,
    totalAllocated: 9000,
    remainingMonthlyBuffer: -2000,
    annualHouseFund: 20400,
    annualTaxableInvestments: 6000,
    totalAnnualSavingsIncludingRetirement: 28200,
    savingsRateGross: 0.235,
    savingsRateNet: 0.386,
    primaryHousingPaymentAsPercentGross: 0.3,
    primaryHousingPaymentAsPercentTakeHome: 0.429,
    petCostsAsPercentTakeHome: 0.123,
    carCostsAsPercentTakeHome: 0.07,
    essentialExpensesMonthly: 5900,
    emergencyFundTargetCalculated: 35400,
    isOverBudget: true,
    surplus: 0,
    deficit: 2000,
  };
  return { ...base, ...overrides };
}

function makeInputs(overrides: Partial<BudgetInputs> = {}): BudgetInputs {
  return { ...DEFAULT_INPUTS, ...overrides };
}

describe('calculatePaycheckBreakdown', () => {
  describe('frequency metadata', () => {
    it('monthly: paychecksPerYear=12, multiplier=1', () => {
      const b = calculatePaycheckBreakdown(makeInputs({ payFrequency: 'monthly' }), makeBreakdown());
      expect(b.paychecksPerYear).toBe(12);
      expect(b.grossPerPaycheck).toBeCloseTo(10000, 5);
      expect(b.netPerPaycheck).toBeCloseTo(7000, 5);
    });

    it('semimonthly: paychecksPerYear=24, net halved', () => {
      const b = calculatePaycheckBreakdown(makeInputs({ payFrequency: 'semimonthly' }), makeBreakdown());
      expect(b.paychecksPerYear).toBe(24);
      expect(b.netPerPaycheck).toBeCloseTo(3500, 5);
    });

    it('biweekly: paychecksPerYear=26', () => {
      const b = calculatePaycheckBreakdown(makeInputs({ payFrequency: 'biweekly' }), makeBreakdown());
      expect(b.paychecksPerYear).toBe(26);
      expect(b.netPerPaycheck).toBeCloseTo(7000 * (12 / 26), 5);
    });

    it('weekly: paychecksPerYear=52', () => {
      const b = calculatePaycheckBreakdown(makeInputs({ payFrequency: 'weekly' }), makeBreakdown());
      expect(b.paychecksPerYear).toBe(52);
      expect(b.netPerPaycheck).toBeCloseTo(7000 * (12 / 52), 5);
    });
  });

  describe('pre-tax deductions', () => {
    it('traditional 401k appears in preTaxDeductions', () => {
      const b = calculatePaycheckBreakdown(
        makeInputs({ payFrequency: 'monthly', is401kRoth: false }),
        makeBreakdown(),
      );
      const entry = b.preTaxDeductions.find((d) => d.label === '401(k) Traditional');
      expect(entry).toBeDefined();
      expect(entry!.perPaycheck).toBeCloseTo(750, 5);
    });

    it('roth 401k does NOT appear in preTaxDeductions', () => {
      const b = calculatePaycheckBreakdown(
        makeInputs({ payFrequency: 'monthly', is401kRoth: true }),
        makeBreakdown(),
      );
      const entry = b.preTaxDeductions.find((d) => d.label === '401(k) Traditional');
      expect(entry).toBeUndefined();
    });

    it('roth 401k appears in afterTaxRetirement', () => {
      const b = calculatePaycheckBreakdown(
        makeInputs({ payFrequency: 'monthly', is401kRoth: true }),
        makeBreakdown(),
      );
      const entry = b.afterTaxRetirement.find((d) => d.label === '401(k) Roth');
      expect(entry).toBeDefined();
    });

    it('netPerPaycheck equals netMonthlyIncome scaled to frequency (already net of all deductions)', () => {
      // breakdown.netMonthlyIncome is post-tax, post-401k (both Traditional and Roth),
      // post-HSA, post-IRA — no further deduction needed in paycheckCalculations.
      const traditional = calculatePaycheckBreakdown(
        makeInputs({ payFrequency: 'monthly', is401kRoth: false }),
        makeBreakdown(),
      );
      const roth = calculatePaycheckBreakdown(
        makeInputs({ payFrequency: 'monthly', is401kRoth: true }),
        makeBreakdown(),
      );
      // Both use the same mocked netMonthlyIncome = 7000; in real usage the tax engine
      // already accounts for the 401k type before producing netMonthlyIncome.
      expect(traditional.netPerPaycheck).toBeCloseTo(7000, 5);
      expect(roth.netPerPaycheck).toBeCloseTo(7000, 5);
    });

    it('HSA appears in preTaxDeductions when present', () => {
      const overrideRetirement = {
        ...makeBreakdown().retirement,
        monthlyHSA: 345,
        annualHSA: 4150,
        isMaxingHSA: false,
      };
      const b = calculatePaycheckBreakdown(
        makeInputs({ payFrequency: 'monthly' }),
        makeBreakdown({ retirement: overrideRetirement }),
      );
      const entry = b.preTaxDeductions.find((d) => d.label === 'HSA');
      expect(entry).toBeDefined();
      expect(entry!.perPaycheck).toBeCloseTo(345, 5);
    });

    it('no HSA entry when monthlyHSA=0', () => {
      const b = calculatePaycheckBreakdown(makeInputs({ payFrequency: 'monthly' }), makeBreakdown());
      expect(b.preTaxDeductions.find((d) => d.label === 'HSA')).toBeUndefined();
    });

    it('Traditional IRA appears in preTaxDeductions', () => {
      const overrideRetirement = {
        ...makeBreakdown().retirement,
        monthlyIRA: 500,
        annualIRA: 6000,
        iraType: 'traditional' as const,
        isMaxingIRA: false,
      };
      const b = calculatePaycheckBreakdown(
        makeInputs({ payFrequency: 'monthly' }),
        makeBreakdown({ retirement: overrideRetirement }),
      );
      const entry = b.preTaxDeductions.find((d) => d.label === 'IRA (Traditional)');
      expect(entry).toBeDefined();
      expect(entry!.perPaycheck).toBeCloseTo(500, 5);
      expect(b.afterTaxRetirement.find((d) => d.label === 'IRA (Roth)')).toBeUndefined();
    });

    it('Roth IRA appears in afterTaxRetirement, not preTaxDeductions', () => {
      const overrideRetirement = {
        ...makeBreakdown().retirement,
        monthlyIRA: 500,
        annualIRA: 6000,
        iraType: 'roth' as const,
        isMaxingIRA: false,
      };
      const b = calculatePaycheckBreakdown(
        makeInputs({ payFrequency: 'monthly' }),
        makeBreakdown({ retirement: overrideRetirement }),
      );
      const afterEntry = b.afterTaxRetirement.find((d) => d.label === 'IRA (Roth)');
      expect(afterEntry).toBeDefined();
      expect(afterEntry!.perPaycheck).toBeCloseTo(500, 5);
      expect(b.preTaxDeductions.find((d) => d.label === 'IRA (Traditional)')).toBeUndefined();
    });

    it('IRA catch-up is included in the IRA line item', () => {
      const overrideRetirement = {
        ...makeBreakdown().retirement,
        monthlyIRA: 500,
        annualIRA: 6000,
        monthlyIRACatchUp: 83.33,
        annualIRACatchUp: 1000,
        iraType: 'traditional' as const,
        isMaxingIRA: true,
      };
      const b = calculatePaycheckBreakdown(
        makeInputs({ payFrequency: 'monthly' }),
        makeBreakdown({ retirement: overrideRetirement }),
      );
      const entry = b.preTaxDeductions.find((d) => d.label === 'IRA (Traditional)');
      expect(entry).toBeDefined();
      expect(entry!.perPaycheck).toBeCloseTo(583.33, 2);
    });

    it('no IRA entry when monthlyIRA=0', () => {
      const b = calculatePaycheckBreakdown(makeInputs({ payFrequency: 'monthly' }), makeBreakdown());
      expect(b.preTaxDeductions.find((d) => d.label === 'IRA (Traditional)')).toBeUndefined();
      expect(b.afterTaxRetirement.find((d) => d.label === 'IRA (Roth)')).toBeUndefined();
    });
  });

  describe('taxes', () => {
    it('federal, state, and FICA show up', () => {
      const b = calculatePaycheckBreakdown(makeInputs({ payFrequency: 'monthly' }), makeBreakdown());
      const labels = b.taxes.map((t) => t.label);
      expect(labels).toContain('Federal Income Tax');
      expect(labels).toContain('State Income Tax');
      expect(labels).toContain('FICA (Social Security + Medicare)');
    });

    it('FICA is correct per paycheck (monthly)', () => {
      const b = calculatePaycheckBreakdown(makeInputs({ payFrequency: 'monthly' }), makeBreakdown());
      const fica = b.taxes.find((t) => t.label === 'FICA (Social Security + Medicare)');
      expect(fica!.perPaycheck).toBeCloseTo(765, 5);
    });

    it('zero-value state does not appear', () => {
      const bd = makeBreakdown();
      bd.taxes = { ...bd.taxes, stateMonthly: 0, stateAnnual: 0 };
      const b = calculatePaycheckBreakdown(makeInputs({ payFrequency: 'monthly' }), bd);
      expect(b.taxes.find((t) => t.label === 'State Income Tax')).toBeUndefined();
    });
  });

  describe('employer match', () => {
    it('present when monthlyEmployerMatch > 0', () => {
      const b = calculatePaycheckBreakdown(makeInputs({ payFrequency: 'monthly' }), makeBreakdown());
      expect(b.employerMatch).not.toBeNull();
      expect(b.employerMatch!.perPaycheck).toBeCloseTo(300, 5);
    });

    it('null when monthlyEmployerMatch = 0', () => {
      const overrideRetirement = { ...makeBreakdown().retirement, monthlyEmployerMatch: 0, annualEmployerMatch: 0 };
      const b = calculatePaycheckBreakdown(
        makeInputs({ payFrequency: 'monthly' }),
        makeBreakdown({ retirement: overrideRetirement }),
      );
      expect(b.employerMatch).toBeNull();
    });
  });

  describe('allocations', () => {
    it('contains housing, utilities, transportation, food, health, lifestyle, savings', () => {
      const b = calculatePaycheckBreakdown(makeInputs({ payFrequency: 'monthly' }), makeBreakdown());
      const labels = b.allocations.map((a) => a.label);
      expect(labels).toContain('Housing');
      expect(labels).toContain('Utilities');
      expect(labels).toContain('Transportation');
      expect(labels).toContain('Groceries & Food');
      expect(labels).toContain('Health');
      expect(labels).toContain('Lifestyle');
      expect(labels).toContain('Savings & Investments');
    });

    it('pets omitted when totalPets = 0', () => {
      const b = calculatePaycheckBreakdown(
        makeInputs({ payFrequency: 'monthly' }),
        makeBreakdown({ totalPets: 0 }),
      );
      expect(b.allocations.find((a) => a.label === 'Pets')).toBeUndefined();
    });

    it('pets included when totalPets > 0', () => {
      const b = calculatePaycheckBreakdown(makeInputs({ payFrequency: 'monthly' }), makeBreakdown());
      expect(b.allocations.find((a) => a.label === 'Pets')).toBeDefined();
    });

    it('debt payoff omitted when totalDebtPayoff = 0', () => {
      const b = calculatePaycheckBreakdown(makeInputs({ payFrequency: 'monthly' }), makeBreakdown());
      expect(b.allocations.find((a) => a.label === 'Debt Payoff')).toBeUndefined();
    });

    it('debt payoff included when totalDebtPayoff > 0', () => {
      const b = calculatePaycheckBreakdown(
        makeInputs({ payFrequency: 'monthly' }),
        makeBreakdown({ totalDebtPayoff: 500 }),
      );
      expect(b.allocations.find((a) => a.label === 'Debt Payoff')).toBeDefined();
    });

    it('housing scales correctly for semi-monthly', () => {
      const b = calculatePaycheckBreakdown(makeInputs({ payFrequency: 'semimonthly' }), makeBreakdown());
      const housing = b.allocations.find((a) => a.label === 'Housing');
      expect(housing!.perPaycheck).toBeCloseTo(1500, 5);
    });
  });

  describe('buffer', () => {
    it('reflects remainingMonthlyBuffer scaled to frequency', () => {
      const b = calculatePaycheckBreakdown(makeInputs({ payFrequency: 'monthly' }), makeBreakdown());
      expect(b.bufferPerPaycheck).toBeCloseTo(-2000, 5);
    });

    it('positive buffer when not over budget', () => {
      const b = calculatePaycheckBreakdown(
        makeInputs({ payFrequency: 'monthly' }),
        makeBreakdown({ remainingMonthlyBuffer: 500 }),
      );
      expect(b.bufferPerPaycheck).toBeCloseTo(500, 5);
    });
  });
});
