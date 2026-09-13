import { DEFAULT_INPUTS } from '../defaultScenarios';
import {
  getColiIndex,
  getColiTierLabel,
  calculatePurchasingPower,
  adjustExpensesForColi,
  COLI_INDEX,
} from '../coliData';

describe('coliData', () => {
  describe('COLI_INDEX', () => {
    it('covers all 50 states + DC + no_state_tax (52 entries total)', () => {
      expect(Object.keys(COLI_INDEX).length).toBe(52);
    });

    it('has all indices as positive numbers', () => {
      for (const [state, index] of Object.entries(COLI_INDEX)) {
        expect(typeof index).toBe('number');
        expect(index).toBeGreaterThan(0);
        expect(state.length).toBeGreaterThan(0);
      }
    });

    it('Hawaii is the most expensive', () => {
      const maxState = Object.entries(COLI_INDEX).reduce((a, b) => (b[1] > a[1] ? b : a));
      expect(maxState[0]).toBe('HI');
    });

    it('Mississippi is the most affordable', () => {
      const minState = Object.entries(COLI_INDEX).reduce((a, b) => (b[1] < a[1] ? b : a));
      expect(minState[0]).toBe('MS');
    });

    it('California index is above 140', () => {
      expect(COLI_INDEX['CA']).toBeGreaterThan(140);
    });

    it('Georgia index is below 100', () => {
      expect(COLI_INDEX['GA']).toBeLessThan(100);
    });
  });

  describe('getColiIndex', () => {
    it('returns the correct index for known states', () => {
      expect(getColiIndex('CA')).toBe(COLI_INDEX['CA']);
      expect(getColiIndex('GA')).toBe(COLI_INDEX['GA']);
      expect(getColiIndex('no_state_tax')).toBe(100);
    });
  });

  describe('getColiTierLabel', () => {
    it('returns Very Affordable for index < 90', () => {
      expect(getColiTierLabel(85)).toBe('Very Affordable');
      expect(getColiTierLabel(89.9)).toBe('Very Affordable');
    });

    it('returns Affordable for 90 <= index < 100', () => {
      expect(getColiTierLabel(90)).toBe('Affordable');
      expect(getColiTierLabel(95)).toBe('Affordable');
    });

    it('returns Average for 100 <= index < 110', () => {
      expect(getColiTierLabel(100)).toBe('Average');
      expect(getColiTierLabel(105)).toBe('Average');
    });

    it('returns Above Average for 110 <= index < 125', () => {
      expect(getColiTierLabel(110)).toBe('Above Average');
      expect(getColiTierLabel(120)).toBe('Above Average');
    });

    it('returns Expensive for 125 <= index < 150', () => {
      expect(getColiTierLabel(125)).toBe('Expensive');
      expect(getColiTierLabel(134)).toBe('Expensive');
    });

    it('returns Very Expensive for index >= 150', () => {
      expect(getColiTierLabel(150)).toBe('Very Expensive');
      expect(getColiTierLabel(186)).toBe('Very Expensive');
    });
  });

  describe('calculatePurchasingPower', () => {
    it('returns the same salary when states are identical', () => {
      expect(calculatePurchasingPower(100_000, 'CA', 'CA')).toBe(100_000);
    });

    it('returns a higher equivalent when moving to a more expensive state', () => {
      const result = calculatePurchasingPower(100_000, 'GA', 'CA');
      expect(result).toBeGreaterThan(100_000);
    });

    it('returns a lower equivalent when moving to a cheaper state', () => {
      const result = calculatePurchasingPower(100_000, 'CA', 'GA');
      expect(result).toBeLessThan(100_000);
    });

    it('applies the COLI ratio correctly', () => {
      const fromIndex = getColiIndex('GA'); // ~92.5
      const toIndex = getColiIndex('CA');   // ~151.7
      const expected = Math.round(100_000 * (toIndex / fromIndex));
      expect(calculatePurchasingPower(100_000, 'GA', 'CA')).toBe(expected);
    });

    it('returns integer values', () => {
      const result = calculatePurchasingPower(123_456, 'TX', 'NY');
      expect(result).toBe(Math.round(result));
    });
  });

  describe('adjustExpensesForColi', () => {
    it('returns empty object when states are the same', () => {
      const result = adjustExpensesForColi(DEFAULT_INPUTS, 'GA', 'GA');
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('scales rent upward when moving to a more expensive state', () => {
      const inputs = { ...DEFAULT_INPUTS, rent: 1000 };
      const result = adjustExpensesForColi(inputs, 'GA', 'CA');
      expect(result.rent).toBeDefined();
      expect(result.rent!).toBeGreaterThan(1000);
    });

    it('scales rent downward when moving to a cheaper state', () => {
      const inputs = { ...DEFAULT_INPUTS, rent: 2000 };
      const result = adjustExpensesForColi(inputs, 'CA', 'GA');
      expect(result.rent).toBeDefined();
      expect(result.rent!).toBeLessThan(2000);
    });

    it('clamps all values to >= 0', () => {
      const inputs = { ...DEFAULT_INPUTS, rent: 0, groceries: 0 };
      const result = adjustExpensesForColi(inputs, 'GA', 'CA');
      for (const value of Object.values(result)) {
        if (typeof value === 'number') {
          expect(value).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('does not modify income fields', () => {
      const result = adjustExpensesForColi(DEFAULT_INPUTS, 'GA', 'CA');
      expect(result.annualSalary).toBeUndefined();
      expect(result.retirementContributionPercent).toBeUndefined();
      expect(result.emergencyFundContribution).toBeUndefined();
    });

    it('does not modify fixed debt fields', () => {
      const result = adjustExpensesForColi(DEFAULT_INPUTS, 'GA', 'CA');
      expect(result.carPayment).toBeUndefined();
      expect(result.extraDebtPayoff).toBeUndefined();
    });

    it('scales multiple expense categories', () => {
      const inputs = {
        ...DEFAULT_INPUTS,
        rent: 1500,
        groceries: 400,
        electric: 100,
        carInsurance: 120,
      };
      const result = adjustExpensesForColi(inputs, 'GA', 'CA');
      expect(result.rent).toBeDefined();
      expect(result.groceries).toBeDefined();
      expect(result.electric).toBeDefined();
      expect(result.carInsurance).toBeDefined();
    });
  });
});
