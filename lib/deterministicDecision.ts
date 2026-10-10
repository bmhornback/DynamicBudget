import type { DecisionPolicyProfile, DecisionTrace, Recommendation } from '@/types/budget';

export const DECISION_POLICY_VERSION = '2026.10.1';

type DecisionPolicyDefinition = {
  assumptions: readonly string[];
  scoreWeights: Record<string, number>;
  tieBreakers: readonly string[];
  confidenceRange: readonly [number, number];
};

const DECISION_SEVERITY_WEIGHT: Record<Recommendation['severity'], number> = {
  warning: 3,
  info: 2,
  success: 1,
};

const JEV_JUDGMENT_WEIGHT = 0.6;
const JEV_EXPECTED_VALUE_WEIGHT = 0.4;
const EXPECTED_VALUE_CONFIDENCE_BASE = 0.5;
const SEVERITY_SCORE_SCALE = 10;
const POLICY_DIMENSION_KEYS = ['housing', 'emergencyFund', 'debt', 'retirement', 'flexibility'] as const;

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
    confidenceRange: [0.68, 0.84],
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
    confidenceRange: [0.59, 0.75],
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
    confidenceRange: [0.47, 0.66],
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
    confidenceRange: [...definition.confidenceRange] as [number, number],
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

export function scoreDecisionItem(
  item: { id: string; severity?: Recommendation['severity']; score?: number; weight?: number },
  profile: DecisionPolicyProfile = 'balanced'
): number {
  const policy = getDeterministicDecisionPolicy(profile);
  const severityWeight = DECISION_SEVERITY_WEIGHT[item.severity ?? 'info'];
  const baseValue = Number.isFinite(item.score) ? Number(item.score) : 0;
  const weight = Number.isFinite(item.weight) ? Number(item.weight) : 1;

  // The JEV model intentionally averages the policy's core decision dimensions so
  // each scoring pass reflects the active risk posture without over-weighting a
  // single factor. Extra policy keys remain available for future use but do not
  // alter this base scoring function unless the dimension set is expanded.
  const dimensionWeight = POLICY_DIMENSION_KEYS.reduce((sum, key) => {
    const candidate = Number(policy.scoreWeights[key] ?? 1);
    return sum + candidate;
  }, 0) / POLICY_DIMENSION_KEYS.length;

  return Number((baseValue * dimensionWeight * weight + severityWeight * SEVERITY_SCORE_SCALE).toFixed(4));
}

export function calculateJevScore(
  judgmentScore: number,
  expectedValue: number,
  confidence: number,
  profile: DecisionPolicyProfile = 'balanced'
): number {
  const policy = getDeterministicDecisionPolicy(profile);
  const normalizedConfidence = Math.min(Math.max(confidence, policy.confidenceRange[0]), policy.confidenceRange[1]);

  return Number(((judgmentScore * JEV_JUDGMENT_WEIGHT + expectedValue * JEV_EXPECTED_VALUE_WEIGHT) * normalizedConfidence).toFixed(4));
}

function sortDecisionItems<T extends { id: string; severity?: Recommendation['severity'] }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const leftPriority = DECISION_SEVERITY_WEIGHT[(left as { severity?: Recommendation['severity'] }).severity ?? 'info'];
    const rightPriority = DECISION_SEVERITY_WEIGHT[(right as { severity?: Recommendation['severity'] }).severity ?? 'info'];

    if (leftPriority !== rightPriority) {
      return rightPriority - leftPriority;
    }

    return compareStrings(left.id, right.id);
  });
}

export function createDecisionTrace<T extends { id: string; severity?: Recommendation['severity']; score?: number }>(
  items: T[],
  profile: DecisionPolicyProfile = 'balanced',
  inputSnapshot: unknown = items
): DecisionTrace {
  const policy = getDeterministicDecisionPolicy(profile);
  const orderedItems = sortDecisionItems(items);

  const scoreBreakdown = orderedItems.reduce<Record<string, number>>((acc, item) => {
    acc[item.id] = scoreDecisionItem(item, profile);
    return acc;
  }, {});

  const totalScore = Object.values(scoreBreakdown).reduce((sum, value) => sum + value, 0);
  const judgmentScore = Number((totalScore / Math.max(orderedItems.length, 1)).toFixed(4));
  const confidenceCenter = (policy.confidenceRange[0] + policy.confidenceRange[1]) / 2;
  const expectedValue = Number((judgmentScore * confidenceCenter + totalScore * EXPECTED_VALUE_CONFIDENCE_BASE).toFixed(4));
  const finalJev = calculateJevScore(judgmentScore, expectedValue, confidenceCenter, profile);
  const normalizedInputs = normalizeDecisionInputs(inputSnapshot);

  return {
    id: `trace:${policy.profile}:${signatureForTrace(normalizedInputs, orderedItems)}`,
    profile: policy.profile,
    version: policy.version,
    normalizedInputs,
    assumptions: policy.assumptions,
    confidenceRange: policy.confidenceRange,
    judgmentScore,
    expectedValue,
    jevScore: finalJev,
    scoreBreakdown,
    totalScore: Number(totalScore.toFixed(4)),
    rationale: `Ranked by ${policy.tieBreakers.join(' → ')} using ${policy.profile} policy assumptions, yielding a JEV score of ${finalJev} within a ${policy.confidenceRange[0]}-${policy.confidenceRange[1]} confidence band.`,
  };
}

function signatureForTrace(normalizedInput: unknown, orderedItems: Array<{ id: string }>): string {
  const ids = orderedItems.map((item) => item.id).join('|');
  const serialized = JSON.stringify(normalizeDecisionInputs(normalizedInput));

  return `${serialized}:${ids}`;
}

export function createDeterministicDecisionContract<T extends { id: string; severity?: Recommendation['severity']; score?: number }>(
  items: T[],
  profile: DecisionPolicyProfile = 'balanced'
): { policy: ReturnType<typeof getDeterministicDecisionPolicy>; items: T[]; signature: string; trace: DecisionTrace } {
  const policy = getDeterministicDecisionPolicy(profile);
  const orderedItems = sortDecisionItems(items);
  const snapshot = { profile: policy.profile, scoreWeights: policy.scoreWeights, items: orderedItems };

  const signature = getDecisionInputSignature(snapshot, profile);

  const trace = createDecisionTrace(orderedItems, profile, snapshot);

  return { policy, items: orderedItems, signature, trace };
}
