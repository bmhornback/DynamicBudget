import {
  createDeterministicDecisionContract,
  getDecisionInputSignature,
  getDeterministicDecisionPolicy,
  sortRecommendationsDeterministically,
} from '../deterministicDecision';

describe('deterministicDecision', () => {
  it('uses a versioned policy contract with stable tie-breakers', () => {
    const policy = getDeterministicDecisionPolicy('balanced');

    expect(policy.version).toBe('2026.10.1');
    expect(policy.profile).toBe('balanced');
    expect(policy.tieBreakers).toEqual(['severity', 'id']);
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

    expect(getDecisionInputSignature(first)).toBe(getDecisionInputSignature(second));
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

    const contractA = createDeterministicDecisionContract('balanced', itemsA);
    const contractB = createDeterministicDecisionContract('balanced', itemsB);

    expect(contractA.items.map((item) => item.id)).toEqual(['goal-2', 'goal-3', 'goal-1']);
    expect(contractA.signature).toBe(contractB.signature);
  });
});
