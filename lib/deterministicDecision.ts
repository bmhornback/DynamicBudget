import type { DecisionPolicyProfile, Recommendation } from '@/types/budget';

export const DECISION_POLICY_VERSION = '2026.10.1';

type DecisionPolicyDefinition = {
  assumptions: readonly string[];
  scoreWeights: Record<string, number>;
  tieBreakers: readonly string[];
};

const DECISION_SEVERITY_WEIGHT: Record<Recommendation['severity'], number> = {
  warning: 3,
  info: 2,
  success: 1,
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

function compareStrings(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

/**
 * Normalizes a decision input tree into a deterministic value ordering.
 *
 * Non-finite numeric values are treated as zero so they remain JSON-serializable
 * and do not produce unstable signatures across runs. This intentionally keeps
 * invalid numeric inputs from breaking the signature generation path.
 */
export function normalizeDecisionInputs<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeDecisionInputs(item)) as T;
  }

  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort(compareStrings)
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

export function getDecisionInputSignature(
  inputs: unknown,
  profile: DecisionPolicyProfile = 'balanced'
): string {
  const policy = getDeterministicDecisionPolicy(profile);

  return `${policy.version}:${JSON.stringify(
    normalizeDecisionInputs({
      profile: policy.profile,
      scoreWeights: policy.scoreWeights,
      inputs,
    })
  )}`;
}

export function sortRecommendationsDeterministically(recommendations: Recommendation[]): Recommendation[] {
  return [...recommendations].sort((left, right) => {
    const leftPriority = DECISION_SEVERITY_WEIGHT[left.severity ?? 'info'];
    const rightPriority = DECISION_SEVERITY_WEIGHT[right.severity ?? 'info'];

    if (leftPriority !== rightPriority) {
      return rightPriority - leftPriority;
    }

    return compareStrings(left.id ?? '', right.id ?? '');
  });
}

export function createDeterministicDecisionContract<T extends { id: string }>(
  items: T[],
  profile: DecisionPolicyProfile = 'balanced'
): { policy: ReturnType<typeof getDeterministicDecisionPolicy>; items: T[]; signature: string } {
  const policy = getDeterministicDecisionPolicy(profile);
  const orderedItems = [...items].sort((left, right) => {
    const leftPriority = DECISION_SEVERITY_WEIGHT[(left as { severity?: Recommendation['severity'] }).severity ?? 'info'];
    const rightPriority = DECISION_SEVERITY_WEIGHT[(right as { severity?: Recommendation['severity'] }).severity ?? 'info'];

    if (leftPriority !== rightPriority) {
      return rightPriority - leftPriority;
    }

    return compareStrings(left.id, right.id);
  });

  const signature = getDecisionInputSignature({
    profile: policy.profile,
    scoreWeights: policy.scoreWeights,
    items: orderedItems,
  }, profile);

  return { policy, items: orderedItems, signature };
}
