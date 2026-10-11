export type BackendProviderId =
  | 'supabase'
  | 'firebase'
  | 'appwrite'
  | 'pocketbase'
  | 'postgres'
  | 'local_only';

export type OAuthProviderId =
  | 'github'
  | 'google'
  | 'quickbooks'
  | 'xero'
  | 'wave'
  | 'plaid'
  | 'csv'
  | 'none';
export type ProviderStage = 'MVP' | 'Growth' | 'Enterprise';

export interface ProviderCriterionScore {
  cost: number;
  dataModel: number;
  security: number;
  operations: number;
  migration: number;
}

export interface ProviderCapabilityFlags {
  oauth: boolean;
  realtime: boolean;
  rls: boolean;
  fileStorage: boolean;
  selfHosted: boolean;
  localFallback: boolean;
}

export interface BackendProviderDefinition {
  id: BackendProviderId;
  name: string;
  summary: string;
  recommendedStage: ProviderStage;
  capabilities: ProviderCapabilityFlags;
  criteria: ProviderCriterionScore;
  score: number;
  authProviders: OAuthProviderId[];
  bestFor: string[];
}

export interface StaticAuthFlow {
  mode: 'oauth' | 'none';
  providers: OAuthProviderId[];
  fallbackMode: 'local_storage';
  requiresUserInteraction: boolean;
  notes: string;
}

export interface AuthResult {
  provider: OAuthProviderId;
  status: 'success' | 'skipped' | 'not_configured';
  reason?: string;
  userId?: string;
}

