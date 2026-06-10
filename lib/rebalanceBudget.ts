/**
 * Budget rebalancing logic for MoveMath.
 * Adjusts unlocked flexible fields to bring the budget into balance.
 */

import type {
  BudgetInputs,
  RebalanceResult,
  RebalanceChange,
  RebalanceStrategy,
  SurplusAllocation,
} from '@/types/budget';
import { calculateBudgetBreakdown } from './budgetCalculations';

// Fields eligible for rebalancing, ordered by priority for reduction strategies
const LIFESTYLE_FIELDS: Array<keyof BudgetInputs> = [
  'funEntertainment',
  'diningOut',
  'travel',
  'personalSpending',
  'clothes',
  'subscriptions',
  'gifts',
  'miscBuffer',
];

const INVESTMENT_FIELDS: Array<keyof BudgetInputs> = [
  'taxableInvestments',
  'generalCashSavings',
];

const HOUSE_FUND_FIELDS: Array<keyof BudgetInputs> = ['houseDownPaymentContribution'];

const EMERGENCY_FUND_FIELDS: Array<keyof BudgetInputs> = ['emergencyFundContribution'];

const ALL_FLEXIBLE_FIELDS: Array<keyof BudgetInputs> = [
  ...LIFESTYLE_FIELDS,
  ...INVESTMENT_FIELDS,
  ...HOUSE_FUND_FIELDS,
  ...EMERGENCY_FUND_FIELDS,
  'extraDebtPayoff',
];

const FIELD_LABELS: Partial<Record<keyof BudgetInputs, string>> = {
  funEntertainment: 'Fun / Entertainment',
  diningOut: 'Dining Out',
  travel: 'Travel',
  personalSpending: 'Personal Spending',
  clothes: 'Clothes',
  subscriptions: 'Subscriptions',
  gifts: 'Gifts',
  miscBuffer: 'Misc Buffer',
  taxableInvestments: 'Taxable Investments',
  generalCashSavings: 'General Cash Savings',
  houseDownPaymentContribution: 'House Fund',
  emergencyFundContribution: 'Emergency Fund',
  extraDebtPayoff: 'Extra Debt Payoff',
  dogDaycare: 'Dog Daycare',
};

function isFieldLocked(inputs: BudgetInputs, fieldId: string): boolean {
  return inputs.lockedFields[fieldId] === true;
}

function getNumericValue(inputs: BudgetInputs, key: keyof BudgetInputs): number {
  const val = inputs[key];
  return typeof val === 'number' ? val : 0;
}

function cloneInputs(inputs: BudgetInputs): BudgetInputs {
  return {
    ...inputs,
    lockedFields: { ...inputs.lockedFields },
  };
}

/**
 * Reduce a list of fields proportionally to cover a deficit.
 * Returns updated inputs and changes made.
 */
function reduceFieldsProportionally(
  inputs: BudgetInputs,
  fields: Array<keyof BudgetInputs>,
  deficit: number
): { updatedInputs: BudgetInputs; changes: RebalanceChange[]; remaining: number } {
  const updated = cloneInputs(inputs);
  const changes: RebalanceChange[] = [];

  // Filter to unlocked fields with positive values
  const eligible = fields.filter(
    (f) => !isFieldLocked(updated, f as string) && getNumericValue(updated, f) > 0
  );

  if (eligible.length === 0) return { updatedInputs: updated, changes, remaining: deficit };

  const total = eligible.reduce((sum, f) => sum + getNumericValue(updated, f), 0);
  if (total === 0) return { updatedInputs: updated, changes, remaining: deficit };

  let actualReduced = 0;
  for (const field of eligible) {
    const current = getNumericValue(updated, field);
    const proportion = current / total;
    const reduction = Math.min(current, deficit * proportion);
    const newValue = Math.max(0, current - reduction);
    if (newValue !== current) {
      changes.push({
        fieldId: field as string,
        label: FIELD_LABELS[field] ?? (field as string),
        oldValue: current,
        newValue,
        delta: newValue - current,
      });
      (updated as unknown as Record<string, number>)[field as string] = newValue;
      actualReduced += current - newValue;
    }
  }

  return { updatedInputs: updated, changes, remaining: Math.max(0, deficit - actualReduced) };
}

/**
 * Reduce fields sequentially (first field first) until deficit is covered.
 */
function reduceFieldsSequentially(
  inputs: BudgetInputs,
  fields: Array<keyof BudgetInputs>,
  deficit: number
): { updatedInputs: BudgetInputs; changes: RebalanceChange[]; remaining: number } {
  const updated = cloneInputs(inputs);
  const changes: RebalanceChange[] = [];
  let remaining = deficit;

  for (const field of fields) {
    if (remaining <= 0) break;
    if (isFieldLocked(updated, field as string)) continue;
    const current = getNumericValue(updated, field);
    if (current <= 0) continue;
    const reduction = Math.min(current, remaining);
    const newValue = current - reduction;
    changes.push({
      fieldId: field as string,
      label: FIELD_LABELS[field] ?? (field as string),
      oldValue: current,
      newValue,
      delta: newValue - current,
    });
    (updated as unknown as Record<string, number>)[field as string] = newValue;
    remaining -= reduction;
  }

  return { updatedInputs: updated, changes, remaining };
}

/**
 * Add surplus to selected allocation targets.
 */
