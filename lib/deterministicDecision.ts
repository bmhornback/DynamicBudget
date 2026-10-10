import type {
  DecisionPolicyProfile,
  DecisionTrace,
  Recommendation,
  ScenarioRankingDimensionBreakdown,
  ScenarioRankingEntry,
} from '@/types/budget';

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

const FNV1A_OFFSET_BASIS = 2166136261;
const FNV1A_PRIME = 16777619;
const JEV_JUDGMENT_WEIGHT = 0.6;
const JEV_EXPECTED_VALUE_WEIGHT = 0.4;
const SEVERITY_SCORE_SCALE = 10;
const POLICY_DIMENSION_KEYS = ['housing', 'emergencyFund', 'debt', 'retirement', 'flexibility'] as const;
const TRACE_ID_SALT = 'deterministic-decision-trace';

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
  const normalizedInputs = normalizeDecisionInputs({
    profile: policy.profile,
    scoreWeights: policy.scoreWeights,
    inputs,
  });

  return `${policy.version}:${JSON.stringify(normalizedInputs)}`;
}

function hashDecisionTraceValue(value: string): string {
  let hash = FNV1A_OFFSET_BASIS;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    hash = Math.imul(hash, FNV1A_PRIME);
    hash ^= code;
  }

  return (hash >>> 0).toString(36).padStart(8, '0');
}

function signatureForTrace(normalizedInput: unknown, orderedItems: Array<{ id: string }>): string {
  const ids = orderedItems.map((item) => item.id).join('|');
  const serialized = JSON.stringify(normalizedInput);
  const material = `${TRACE_ID_SALT}:${serialized}:${ids}`;

  return hashDecisionTraceValue(material);
}

function createTraceIdentifier(policy: ReturnType<typeof getDeterministicDecisionPolicy>, normalizedInput: unknown, orderedItems: Array<{ id: string }>): string {
  return `trace:${policy.profile}:${policy.version}:${signatureForTrace(normalizedInput, orderedItems)}`;
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
  return scoreDecisionItemWithPolicy(item, policy);
}

