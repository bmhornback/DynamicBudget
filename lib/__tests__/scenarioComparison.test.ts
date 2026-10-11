import { applyScenarioPreset, DEFAULT_INPUTS, SCENARIO_PRESETS } from '../defaultScenarios';
import {
  buildPresetComparisonId,
  buildSavedBudgetComparisonId,
  buildScenarioComparisonItems,
  getDefaultComparisonPresetIds,
  MAX_COMPARISON_PRESETS,
  normalizeComparisonPresetIds,
} from '../scenarioComparison';

describe('scenarioComparison', () => {
  it('normalizes preset ids by removing duplicates, invalid ids, and the active preset', () => {
    expect(
      normalizeComparisonPresetIds(
        [
          buildPresetComparisonId('living_with_parents'),
          buildPresetComparisonId('aggressive_saver'),
          buildPresetComparisonId('living_with_parents'),
          'missing',
          buildPresetComparisonId('aggressive_saver'),
        ],
        'aggressive_saver'
      )
    ).toEqual([
      buildPresetComparisonId('living_with_parents'),
    ]);
  });

  it('returns default comparison preset ids excluding the active preset', () => {
    const presetIds = getDefaultComparisonPresetIds('aggressive_saver');

    expect(presetIds).toHaveLength(1);
    expect(presetIds).not.toContain(buildPresetComparisonId('aggressive_saver'));
  });

  it('builds a current scenario plus selected comparison scenarios', () => {
    const items = buildScenarioComparisonItems(
      DEFAULT_INPUTS,
      [
        buildPresetComparisonId('living_with_parents'),
      ],
      'aggressive_saver'
    );

    expect(items).toHaveLength(2);
    expect(items[0].isCurrent).toBe(true);
    expect(items[0].name).toContain('Current');
    expect(items[1].id).toBe(buildPresetComparisonId('living_with_parents'));
    expect(items[1].takeHomeMonthly).toBeGreaterThan(0);
  });

  it('uses mortgage for homeowner scenarios and rent for renter scenarios', () => {
    const parentsPreset = SCENARIO_PRESETS.find((preset) => preset.id === 'living_with_parents');
    expect(parentsPreset).toBeDefined();

    const items = buildScenarioComparisonItems(
      {
        ...DEFAULT_INPUTS,
        housingMode: 'homeowner',
        rent: 1800,
        mortgagePayment: 2750,
      },
      [buildPresetComparisonId('living_with_parents')]
    );
    const parentsInputs = applyScenarioPreset(parentsPreset!.inputs);

    expect(items[0].housingMode).toBe('homeowner');
    expect(items[0].primaryHousingPayment).toBe(2750);
    expect(items[1].housingMode).toBe('renter');
    expect(items[1].primaryHousingPayment).toBe(parentsInputs.rent);
  });

  it('keeps saved budgets as valid comparison items and surfaces notes', () => {
    const savedBudget = {
      id: 'saved-1',
      name: 'Home Search 2027',
      note: 'Stretch scenario with a larger down payment target.',
      createdAt: '2026-09-15T00:00:00.000Z',
      inputs: {
        ...DEFAULT_INPUTS,
        housingMode: 'homeowner' as const,
        mortgagePayment: 3200,
        rent: 0,
      },
    };

    const comparisonIds = normalizeComparisonPresetIds(
      [buildPresetComparisonId('living_with_parents'), buildSavedBudgetComparisonId(savedBudget.id)],
      undefined,
      [savedBudget]
    );
    const items = buildScenarioComparisonItems(DEFAULT_INPUTS, comparisonIds, undefined, [savedBudget]);

    expect(items).toHaveLength(3);
    expect(items[2].id).toBe(buildSavedBudgetComparisonId(savedBudget.id));
    expect(items[2].sourceLabel).toBe('Saved budget');
    expect(items[2].note).toBe(savedBudget.note);
    expect(items[2].primaryHousingPayment).toBe(3200);
  });

  it('can normalize comparison salaries to match the current budget salary', () => {
    const currentInputs = { ...DEFAULT_INPUTS, annualSalary: 180000 };
    const items = buildScenarioComparisonItems(
      currentInputs,
      [buildPresetComparisonId('living_with_parents')],
      undefined,
      [],
      { normalizeAnnualSalary: true }
    );

    expect(items[1].annualSalary).toBe(180000);
  });
});
