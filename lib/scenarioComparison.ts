import type { BudgetHealthScore, BudgetInputs, NamedBudget, StateOfResidence } from '@/types/budget';
import { calculateBudgetBreakdown } from './budgetCalculations';
import { calculateBudgetHealthScore } from './budgetHealthScore';
import { applyScenarioPreset, SCENARIO_PRESETS } from './defaultScenarios';

export const MAX_COMPARISON_PRESETS = 2;
export const PRESET_COMPARISON_PREFIX = 'preset:';
export const SAVED_BUDGET_COMPARISON_PREFIX = 'saved:';

export interface ScenarioComparisonItem {
  id: string;
  name: string;
  description: string;
  sourceLabel?: string;
  note?: string;
  isCurrent: boolean;
  annualSalary: number;
  state: StateOfResidence;
  housingMode: BudgetInputs['housingMode'];
  primaryHousingPayment: number;
  takeHomeMonthly: number;
  totalAllocatedMonthly: number;
  remainingMonthlyBuffer: number;
  savingsRateGross: number;
  healthScore: BudgetHealthScore;
}

type ComparisonSource =
  | { kind: 'preset'; id: string }
  | { kind: 'saved'; id: string };

export function buildPresetComparisonId(presetId: string): string {
  return `${PRESET_COMPARISON_PREFIX}${presetId}`;
}

export function buildSavedBudgetComparisonId(budgetId: string): string {
  return `${SAVED_BUDGET_COMPARISON_PREFIX}${budgetId}`;
}

export function parseComparisonId(comparisonId: string): ComparisonSource | null {
  if (comparisonId.startsWith(PRESET_COMPARISON_PREFIX)) {
    return { kind: 'preset', id: comparisonId.slice(PRESET_COMPARISON_PREFIX.length) };
  }

  if (comparisonId.startsWith(SAVED_BUDGET_COMPARISON_PREFIX)) {
    return { kind: 'saved', id: comparisonId.slice(SAVED_BUDGET_COMPARISON_PREFIX.length) };
  }

  return null;
}

export function normalizeComparisonPresetIds(
  comparisonIds: string[],
  activePreset?: string,
  savedBudgets: NamedBudget[] = []
): string[] {
  const validPresetIds = new Set(SCENARIO_PRESETS.map((preset) => preset.id));
  const validSavedBudgetIds = new Set(savedBudgets.map((budget) => budget.id));
  const uniqueIds = Array.from(new Set(comparisonIds));

  return uniqueIds
    .filter((comparisonId) => {
      const parsed = parseComparisonId(comparisonId);
      if (!parsed) return false;
      if (parsed.kind === 'preset') {
        return parsed.id !== activePreset && validPresetIds.has(parsed.id);
      }
      return validSavedBudgetIds.has(parsed.id);
    })
    .slice(0, MAX_COMPARISON_PRESETS);
}

export function getDefaultComparisonPresetIds(activePreset?: string): string[] {
  return SCENARIO_PRESETS
    .filter((preset) => preset.id !== activePreset)
    .slice(0, MAX_COMPARISON_PRESETS)
    .map((preset) => buildPresetComparisonId(preset.id));
}

export function buildScenarioComparisonItems(
  currentInputs: BudgetInputs,
  comparisonIds: string[],
  activePreset?: string,
  savedBudgets: NamedBudget[] = []
): ScenarioComparisonItem[] {
  const normalizedComparisonIds = normalizeComparisonPresetIds(comparisonIds, activePreset, savedBudgets);
  const activePresetConfig = activePreset
    ? SCENARIO_PRESETS.find((preset) => preset.id === activePreset)
    : undefined;

  const buildItem = (
    id: string,
    name: string,
    description: string,
    inputs: BudgetInputs,
    isCurrent: boolean,
    sourceLabel?: string,
    note?: string
  ): ScenarioComparisonItem => {
    const breakdown = calculateBudgetBreakdown(inputs);

    return {
      id,
      name,
      description,
      sourceLabel,
      note,
      isCurrent,
      annualSalary: inputs.annualSalary,
      state: inputs.state,
      housingMode: inputs.housingMode,
      primaryHousingPayment: inputs.housingMode === 'homeowner' ? inputs.mortgagePayment : inputs.rent,
      takeHomeMonthly: breakdown.netMonthlyIncome,
      totalAllocatedMonthly: breakdown.totalAllocated,
      remainingMonthlyBuffer: breakdown.remainingMonthlyBuffer,
      savingsRateGross: breakdown.savingsRateGross,
      healthScore: calculateBudgetHealthScore(breakdown),
    };
  };

  const currentScenario = buildItem(
    'current_budget',
    activePresetConfig ? `${activePresetConfig.name} (Current)` : 'Current Budget',
    activePresetConfig?.description ?? 'Your current in-progress budget inputs.',
    currentInputs,
    true
  );

  const comparisonScenarios = normalizedComparisonIds
    .map((comparisonId) => {
      const parsed = parseComparisonId(comparisonId);
      if (!parsed) return null;

      if (parsed.kind === 'preset') {
        const preset = SCENARIO_PRESETS.find((item) => item.id === parsed.id);
        if (!preset) return null;

        return buildItem(
          comparisonId,
          preset.name,
          preset.description,
          applyScenarioPreset(preset.inputs),
          false,
          'Preset'
        );
      }

      const savedBudget = savedBudgets.find((budget) => budget.id === parsed.id);
      if (!savedBudget) return null;

      return buildItem(
        comparisonId,
        savedBudget.name,
        savedBudget.note?.trim() ? 'Saved budget snapshot with your planning note.' : 'Saved budget snapshot.',
        savedBudget.inputs,
        false,
        'Saved budget',
        savedBudget.note
      );
    })
    .filter((item): item is ScenarioComparisonItem => Boolean(item));

  return [currentScenario, ...comparisonScenarios];
}