function scoreDecisionItemWithPolicy(
  item: { id: string; severity?: Recommendation['severity']; score?: number; weight?: number },
  policy: ReturnType<typeof getDeterministicDecisionPolicy>
): number {
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

function averageScoreBreakdown(scores: Array<{ id: string; score: number }>): number {
  if (scores.length === 0) {
    return 0;
  }

  return Number((scores.reduce((sum, item) => sum + item.score, 0) / scores.length).toFixed(4));
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
  policy: ReturnType<typeof getDeterministicDecisionPolicy> = getDeterministicDecisionPolicy('balanced'),
  inputSnapshot: unknown = { profile: policy.profile, scoreWeights: policy.scoreWeights, items: sortDecisionItems(items) }
): DecisionTrace {
  const orderedItems = sortDecisionItems(items);

  const scoreBreakdown = orderedItems.map((item) => ({
    id: item.id,
    score: scoreDecisionItemWithPolicy(item, policy),
  }));

  const totalScore = scoreBreakdown.reduce((sum, value) => sum + value.score, 0);
  const judgmentScore = averageScoreBreakdown(scoreBreakdown);
  const confidenceCenter = (policy.confidenceRange[0] + policy.confidenceRange[1]) / 2;
  // A confidence-weighted expected value keeps EV in the same score unit as the
  // judgment average while remaining a distinct, auditable quantity from the raw mean.
  const expectedValue = Number((judgmentScore * (0.5 + confidenceCenter / 2)).toFixed(4));
  const finalJev = calculateJevScore(judgmentScore, expectedValue, confidenceCenter, policy.profile);
  const normalizedInputs = normalizeDecisionInputs(inputSnapshot);

  return {
    id: createTraceIdentifier(policy, normalizedInputs, orderedItems),
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

export function createDeterministicDecisionContract<T extends { id: string; severity?: Recommendation['severity']; score?: number }>(
  items: T[],
  profile: DecisionPolicyProfile = 'balanced'
): { policy: ReturnType<typeof getDeterministicDecisionPolicy>; items: T[]; signature: string; trace: DecisionTrace } {
  const policy = getDeterministicDecisionPolicy(profile);
  const orderedItems = sortDecisionItems(items);
  const snapshot = { profile: policy.profile, scoreWeights: policy.scoreWeights, items: orderedItems };

  const signature = getDecisionInputSignature(snapshot, profile);

  const trace = createDecisionTrace(orderedItems, policy, snapshot);

  return { policy, items: orderedItems, signature, trace };
}

export function attachDecisionTraceToRecommendation(
  recommendation: Recommendation,
  profile: DecisionPolicyProfile = 'balanced'
): Recommendation {
  const policy = getDeterministicDecisionPolicy(profile);
  const trace = createDecisionTrace(
    [{
      id: recommendation.id,
      severity: recommendation.severity,
      score: recommendation.score ?? 0,
      message: recommendation.message,
    }],
    policy,
    {
      profile: policy.profile,
      recommendation: {
        id: recommendation.id,
        severity: recommendation.severity,
        message: recommendation.message,
        detail: recommendation.detail,
      },
    }
  );

  return {
    ...recommendation,
    trace,
  };
}

function createDefaultScenarioDimensionBreakdown(): ScenarioRankingDimensionBreakdown {
  return {
    housing: 0,
    emergencyFund: 0,
    debt: 0,
    retirement: 0,
    flexibility: 0,
  };
}

function normalizeScenarioRankingScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(4));
}

export function rankScenarioOptions<T extends { id: string }>(
  options: T[],
  scorer: (item: T) => ScenarioRankingDimensionBreakdown & { total?: number },
  profile: DecisionPolicyProfile = 'balanced'
): ScenarioRankingEntry<T>[] {
  const policy = getDeterministicDecisionPolicy(profile);

  const ranked = [...options]
    .map((item, index) => {
      const breakdown = scorer(item);
      const dimensions = {
        housing: Number(breakdown.housing ?? 0),
        emergencyFund: Number(breakdown.emergencyFund ?? 0),
        debt: Number(breakdown.debt ?? 0),
        retirement: Number(breakdown.retirement ?? 0),
        flexibility: Number(breakdown.flexibility ?? 0),
      };

      const weightedTotal = POLICY_DIMENSION_KEYS.reduce((sum, key) => {
        const dimensionValue = Number(dimensions[key as keyof typeof dimensions] ?? 0);
        const weight = Number(policy.scoreWeights[key] ?? 1);
        return sum + dimensionValue * weight;
      }, 0);

      return {
        id: item.id,
        name: 'name' in item && typeof item.name === 'string' ? String(item.name) : `option-${index + 1}`,
        description: 'description' in item && typeof item.description === 'string' ? String(item.description) : undefined,
        severity: 'severity' in item && typeof item.severity === 'string' ? item.severity as Recommendation['severity'] : undefined,
        score: normalizeScenarioRankingScore(weightedTotal),
        weightedTotal: normalizeScenarioRankingScore(weightedTotal),
        rank: 0,
        dimensionBreakdown: {
          ...createDefaultScenarioDimensionBreakdown(),
          ...dimensions,
        },
        item,
      } satisfies ScenarioRankingEntry<T>;
    })
    .sort((left, right) => {
      const leftPriority = DECISION_SEVERITY_WEIGHT[left.severity ?? 'info'];
      const rightPriority = DECISION_SEVERITY_WEIGHT[right.severity ?? 'info'];

      if (leftPriority !== rightPriority) {
        return rightPriority - leftPriority;
      }

      if (left.weightedTotal !== right.weightedTotal) {
        return right.weightedTotal - left.weightedTotal;
      }

      return compareStrings(left.id, right.id);
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      score: normalizeScenarioRankingScore(entry.weightedTotal),
      weightedTotal: normalizeScenarioRankingScore(entry.weightedTotal),
    }));

  return ranked;
}

export function createScenarioRankingContract<T extends { id: string }>(
  options: T[],
  scorer: (item: T) => ScenarioRankingDimensionBreakdown & { total?: number },
  profile: DecisionPolicyProfile = 'balanced'
): {
  profile: DecisionPolicyProfile;
  policy: ReturnType<typeof getDeterministicDecisionPolicy>;
  signature: string;
  ranked: ScenarioRankingEntry<T>[];
  trace: DecisionTrace;
} {
  const policy = getDeterministicDecisionPolicy(profile);
  const ranked = rankScenarioOptions(options, scorer, profile);
  const snapshot = {
    profile: policy.profile,
    scoreWeights: policy.scoreWeights,
    options: ranked.map((entry) => ({
      id: entry.id,
      weightedTotal: entry.weightedTotal,
      dimensionBreakdown: entry.dimensionBreakdown,
    })),
  };
  const signature = getDecisionInputSignature(snapshot, profile);
  const trace = createDecisionTrace(
    ranked.map((entry) => ({
      id: entry.id,
      severity: entry.severity ?? 'info',
      score: entry.weightedTotal,
    })),
    policy,
    snapshot
  );

  return {
    profile,
    policy,
    signature,
    ranked,
    trace,
  };
}
