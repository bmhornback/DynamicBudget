import {
  createDeterministicDecisionContract,
  createScenarioRankingContract,
  getDecisionInputSignature,
  getDeterministicDecisionPolicy,
  rankScenarioOptions,
  sortRecommendationsDeterministically,
} from '../deterministicDecision';

describe('deterministicDecision', () => {
  it('uses a versioned policy contract with stable tie-breakers', () => {
    const policy = getDeterministicDecisionPolicy('balanced');
    const conservative = getDeterministicDecisionPolicy('conservative');
    const aggressive = getDeterministicDecisionPolicy('aggressive');

    expect(policy.version).toBe('2026.10.1');
    expect(policy.profile).toBe('balanced');
    expect(policy.tieBreakers).toEqual(['severity', 'id']);
    expect(conservative.profile).toBe('conservative');
    expect(aggressive.profile).toBe('aggressive');
    expect(conservative.scoreWeights.housing).toBeGreaterThan(0);
    expect(aggressive.scoreWeights.retirement).toBeGreaterThan(policy.scoreWeights.retirement);
  });

  it('normalizes equivalent inputs to the same deterministic signature', () => {
    const first = {
      annualSalary: 200000,
      state: 'CA',
      decisions: { debt: 18, emergencyFund: 250 },
      flags: { aggressive: true, balanced: false },
    };
    const second = {
      flags: { balanced: false, aggressive: true },
      decisions: { emergencyFund: 250, debt: 18 },
      state: 'CA',
      annualSalary: 200000,
    };

    expect(getDecisionInputSignature(first, 'balanced')).toBe(getDecisionInputSignature(second, 'balanced'));
    expect(getDecisionInputSignature(first, 'balanced')).not.toBe(getDecisionInputSignature(first, 'aggressive'));
  });

  it('orders recommendations deterministically by severity then id', () => {
    const recommendations = [
      { id: 'warning-b', severity: 'warning' as const, message: 'Warning B' },
      { id: 'info-a', severity: 'info' as const, message: 'Info A' },
      { id: 'warning-a', severity: 'warning' as const, message: 'Warning A' },
      { id: 'success-c', severity: 'success' as const, message: 'Success C' },
    ];

    expect(sortRecommendationsDeterministically(recommendations).map((item) => item.id)).toEqual([
      'warning-a',
      'warning-b',
      'info-a',
      'success-c',
    ]);
  });

  it('creates a stable decision contract across equivalent recommendation orderings', () => {
    const itemsA = [
      { id: 'goal-2', severity: 'warning' as const, message: 'goal 2' },
      { id: 'goal-1', severity: 'info' as const, message: 'goal 1' },
      { id: 'goal-3', severity: 'warning' as const, message: 'goal 3' },
    ];
    const itemsB = [
      { id: 'goal-3', severity: 'warning' as const, message: 'goal 3' },
      { id: 'goal-1', severity: 'info' as const, message: 'goal 1' },
      { id: 'goal-2', severity: 'warning' as const, message: 'goal 2' },
    ];

    const contractA = createDeterministicDecisionContract(itemsA, 'balanced');
    const contractB = createDeterministicDecisionContract(itemsB, 'balanced');

    expect(contractA.items.map((item) => item.id)).toEqual(['goal-2', 'goal-3', 'goal-1']);
    expect(contractA.signature).toBe(contractB.signature);
  });

  it('defaults missing recommendation severities to info while preserving deterministic ordering', () => {
    const items = [
      { id: 'goal-2', message: 'goal 2' },
      { id: 'goal-1', severity: 'warning' as const, message: 'goal 1' },
      { id: 'goal-3', message: 'goal 3' },
    ];

    const contract = createDeterministicDecisionContract(items, 'balanced');

    expect(contract.items.map((item) => item.id)).toEqual(['goal-1', 'goal-2', 'goal-3']);
  });

  it('exposes explicit policy confidence bands and JEV score traces', () => {
    const items = [
      { id: 'debt', severity: 'warning' as const, score: 14, message: 'pay down debt' },
      { id: 'retirement', severity: 'success' as const, score: 8, message: 'increase retirement' },
    ];

    const contract = createDeterministicDecisionContract(items, 'balanced');

    expect(contract.policy.confidenceRange).toEqual([0.59, 0.75]);
    expect(contract.trace.confidenceRange).toEqual([0.59, 0.75]);
    expect(contract.trace.assumptions).toEqual(contract.policy.assumptions);
    expect(contract.trace.judgmentScore).toBeGreaterThan(0);
    expect(contract.trace.totalScore).toBeGreaterThan(0);
    expect(contract.trace.jevScore).toBeGreaterThan(0);
    expect(contract.trace.expectedValue).toBeGreaterThan(0);
    expect(contract.trace.expectedValue).not.toBeCloseTo(contract.trace.judgmentScore, 4);
    expect(contract.trace.jevScore).toBeCloseTo(19.6745, 3);
    expect(contract.trace.rationale).toContain('JEV score');
  });

  it('preserves duplicate recommendation IDs without overwriting score entries', () => {
    const items = [
      { id: 'goal', severity: 'warning' as const, score: 12, message: 'first' },
      { id: 'goal', severity: 'info' as const, score: 7, message: 'second' },
      { id: 'other', severity: 'success' as const, score: 5, message: 'third' },
    ];

    const trace = createDeterministicDecisionContract(items, 'balanced').trace;

    expect(trace.scoreBreakdown).toHaveLength(3);
    expect(trace.scoreBreakdown.map((entry) => entry.id)).toEqual(['goal', 'goal', 'other']);
    expect(trace.scoreBreakdown[0].score).toBeGreaterThan(trace.scoreBreakdown[1].score);
    expect(trace.totalScore).toBeGreaterThan(0);
  });

  it('keeps JEV scoring deterministic across equivalent input orderings', () => {
    const first = [
      { id: 'move', severity: 'warning' as const, score: 18, message: 'move to lower cost state' },
      { id: 'invest', severity: 'info' as const, score: 11, message: 'invest in taxable account' },
    ];
    const second = [
      { id: 'invest', severity: 'info' as const, score: 11, message: 'invest in taxable account' },
      { id: 'move', severity: 'warning' as const, score: 18, message: 'move to lower cost state' },
    ];

    const contractA = createDeterministicDecisionContract(first, 'aggressive');
    const contractB = createDeterministicDecisionContract(second, 'aggressive');

    expect(contractA.signature).toBe(contractB.signature);
    expect(contractA.trace.totalScore).toBe(contractB.trace.totalScore);
  });

  it('ranks scenario options deterministically with weighted dimensions', () => {
    const options = [
      { id: 'stay', name: 'Stay in California', severity: 'info' as const, housing: 10, emergencyFund: 6, debt: 4, retirement: 7, flexibility: 8 },
      { id: 'move', name: 'Move to Texas', severity: 'info' as const, housing: 30, emergencyFund: 20, debt: 15, retirement: 18, flexibility: 20 },
    ];

    const ranked = rankScenarioOptions(options, (item) => ({
      housing: item.housing,
      emergencyFund: item.emergencyFund,
      debt: item.debt,
      retirement: item.retirement,
      flexibility: item.flexibility,
      total: item.housing + item.emergencyFund + item.debt + item.retirement + item.flexibility,
    }), 'balanced');

    expect(ranked.map((entry) => entry.id)).toEqual(['move', 'stay']);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].weightedTotal).toBeGreaterThan(ranked[1].weightedTotal);
    expect(ranked[0].dimensionBreakdown.housing).toBeGreaterThan(ranked[1].dimensionBreakdown.housing);
    expect(ranked[0].weightedTotal).toBe(106.5);
    expect(ranked[1].weightedTotal).toBe(36);
  });

  it('creates a deterministic scenario ranking contract with a stable signature', () => {
    const first = [
      { id: 'stay', name: 'Stay in California', housing: 10, emergencyFund: 6, debt: 4, retirement: 7, flexibility: 8 },
      { id: 'move', name: 'Move to Texas', housing: 30, emergencyFund: 20, debt: 15, retirement: 18, flexibility: 20 },
    ];
    const second = [
      { id: 'move', name: 'Move to Texas', housing: 30, emergencyFund: 20, debt: 15, retirement: 18, flexibility: 20 },
      { id: 'stay', name: 'Stay in California', housing: 10, emergencyFund: 6, debt: 4, retirement: 7, flexibility: 8 },
    ];

    const contractA = createScenarioRankingContract(first, (item) => ({
      housing: item.housing,
      emergencyFund: item.emergencyFund,
      debt: item.debt,
      retirement: item.retirement,
      flexibility: item.flexibility,
      total: item.housing + item.emergencyFund + item.debt + item.retirement + item.flexibility,
    }), 'balanced');
    const contractB = createScenarioRankingContract(second, (item) => ({
      housing: item.housing,
      emergencyFund: item.emergencyFund,
      debt: item.debt,
      retirement: item.retirement,
      flexibility: item.flexibility,
      total: item.housing + item.emergencyFund + item.debt + item.retirement + item.flexibility,
    }), 'balanced');

    expect(contractA.signature).toBe(contractB.signature);
    expect(contractA.ranked.map((entry) => entry.id)).toEqual(['move', 'stay']);
    expect(contractA.trace.jevScore).toBeGreaterThan(0);
  });
});
