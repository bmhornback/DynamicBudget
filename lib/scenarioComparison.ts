import type { BudgetHealthScore, BudgetInputs, StateOfResidence } from '@/types/budget';
import { calculateBudgetBreakdown } from './budgetCalculations';
import { calculateBudgetHealthScore } from './budgetHealthScore';
import { applyScenarioPreset, SCENARIO_PRESETS } from './defaultScenarios';

export const MAX_COMPARISON_PRESETS = 2;

export interface ScenarioComparisonItem {
  id: string;
  name: string;
  description: string;
  isCurrent: boolean;
  annualSalary: number;
  state: StateOfResidence;
  rent: number;
  takeHomeMonthly: number;
  totalAllocatedMonthly: number;
  remainingMonthlyBuffer: number;
  savingsRateGross: number;
  healthScore: BudgetHealthScore;
}

export function normalizeComparisonPresetIds(
  presetIds: string[],
  activePreset?: string
): string[] {
  const validPresetIds = new Set(SCENARIO_PRESETS.map((preset) => preset.id));
  const uniqueIds = Array.from(new Set(presetIds));

  return uniqueIds
    .filter((presetId) => presetId !== activePreset && validPresetIds.has(presetId))
    .slice(0, MAX_COMPARISON_PRESETS);
}

export function getDefaultComparisonPresetIds(activePreset?: string): string[] {
  return SCENARIO_PRESETS.filter((preset) => preset.id !== activePreset)
    .slice(0, MAX_COMPARISON_PRESETS)
    .map((preset) => preset.id);
}

export function buildScenarioComparisonItems(
  currentInputs: BudgetInputs,
  presetIds: string[],
  activePreset?: string
): ScenarioComparisonItem[] {
  const normalizedPresetIds = normalizeComparisonPresetIds(presetIds, activePreset);
  const activePresetConfig = activePreset
    ? SCENARIO_PRESETS.find((preset) => preset.id === activePreset)
    : undefined;

  const buildItem = (
    id: string,
    name: string,
    description: string,
    inputs: BudgetInputs,
    isCurrent: boolean
  ): ScenarioComparisonItem => {
    const breakdown = calculateBudgetBreakdown(inputs);

    return {
      id,
      name,
      description,
      isCurrent,
      annualSalary: inputs.annualSalary,
      state: inputs.state,
      rent: inputs.rent,
      takeHomeMonthly: breakdown.netMonthlyIncome,
      totalAllocatedMonthly: breakdown.totalAllocated,
      remainingMonthlyBuffer: breakdown.remainingMonthlyBuffer,
      savingsRateGross: breakdown.savingsRateGross,
      healthScore: calculateBudgetHealthScore(breakdown),
    };
  };

  const currentScenario = buildItem(
    activePreset ?? 'current_budget',
    activePresetConfig ? `${activePresetConfig.name} (Current)` : 'Current Budget',
    activePresetConfig?.description ?? 'Your current in-progress budget inputs.',
    currentInputs,
    true
  );

  const comparisonScenarios = normalizedPresetIds
    .map((presetId) => SCENARIO_PRESETS.find((preset) => preset.id === presetId))
    .filter((preset): preset is (typeof SCENARIO_PRESETS)[number] => Boolean(preset))
    .map((preset) =>
      buildItem(
        preset.id,
        preset.name,
        preset.description,
        applyScenarioPreset(preset.inputs),
        false
      )
    );

  return [currentScenario, ...comparisonScenarios];
}