function allocateSurplus(
  inputs: BudgetInputs,
  surplus: number,
  allocation: SurplusAllocation
): { updatedInputs: BudgetInputs; changes: RebalanceChange[] } {
  const updated = cloneInputs(inputs);
  const changes: RebalanceChange[] = [];

  if (surplus <= 0) return { updatedInputs: updated, changes };

  const addTo = (field: keyof BudgetInputs, amount: number) => {
    const current = getNumericValue(updated, field);
    const newValue = current + amount;
    changes.push({
      fieldId: field as string,
      label: FIELD_LABELS[field] ?? (field as string),
      oldValue: current,
      newValue,
      delta: amount,
    });
    (updated as unknown as Record<string, number>)[field as string] = newValue;
  };

  switch (allocation) {
    case 'house_fund':
      addTo('houseDownPaymentContribution', surplus);
      break;
    case 'emergency_fund':
      addTo('emergencyFundContribution', surplus);
      break;
    case 'taxable_investments':
      addTo('taxableInvestments', surplus);
      break;
    case 'lifestyle':
      addTo('funEntertainment', surplus);
      break;
    case 'debt_payoff':
      addTo('extraDebtPayoff', surplus);
      break;
    case 'evenly_unlocked_savings': {
      const targets: Array<keyof BudgetInputs> = [
        'houseDownPaymentContribution',
        'emergencyFundContribution',
        'taxableInvestments',
        'generalCashSavings',
      ];
      const eligible = targets.filter((f) => !isFieldLocked(updated, f as string));
      if (eligible.length > 0) {
        const each = surplus / eligible.length;
        for (const f of eligible) addTo(f, each);
      }
      break;
    }
    case 'leave_as_buffer':
    default:
      // Do nothing — leave as buffer
      break;
  }

  return { updatedInputs: updated, changes };
}

/**
 * Main rebalance function.
 * Adjusts unlocked flexible fields to bring the budget into balance.
 */
export function rebalanceBudget(
  inputs: BudgetInputs,
  strategy: RebalanceStrategy,
  surplusAllocation: SurplusAllocation
): RebalanceResult {
  const breakdown = calculateBudgetBreakdown(inputs);

  // ── Handle surplus ────────────────────────────────────────────────────────
  if (!breakdown.isOverBudget && breakdown.surplus > 0.5) {
    if (strategy === 'recommendations_only') {
      return {
        updatedInputs: inputs,
        changes: [],
        newBuffer: breakdown.remainingMonthlyBuffer,
        success: true,
        message: `Budget has a surplus of $${breakdown.surplus.toFixed(0)}/month. No changes made (recommendations-only mode).`,
      };
    }

    const { updatedInputs, changes } = allocateSurplus(inputs, breakdown.surplus, surplusAllocation);
    return {
      updatedInputs,
      changes,
      newBuffer: 0,
      success: true,
      message:
        changes.length > 0
          ? `Allocated $${breakdown.surplus.toFixed(0)}/month surplus to ${surplusAllocation.replace(/_/g, ' ')}.`
          : `$${breakdown.surplus.toFixed(0)}/month left as monthly buffer.`,
    };
  }

  // ── Handle deficit ────────────────────────────────────────────────────────
  if (breakdown.isOverBudget) {
    const deficit = breakdown.deficit;

    if (strategy === 'recommendations_only') {
      return {
        updatedInputs: inputs,
        changes: [],
        newBuffer: breakdown.remainingMonthlyBuffer,
        success: false,
        message: `Budget is over by $${deficit.toFixed(0)}/month. No changes made (recommendations-only mode).`,
      };
    }

    let result: { updatedInputs: BudgetInputs; changes: RebalanceChange[]; remaining: number };

    switch (strategy) {
      case 'reduce_lifestyle_first':
        result = reduceFieldsSequentially(inputs, LIFESTYLE_FIELDS, deficit);
        if (result.remaining > 0) {
          // Fall through to investments if still over
          const r2 = reduceFieldsSequentially(result.updatedInputs, INVESTMENT_FIELDS, result.remaining);
          result = { ...r2, changes: [...result.changes, ...r2.changes] };
        }
        break;

      case 'reduce_investments_first':
        result = reduceFieldsSequentially(inputs, INVESTMENT_FIELDS, deficit);
        if (result.remaining > 0) {
          const r2 = reduceFieldsSequentially(result.updatedInputs, LIFESTYLE_FIELDS, result.remaining);
          result = { ...r2, changes: [...result.changes, ...r2.changes] };
        }
        break;

      case 'reduce_house_fund_first':
        result = reduceFieldsSequentially(inputs, HOUSE_FUND_FIELDS, deficit);
        if (result.remaining > 0) {
          const r2 = reduceFieldsSequentially(result.updatedInputs, INVESTMENT_FIELDS, result.remaining);
          result = { ...r2, changes: [...result.changes, ...r2.changes] };
          if (r2.remaining > 0) {
            const r3 = reduceFieldsSequentially(r2.updatedInputs, LIFESTYLE_FIELDS, r2.remaining);
            result = { ...r3, changes: [...result.changes, ...r3.changes] };
          }
        }
        break;

      case 'reduce_flexible_proportionally':
        result = reduceFieldsProportionally(inputs, ALL_FLEXIBLE_FIELDS, deficit);
        break;

      case 'reduce_non_required_proportionally':
      default:
        result = reduceFieldsProportionally(inputs, ALL_FLEXIBLE_FIELDS, deficit);
        break;
    }

    const newBreakdown = calculateBudgetBreakdown(result.updatedInputs);

    return {
      updatedInputs: result.updatedInputs,
      changes: result.changes,
      newBuffer: newBreakdown.remainingMonthlyBuffer,
      success: result.remaining <= 0.5,
      message:
        result.remaining > 0.5
          ? `Reduced all flexible categories but still $${result.remaining.toFixed(0)}/month over budget. Consider increasing income or reducing fixed expenses.`
          : `Rebalanced successfully. Budget is now balanced.`,
    };
  }

  return {
    updatedInputs: inputs,
    changes: [],
    newBuffer: breakdown.remainingMonthlyBuffer,
    success: true,
    message: 'Budget is already balanced.',
  };
}
