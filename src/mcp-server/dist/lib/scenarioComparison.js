"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAVED_BUDGET_COMPARISON_PREFIX = exports.PRESET_COMPARISON_PREFIX = exports.MAX_COMPARISON_PRESETS = void 0;
exports.buildPresetComparisonId = buildPresetComparisonId;
exports.buildSavedBudgetComparisonId = buildSavedBudgetComparisonId;
exports.parseComparisonId = parseComparisonId;
exports.normalizeComparisonPresetIds = normalizeComparisonPresetIds;
exports.getDefaultComparisonPresetIds = getDefaultComparisonPresetIds;
exports.buildScenarioComparisonItems = buildScenarioComparisonItems;
const budgetCalculations_1 = require("./budgetCalculations");
const budgetHealthScore_1 = require("./budgetHealthScore");
const defaultScenarios_1 = require("./defaultScenarios");
exports.MAX_COMPARISON_PRESETS = 2;
exports.PRESET_COMPARISON_PREFIX = 'preset:';
exports.SAVED_BUDGET_COMPARISON_PREFIX = 'saved:';
function buildPresetComparisonId(presetId) {
    return `${exports.PRESET_COMPARISON_PREFIX}${presetId}`;
}
function buildSavedBudgetComparisonId(budgetId) {
    return `${exports.SAVED_BUDGET_COMPARISON_PREFIX}${budgetId}`;
}
function parseComparisonId(comparisonId) {
    if (comparisonId.startsWith(exports.PRESET_COMPARISON_PREFIX)) {
        return { kind: 'preset', id: comparisonId.slice(exports.PRESET_COMPARISON_PREFIX.length) };
    }
    if (comparisonId.startsWith(exports.SAVED_BUDGET_COMPARISON_PREFIX)) {
        return { kind: 'saved', id: comparisonId.slice(exports.SAVED_BUDGET_COMPARISON_PREFIX.length) };
    }
    return null;
}
function normalizeComparisonPresetIds(comparisonIds, activePreset, savedBudgets = []) {
    const validPresetIds = new Set(defaultScenarios_1.SCENARIO_PRESETS.map((preset) => preset.id));
    const validSavedBudgetIds = new Set(savedBudgets.map((budget) => budget.id));
    const uniqueIds = Array.from(new Set(comparisonIds));
    return uniqueIds
        .filter((comparisonId) => {
        const parsed = parseComparisonId(comparisonId);
        if (!parsed)
            return false;
        if (parsed.kind === 'preset') {
            return parsed.id !== activePreset && validPresetIds.has(parsed.id);
        }
        return validSavedBudgetIds.has(parsed.id);
    })
        .slice(0, exports.MAX_COMPARISON_PRESETS);
}
function getDefaultComparisonPresetIds(activePreset) {
    return defaultScenarios_1.SCENARIO_PRESETS
        .filter((preset) => preset.id !== activePreset)
        .slice(0, exports.MAX_COMPARISON_PRESETS)
        .map((preset) => buildPresetComparisonId(preset.id));
}
function buildScenarioComparisonItems(currentInputs, comparisonIds, activePreset, savedBudgets = []) {
    const normalizedComparisonIds = normalizeComparisonPresetIds(comparisonIds, activePreset, savedBudgets);
    const activePresetConfig = activePreset
        ? defaultScenarios_1.SCENARIO_PRESETS.find((preset) => preset.id === activePreset)
        : undefined;
    const buildItem = (id, name, description, inputs, isCurrent, sourceLabel, note) => {
        const breakdown = (0, budgetCalculations_1.calculateBudgetBreakdown)(inputs);
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
            healthScore: (0, budgetHealthScore_1.calculateBudgetHealthScore)(breakdown),
        };
    };
    const currentScenario = buildItem('current_budget', activePresetConfig ? `${activePresetConfig.name} (Current)` : 'Current Budget', activePresetConfig?.description ?? 'Your current in-progress budget inputs.', currentInputs, true);
    const comparisonScenarios = normalizedComparisonIds
        .map((comparisonId) => {
        const parsed = parseComparisonId(comparisonId);
        if (!parsed)
            return null;
        if (parsed.kind === 'preset') {
            const preset = defaultScenarios_1.SCENARIO_PRESETS.find((item) => item.id === parsed.id);
            if (!preset)
                return null;
            return buildItem(comparisonId, preset.name, preset.description, (0, defaultScenarios_1.applyScenarioPreset)(preset.inputs), false, 'Preset');
        }
        const savedBudget = savedBudgets.find((budget) => budget.id === parsed.id);
        if (!savedBudget)
            return null;
        return buildItem(comparisonId, savedBudget.name, savedBudget.note?.trim() ? 'Saved budget snapshot with your planning note.' : 'Saved budget snapshot.', savedBudget.inputs, false, 'Saved budget', savedBudget.note);
    })
        .filter((item) => Boolean(item));
    return [currentScenario, ...comparisonScenarios];
}
