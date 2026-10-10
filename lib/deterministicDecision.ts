import type { DecisionPolicyProfile, Recommendation } from '@/types/budget';

export const DECISION_POLICY_VERSION = '2026.10.1';

type DecisionPolicyDefinition = {
  assumptions: readonly string[];
  scoreWeights: Record<string, number>;
  tieBreakers: readonly string[];
};

const DECISION_POLICY_DEFINITIONS: Record<DecisionPolicyProfile, DecisionPolicyDefinition> = {
  conservative: {
    assumptions: [
      'Prefer lower-risk recommendations when scores are within 5 points.',
      'Treat cash buffers as a hard constraint before discretionary investing.',
      'Favor debt reduction over optional growth when policy confidence is equal.',
    ],
    scoreWeights: {
      housing: 1.2,
      emergencyFund: 1.2,
      debt: 1.3,
      retirement: 1.0,
      flexibility: 0.9,
    },
    tieBreakers: ['severity', 'id'],
  },
  balanced: {
    assumptions: [
      'Use a neutral policy that balances cash flow, savings, and growth.',
      'Maintain a minimum monthly buffer before recommending additional saving or investing.',
      'When scores are tied, prefer the lower-risk option with the stronger near-term safety margin.',
    ],
    scoreWeights: {
      housing: 1.0,
      emergencyFund: 1.1,
      debt: 1.1,
      retirement: 1.0,
      flexibility: 1.0,
    },
    tieBreakers: ['severity', 'id'],
  },
  aggressive: {
    assumptions: [
      'Accept greater short-term volatility for faster wealth acceleration.',
      'Prioritize optional investing and aggressive goal funding ahead of cash buffer comfort.',
      'Use the same stable tie-breaker chain to keep ranking reproducible under riskier assumptions.',
    ],
    scoreWeights: {
      housing: 0.9,
      emergencyFund: 0.8,
      debt: 1.0,
      retirement: 1.3,
      flexibility: 1.2,
    },
    tieBreakers: ['severity', 'id'],
  },
};

export function getDeterministicDecisionPolicy(profile: DecisionPolicyProfile = 'balanced') {
  const definition = DECISION_POLICY_DEFINITIONS[profile];

  return {
    version: DECISION_POLICY_VERSION,
    profile,
    assumptions: [...definition.assumptions],
    scoreWeights: { ...definition.scoreWeights },
    tieBreakers: [...definition.tieBreakers],
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeDecisionInputs<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeDecisionInputs(item)) as T;
  }

  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .reduce((acc, key) => {
        const item = value[key];
        acc[key] = normalizeDecisionInputs(item);
        return acc;
      }, {} as Record<string, unknown>) as T;
  }

  if (typeof value === 'number' && !Number.isFinite(value)) {
    return 0 as T;
  }

  return value;
}

export function getDecisionInputSignature(inputs: unknown): string {
  return `${DECISION_POLICY_VERSION}:${JSON.stringify(normalizeDecisionInputs(inputs))}`;
}

export function sortRecommendationsDeterministically(recommendations: Recommendation[]): Recommendation[] {
  const severityWeight: Record<Recommendation['severity'], number> = {
    warning: 3,
    info: 2,
    success: 1,
  };

  return [...recommendations].sort((left, right) => {
    const leftPriority = severityWeight[left.severity] ?? 0;
    const rightPriority = severityWeight[right.severity] ?? 0;

    if (leftPriority !== rightPriority) {
      return rightPriority - leftPriority;
    }

    return (left.id ?? '').localeCompare(right.id ?? '');
  });
}

export function createDeterministicDecisionContract<T extends { id: string }>(
  profile: DecisionPolicyProfile = 'balanced',
  items: T[]
): { policy: ReturnType<typeof getDeterministicDecisionPolicy>; items: T[]; signature: string } {
  const policy = getDeterministicDecisionPolicy(profile);
  const orderedItems = [...items].sort((left, right) => {
    const leftPriority = (left as { severity?: Recommendation['severity'] }).severity
      ? (left as { severity: Recommendation['severity'] }).severity
      : 'info';
    const rightPriority = (right as { severity?: Recommendation['severity'] }).severity
      ? (right as { severity: Recommendation['severity'] }).severity
      : 'info';

    const severityWeight: Record<Recommendation['severity'], number> = {
      warning: 3,
      info: 2,
      success: 1,
    };

    if (severityWeight[leftPriority] !== severityWeight[rightPriority]) {
      return severityWeight[rightPriority] - severityWeight[leftPriority];
    }

    return left.id.localeCompare(right.id);
  });

  const signature = `${policy.version}:${policy.profile}:${JSON.stringify(
    orderedItems.map((item) => ({ id: item.id }))
  )}`;

  return { policy, items: orderedItems, signature };
}
