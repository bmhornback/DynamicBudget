import { DEFAULT_INPUTS } from '../defaultScenarios';
import {
  buildScenarioComparisonItems,
  getDefaultComparisonPresetIds,
  MAX_COMPARISON_PRESETS,
  normalizeComparisonPresetIds,
} from '../scenarioComparison';

describe('scenarioComparison', () => {
  it('normalizes preset ids by removing duplicates, invalid ids, and the active preset', () => {
    expect(
      normalizeComparisonPresetIds(
        ['atlanta_baseline', 'tight_move', 'atlanta_baseline', 'missing', 'san_diego_baseline'],
        'san_diego_baseline'
      )
    ).toEqual(['atlanta_baseline', 'tight_move']);
  });

  it('returns default comparison preset ids excluding the active preset', () => {
    const presetIds = getDefaultComparisonPresetIds('san_diego_baseline');

    expect(presetIds).toHaveLength(MAX_COMPARISON_PRESETS);
    expect(presetIds).not.toContain('san_diego_baseline');
  });

  it('builds a current scenario plus selected comparison scenarios', () => {
    const items = buildScenarioComparisonItems(
      DEFAULT_INPUTS,
      ['atlanta_baseline', 'tight_move'],
      'san_diego_baseline'
    );

    expect(items).toHaveLength(3);
    expect(items[0].isCurrent).toBe(true);
    expect(items[0].name).toContain('Current');
    expect(items[1].id).toBe('atlanta_baseline');
    expect(items[2].id).toBe('tight_move');
    expect(items[1].takeHomeMonthly).toBeGreaterThan(0);
  });
});