export interface BudgetSnapshotRecord {
  id: string;
  name?: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface BudgetHistoryEntry extends BudgetSnapshotRecord {
  action: 'create' | 'update' | 'delete';
  previousVersion?: number;
}

export interface BackendProviderAdapter {
  readonly providerId: BackendProviderId;
  readonly auth: StaticAuthFlow;
  isConfigured(): boolean;
  getCapabilities(): ProviderCapabilityFlags;
  signInWithOAuth(provider: OAuthProviderId): Promise<AuthResult>;
  signOut(): Promise<void>;
  saveBudget(payload: Record<string, unknown>): Promise<void>;
  listBudgetHistory(): Promise<Array<Record<string, unknown>>>;
  listBudgets(): Promise<Array<Record<string, unknown>>>;
  getBudget(id: string): Promise<Record<string, unknown> | null>;
  upsertBudget(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  deleteBudget(id: string): Promise<boolean>;
}

const SCORE_WEIGHTS = {
  cost: 0.25,
  dataModel: 0.2,
  security: 0.25,
  operations: 0.15,
  migration: 0.15,
} as const;

export const BACKEND_PROVIDER_CATALOG: BackendProviderDefinition[] = [
  {
    id: 'supabase',
    name: 'Supabase',
    summary: 'Managed Postgres + Auth + Realtime with strong developer ergonomics and a clear migration path.',
    recommendedStage: 'MVP',
    capabilities: {
      oauth: true,
      realtime: true,
      rls: true,
      fileStorage: true,
      selfHosted: false,
      localFallback: true,
    },
    criteria: {
      cost: 4,
      dataModel: 5,
      security: 5,
      operations: 4,
      migration: 4,
    },
    authProviders: ['github', 'google'],
    bestFor: ['MVP sync', 'multi-device history', 'row-level permissions'],
    score: 0,
  },
  {
    id: 'firebase',
    name: 'Firebase',
    summary: 'Strong auth and realtime features, but document-oriented patterns are less natural for budget history and modeling.',
    recommendedStage: 'Growth',
    capabilities: {
      oauth: true,
      realtime: true,
      rls: false,
      fileStorage: true,
      selfHosted: false,
      localFallback: true,
    },
    criteria: {
      cost: 3,
      dataModel: 3,
      security: 4,
      operations: 4,
      migration: 2,
    },
    authProviders: ['google', 'github'],
    bestFor: ['real-time dashboards', 'managed user auth'],
    score: 0,
  },
  {
    id: 'appwrite',
    name: 'Appwrite',
    summary: 'Open-source backend with auth and storage, good fit for a static app and easier self-hosted operations.',
    recommendedStage: 'Growth',
    capabilities: {
      oauth: true,
      realtime: true,
      rls: true,
      fileStorage: true,
      selfHosted: true,
      localFallback: true,
    },
    criteria: {
      cost: 4,
      dataModel: 4,
      security: 4,
      operations: 3,
      migration: 4,
    },
    authProviders: ['github', 'google'],
    bestFor: ['self-hosting', 'budget history and blob storage'],
    score: 0,
  },
  {
    id: 'pocketbase',
    name: 'PocketBase',
    summary: 'Tiny self-hosted backend that keeps deployment simple, but it is a smaller ecosystem than Supabase or Firebase.',
    recommendedStage: 'Growth',
    capabilities: {
      oauth: true,
      realtime: true,
      rls: true,
      fileStorage: true,
      selfHosted: true,
      localFallback: true,
    },
    criteria: {
      cost: 5,
      dataModel: 3,
      security: 3,
      operations: 4,
      migration: 3,
    },
    authProviders: ['github', 'google'],
    bestFor: ['hobby/self-hosted deployments', 'small shared data sets'],
    score: 0,
  },
  {
    id: 'postgres',
    name: 'Postgres + Auth Stack',
    summary: 'The most flexible long-term option for enterprise control, but the highest operational overhead for a static browser app.',
    recommendedStage: 'Enterprise',
    capabilities: {
      oauth: true,
      realtime: true,
      rls: true,
      fileStorage: false,
      selfHosted: true,
      localFallback: true,
    },
    criteria: {
      cost: 4,
      dataModel: 5,
      security: 5,
      operations: 2,
      migration: 5,
    },
    authProviders: ['github', 'google'],
    bestFor: ['enterprise compliance', 'custom schema and data retention'],
    score: 0,
  },
  {
    id: 'local_only',
    name: 'Local Only',
    summary: 'Default safe mode: keep all budget logic in-browser and opt into cloud sync later when the user chooses a backend.',
    recommendedStage: 'MVP',
    capabilities: {
      oauth: false,
      realtime: false,
      rls: false,
      fileStorage: false,
      selfHosted: false,
      localFallback: true,
    },
    criteria: {
      cost: 3,
      dataModel: 2,
      security: 2,
      operations: 4,
      migration: 2,
    },
    authProviders: ['none'],
    bestFor: ['privacy-first local use', 'zero-dependency rollout'],
    score: 0,
  },
];

export function calculateProviderScore(criteria: ProviderCriterionScore): number {
  const total = Object.entries(SCORE_WEIGHTS).reduce((sum, [key, weight]) => {
    const criterion = key as keyof ProviderCriterionScore;
    return sum + (criteria[criterion] * weight * 20);
  }, 0);

  return Math.round(total);
}

export function withCalculatedScores(
  providers: BackendProviderDefinition[] = BACKEND_PROVIDER_CATALOG,
): BackendProviderDefinition[] {
  return providers.map((provider) => ({
    ...provider,
    score: calculateProviderScore(provider.criteria),
  }));
}

export function rankBackendProviders(
  providers: BackendProviderDefinition[] = BACKEND_PROVIDER_CATALOG,
): BackendProviderDefinition[] {
  return [...withCalculatedScores(providers)].sort((left, right) => right.score - left.score);
}

export function getDefaultProviderRecommendation(): BackendProviderDefinition {
  return rankBackendProviders()[0];
}

export function getStaticAuthFlow(providerId: BackendProviderId): StaticAuthFlow {
  const provider = BACKEND_PROVIDER_CATALOG.find((candidate) => candidate.id === providerId);

  if (!provider || provider.id === 'local_only') {
    return {
      mode: 'none',
      providers: ['none'],
      fallbackMode: 'local_storage',
      requiresUserInteraction: false,
      notes: 'Unauthenticated users stay in full localStorage mode and no cloud sync is required.',
    };
  }

  return {
    mode: 'oauth',
    providers: provider.authProviders,
    fallbackMode: 'local_storage',
    requiresUserInteraction: true,
    notes: `Use provider-hosted OAuth for ${provider.name} and keep a localStorage fallback until the user signs in.`,
  };
}

type BudgetStoreEntry = {
  id: string;
  name: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  version: number;
};

function createBudgetState() {
  return {
    store: new Map<string, BudgetStoreEntry>(),
    history: new Array<BudgetHistoryEntry>(),
  };
}

function normalizeBudgetName(payload: Record<string, unknown>, fallback: string): string {
  if (typeof payload.name === 'string' && payload.name.trim()) {
    return payload.name.trim();
  }
  if (typeof payload.id === 'string' && payload.id.trim()) {
    return payload.id.trim();
  }
  return fallback;
}

function normalizeBudgetId(payload: Record<string, unknown>): string {
  if (typeof payload.id === 'string' && payload.id.trim()) {
    return payload.id.trim();
  }
  return `budget-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function buildHistoryId(prefix: string, timestamp: string): string {
  return `${prefix}-${timestamp.replace(/[:.]/g, '-')}`;
}

function recordBudgetHistory(
  state: ReturnType<typeof createBudgetState>,
  record: BudgetStoreEntry,
  action: BudgetHistoryEntry['action'],
  previousVersion?: number,
): void {
  const timestamp = new Date().toISOString();
  const entry: BudgetHistoryEntry = {
    id: buildHistoryId(record.id, timestamp),
    name: record.name,
    payload: record.payload,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    version: record.version,
    action,
    previousVersion,
  };
  state.history.unshift(entry);
}

function buildBudgetRecord(state: ReturnType<typeof createBudgetState>, payload: Record<string, unknown>): BudgetStoreEntry {
  const id = normalizeBudgetId(payload);
  const existing = state.store.get(id);
  const now = new Date().toISOString();
  const nextVersion = existing ? existing.version + 1 : 1;

  const record: BudgetStoreEntry = {
    id,
    name: normalizeBudgetName(payload, existing?.name ?? 'Untitled budget'),
    payload: { ...payload },
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    version: nextVersion,
  };

  state.store.set(id, record);
  recordBudgetHistory(state, record, existing ? 'update' : 'create', existing?.version);
  return record;
}

function deleteBudgetRecord(state: ReturnType<typeof createBudgetState>, id: string): boolean {
  const existing = state.store.get(id);
  const existed = state.store.delete(id);
  if (existed && existing) {
    const deletedAt = new Date().toISOString();
    state.history.unshift({
      id: buildHistoryId(id, deletedAt),
      name: existing.name,
      payload: existing.payload,
      createdAt: existing.createdAt,
      updatedAt: deletedAt,
      version: existing.version,
      action: 'delete',
      previousVersion: existing.version > 1 ? existing.version - 1 : undefined,
    });
  }
  return existed;
}

export function createBackendProviderAdapter(
  providerId: BackendProviderId,
  options: { configured?: boolean } = {},
): BackendProviderAdapter {
  const configured = options.configured ?? false;
  const definition = BACKEND_PROVIDER_CATALOG.find((candidate) => candidate.id === providerId) ?? BACKEND_PROVIDER_CATALOG[BACKEND_PROVIDER_CATALOG.length - 1];
  const auth = getStaticAuthFlow(providerId);
  const state = createBudgetState();

  const listBudgetsFromStore = async (): Promise<Array<Record<string, unknown>>> => {
    if (!configured) {
      return [];
    }
    return [...state.store.values()].map((entry) => ({ ...entry }));
  };

  const upsertBudgetIfConfigured = async (payload: Record<string, unknown>): Promise<Record<string, unknown>> => {
    if (!configured) {
      throw new Error('This backend adapter is not configured. Enable the provider before saving budget records.');
    }
    return { ...buildBudgetRecord(state, payload) };
  };

  const localOnlyAdapter: BackendProviderAdapter = {
    providerId,
    auth,
    isConfigured: () => configured,
    getCapabilities: () => definition.capabilities,
    signInWithOAuth: async (provider: OAuthProviderId) => {
      if (!configured) {
        return {
          provider,
          status: 'not_configured',
          reason: 'The backend adapter is not configured. Local-only mode remains available.',
        };
      }

      return {
        provider,
        status: 'success',
        userId: 'local-session-user',
      };
    },
    signOut: async () => undefined,
    saveBudget: async (payload: Record<string, unknown>) => {
      if (!configured) {
        return;
      }
      buildBudgetRecord(state, payload);
    },
    listBudgetHistory: async () => {
      if (!configured) {
        return [] as Record<string, unknown>[];
      }
      return [...state.history].map((entry) => ({ ...entry }));
    },
    listBudgets: listBudgetsFromStore,
    getBudget: async (id: string) => {
      if (!configured || !id) {
        return null;
      }
      const record = state.store.get(id);
      return record ? { ...record } : null;
    },
    upsertBudget: upsertBudgetIfConfigured,
    deleteBudget: async (id: string) => {
      if (!configured || !id) {
        return false;
      }
      return deleteBudgetRecord(state, id);
    },
  };

  if (providerId === 'local_only') {
    return localOnlyAdapter;
  }

  return {
    ...localOnlyAdapter,
    signInWithOAuth: async (provider: OAuthProviderId) => {
      if (!configured) {
        return {
          provider,
          status: 'not_configured',
          reason: `${definition.name} is not configured for static OAuth in this build.`,
        };
      }

      if (provider !== 'github' && provider !== 'google') {
        return {
          provider,
          status: 'skipped',
          reason: `Only GitHub and Google OAuth are supported for ${definition.name}.`,
        };
      }

      return {
        provider,
        status: 'success',
        userId: `provider-${provider}-session`,
      };
    },
  };
}

export function buildProviderRecommendationSummary(): string {
  const ranked = rankBackendProviders();
  const winner = ranked[0];
  const runnerUp = ranked[1] ?? winner;

  return `${winner.name} is the strongest default for an MVP static app because it balances security, cost, and migration risk. ${runnerUp.name} is the strongest alternative if a self-hosted or enterprise-managed path is preferred.`;
}
