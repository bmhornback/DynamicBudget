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
          buildPresetComparisonId('atlanta_baseline'),
          buildPresetComparisonId('tight_move'),
          buildPresetComparisonId('atlanta_baseline'),
          'missing',
          buildPresetComparisonId('san_diego_baseline'),
        ],
        'san_diego_baseline'
      )
    ).toEqual([
      buildPresetComparisonId('atlanta_baseline'),
      buildPresetComparisonId('tight_move'),
    ]);
  });

  it('returns default comparison preset ids excluding the active preset', () => {
    const presetIds = getDefaultComparisonPresetIds('san_diego_baseline');

    expect(presetIds).toHaveLength(MAX_COMPARISON_PRESETS);
    expect(presetIds).not.toContain(buildPresetComparisonId('san_diego_baseline'));
  });

  it('builds a current scenario plus selected comparison scenarios', () => {
    const items = buildScenarioComparisonItems(
      DEFAULT_INPUTS,
      [
        buildPresetComparisonId('atlanta_baseline'),
        buildPresetComparisonId('tight_move'),
      ],
      'san_diego_baseline'
    );

    expect(items).toHaveLength(3);
    expect(items[0].isCurrent).toBe(true);
    expect(items[0].name).toContain('Current');
    expect(items[1].id).toBe(buildPresetComparisonId('atlanta_baseline'));
    expect(items[2].id).toBe(buildPresetComparisonId('tight_move'));
    expect(items[1].takeHomeMonthly).toBeGreaterThan(0);
  });

  it('uses mortgage for homeowner scenarios and rent for renter scenarios', () => {
    const atlantaBaseline = SCENARIO_PRESETS.find((preset) => preset.id === 'atlanta_baseline');
    expect(atlantaBaseline).toBeDefined();

    const items = buildScenarioComparisonItems(
      {
        ...DEFAULT_INPUTS,
        housingMode: 'homeowner',
        rent: 1800,
        mortgagePayment: 2750,
      },
      [buildPresetComparisonId('atlanta_baseline')]
    );
    const atlantaInputs = applyScenarioPreset(atlantaBaseline!.inputs);

    expect(items[0].housingMode).toBe('homeowner');
    expect(items[0].primaryHousingPayment).toBe(2750);
    expect(items[1].housingMode).toBe('renter');
    expect(items[1].primaryHousingPayment).toBe(atlantaInputs.rent);
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
      [buildPresetComparisonId('atlanta_baseline'), buildSavedBudgetComparisonId(savedBudget.id)],
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
});
