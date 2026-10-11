import type { AuthResult, OAuthProviderId, StaticAuthFlow } from './backendProviders';

export type AccountingConnectorId = 'quickbooks' | 'xero' | 'wave' | 'csv' | 'plaid' | 'manual';
export type ConnectorStage = 'MVP' | 'Growth' | 'Enterprise';

export interface AccountingConnectorCapabilityFlags {
  oauth: boolean;
  read: boolean;
  write: boolean;
  reconcile: boolean;
  fileImport: boolean;
  transactions: boolean;
  categories: boolean;
  accounts: boolean;
}

export interface AccountingConnectorDefinition {
  id: AccountingConnectorId;
  name: string;
  summary: string;
  recommendedStage: ConnectorStage;
  capabilities: AccountingConnectorCapabilityFlags;
  authProviders: OAuthProviderId[];
  bestFor: string[];
  score: number;
}

export interface AccountingSyncStatus {
  status: 'idle' | 'syncing' | 'success' | 'failed';
  message: string;
  lastSyncAt: string | null;
  lastError: string | null;
  lastAttemptAt: string | null;
}

export interface ConnectorMappingResult {
  sourceCategory: string;
  targetCategory: string;
  matched: boolean;
  confidence: number;
}

export interface ConnectorSyncLogEntry {
  id: string;
  connectorId: AccountingConnectorId;
  startedAt: string;
  completedAt: string | null;
  status: 'success' | 'failed' | 'pending';
  outcome: string;
  accountScope: string;
  error?: string;
}

export interface AccountingConnectorAdapter {
  readonly providerId: AccountingConnectorId;
  readonly auth: StaticAuthFlow;
  isConfigured(): boolean;
  getCapabilities(): AccountingConnectorCapabilityFlags;
  signInWithOAuth(provider: OAuthProviderId): Promise<AuthResult>;
  getSyncStatus(): AccountingSyncStatus;
  getSyncLog(): ConnectorSyncLogEntry[];
  syncNow(): Promise<AccountingSyncStatus>;
  mapCategory(category: string): ConnectorMappingResult;
}

const CONNECTOR_SCORE_WEIGHTS = {
  oauth: 0.15,
  read: 0.2,
  write: 0.1,
  reconcile: 0.1,
  fileImport: 0.1,
  transactions: 0.15,
  categories: 0.1,
  accounts: 0.1,
} as const;

const DEFAULT_CATEGORY_MAP: Record<string, string> = {
  housing: 'real_estate',
  rent: 'real_estate',
  mortgage: 'real_estate',
  utilities: 'utilities',
  electric: 'utilities',
  gas: 'utilities',
  water: 'utilities',
  internet: 'utilities',
  phone: 'utilities',
  transportation: 'transportation',
  fuel: 'transportation',
  commute: 'transportation',
  groceries: 'food_and_beverage',
  food: 'food_and_beverage',
  dining: 'food_and_beverage',
  health: 'healthcare',
  insurance: 'healthcare',
  pets: 'pet_expenses',
  travel: 'travel',
  subscriptions: 'subscriptions',
  debt: 'debt_service',
  savings: 'cash_savings',
  lifestyle: 'miscellaneous',
  misc: 'miscellaneous',
  other: 'miscellaneous',
};

export const ACCOUNTING_CONNECTOR_CATALOG: AccountingConnectorDefinition[] = [
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    summary: 'Best MVP read-only connector for importing accounts, categories, and transactions with a managed sync boundary.',
    recommendedStage: 'MVP',
    capabilities: {
      oauth: true,
      read: true,
      write: false,
      reconcile: false,
      fileImport: true,
      transactions: true,
      categories: true,
      accounts: true,
    },
    authProviders: ['google', 'github'],
    bestFor: ['read-only import', 'account mapping', 'manual sync review'],
    score: 0,
  },
  {
    id: 'xero',
    name: 'Xero',
    summary: 'Strong accounting fit for users who want a second ledger-backed view with clean category structure.',
    recommendedStage: 'Growth',
    capabilities: {
      oauth: true,
      read: true,
      write: false,
      reconcile: true,
      fileImport: true,
      transactions: true,
      categories: true,
      accounts: true,
    },
    authProviders: ['google', 'github'],
    bestFor: ['ledger imports', 'multi-account reporting'],
    score: 0,
  },
  {
    id: 'wave',
    name: 'Wave',
    summary: 'Useful for SMB-facing categories and basic cash-basis expense import patterns.',
    recommendedStage: 'Growth',
    capabilities: {
      oauth: true,
      read: true,
      write: false,
      reconcile: false,
      fileImport: true,
      transactions: true,
      categories: true,
      accounts: false,
    },
    authProviders: ['google'],
    bestFor: ['small business expense feeds', 'CSV-first import'],
    score: 0,
  },
  {
    id: 'csv',
    name: 'CSV Import',
    summary: 'A low-friction import path for spreadsheet exports and manual data onboarding.',
    recommendedStage: 'MVP',
    capabilities: {
      oauth: false,
      read: true,
      write: false,
      reconcile: true,
      fileImport: true,
      transactions: true,
      categories: true,
      accounts: true,
    },
    authProviders: [],
    bestFor: ['import/export workflows', 'fallback onboarding'],
    score: 0,
  },
  {
    id: 'plaid',
    name: 'Plaid',
    summary: 'Excellent for transaction feeds and account-linking, but not a full accounting system by itself.',
    recommendedStage: 'Growth',
    capabilities: {
      oauth: true,
      read: true,
      write: false,
      reconcile: true,
      fileImport: false,
      transactions: true,
      categories: true,
      accounts: true,
    },
    authProviders: ['google', 'github'],
    bestFor: ['bank feeds', 'transaction aggregation'],
    score: 0,
  },
  {
    id: 'manual',
    name: 'Manual Review',
    summary: 'Keep the workflow fully local and require explicit approval for imported accounting data.',
    recommendedStage: 'MVP',
    capabilities: {
      oauth: false,
      read: true,
      write: false,
      reconcile: false,
      fileImport: false,
      transactions: false,
      categories: false,
      accounts: false,
    },
    authProviders: [],
    bestFor: ['privacy-first', 'low-risk manual review'],
    score: 0,
  },
];

function calculateConnectorScore(flags: AccountingConnectorCapabilityFlags): number {
  const total = Object.entries(CONNECTOR_SCORE_WEIGHTS).reduce((sum, [key, weight]) => {
    const flagName = key as keyof AccountingConnectorCapabilityFlags;
    const value = flags[flagName] ? weight : 0;
    return sum + value * 100;
  }, 0);

  return Math.round(total);
}

export function withCalculatedConnectorScores(
  providers: AccountingConnectorDefinition[] = ACCOUNTING_CONNECTOR_CATALOG,
): AccountingConnectorDefinition[] {
  return providers.map((provider) => ({
    ...provider,
    score: calculateConnectorScore(provider.capabilities),
  }));
}

const STAGE_ORDER: Record<ConnectorStage, number> = {
  MVP: 1,
  Growth: 2,
  Enterprise: 3,
};

export function rankAccountingConnectors(
  providers: AccountingConnectorDefinition[] = ACCOUNTING_CONNECTOR_CATALOG,
): AccountingConnectorDefinition[] {
  return [...withCalculatedConnectorScores(providers)].sort((left, right) => {
    if (left.id === 'manual' && right.id !== 'manual') {
      return 1;
    }
    if (right.id === 'manual' && left.id !== 'manual') {
      return -1;
    }

    const stageDelta = STAGE_ORDER[left.recommendedStage] - STAGE_ORDER[right.recommendedStage];
    if (stageDelta !== 0) {
      return stageDelta;
    }

    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return left.name.localeCompare(right.name);
  });
}

export function getDefaultAccountingConnectorRecommendation(): AccountingConnectorDefinition {
  return rankAccountingConnectors()[0];
}

export function buildAccountingConnectorRecommendationSummary(): string {
  const ranked = rankAccountingConnectors();
  const winner = ranked[0];
  const runnerUp = ranked[1] ?? winner;

  return `${winner.name} is the strongest default for a static-first accounting integration because it balances import reach, category mapping, and safe read-only defaults for an MVP workflow. ${runnerUp.name} is the strongest alternative when a broader review or self-managed workflow is preferred.`;
}

export function getStaticAccountingAuthFlow(providerId: AccountingConnectorId): StaticAuthFlow {
  const provider = ACCOUNTING_CONNECTOR_CATALOG.find((candidate) => candidate.id === providerId);

  if (!provider || provider.id === 'manual') {
    return {
      mode: 'none',
      providers: ['none'],
      fallbackMode: 'local_storage',
      requiresUserInteraction: false,
      notes: 'Manual review keeps all imported accounting data in a user-confirmed local workflow.',
    };
  }

  return {
    mode: 'oauth',
    providers: provider.authProviders,
    fallbackMode: 'local_storage',
    requiresUserInteraction: true,
    notes: `Use a provider-hosted OAuth flow for ${provider.name} and retain a local review fallback until the user confirms the import.`,
  };
}

function buildSyncStatusEntry(
  connectorId: AccountingConnectorId,
  startedAt: string,
  status: ConnectorSyncLogEntry['status'],
  outcome: string,
  accountScope: string,
  error?: string,
): ConnectorSyncLogEntry {
  const randomHex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');

  return {
    id: `${connectorId}-${startedAt.replace(/[:.]/g, '-')}-${Date.now()}-${randomHex}`,
    connectorId,
    startedAt,
    completedAt: status === 'pending' ? null : new Date().toISOString(),
    status,
    outcome,
    accountScope,
    ...(error ? { error } : {}),
  };
}

export function createAccountingConnectorAdapter(
  providerId: AccountingConnectorId,
  options: { configured?: boolean } = {},
): AccountingConnectorAdapter {
  const configured = options.configured ?? false;
  const matchingDefinition = ACCOUNTING_CONNECTOR_CATALOG.find((candidate) => candidate.id === providerId);

  if (!matchingDefinition) {
    throw new Error(`Unsupported accounting connector ID: ${providerId}`);
  }

  const definition = matchingDefinition;
  const state = {
    syncStatus: {
      status: 'idle',
      message: 'No sync has been attempted yet.',
      lastSyncAt: null,
      lastError: null,
      lastAttemptAt: null,
    } satisfies AccountingSyncStatus,
    syncLog: [] as ConnectorSyncLogEntry[],
  };

  const updateSyncStatus = (next: AccountingSyncStatus): AccountingSyncStatus => {
    state.syncStatus = next;
    return { ...next };
  };

  const adapter: AccountingConnectorAdapter = {
    providerId,
    auth: getStaticAccountingAuthFlow(providerId),
    isConfigured: () => configured,
    getCapabilities: () => definition.capabilities,
    signInWithOAuth: async (provider: OAuthProviderId) => {
      if (!configured) {
        return {
          provider,
          status: 'not_configured',
          reason: 'This accounting connector is not configured. Local review remains available.',
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
        userId: `${definition.id}-session`,
      };
    },
    getSyncStatus: () => ({ ...state.syncStatus }),
    getSyncLog: () => state.syncLog.map((entry) => ({ ...entry })),
    syncNow: async () => {
      const startedAt = new Date().toISOString();

      if (!configured) {
        const failedStatus: AccountingSyncStatus = {
          status: 'failed',
          message: `${definition.name} is not configured for sync in this environment.`,
          lastSyncAt: null,
          lastError: 'Connector is not configured.',
          lastAttemptAt: startedAt,
        };

        const logEntry = buildSyncStatusEntry(providerId, startedAt, 'failed', 'Sync skipped', 'local_only', 'Connector is not configured.');
        state.syncLog.unshift(logEntry);
        return updateSyncStatus(failedStatus);
      }

      const syncingStatus: AccountingSyncStatus = {
        status: 'syncing',
        message: `Syncing ${definition.name} account data...`,
        lastSyncAt: null,
        lastError: null,
        lastAttemptAt: startedAt,
      };
      updateSyncStatus(syncingStatus);

      const completedAt = new Date().toISOString();
      const successStatus: AccountingSyncStatus = {
        status: 'success',
        message: `${definition.name} sync completed successfully.`,
        lastSyncAt: completedAt,
        lastError: null,
        lastAttemptAt: startedAt,
      };

      const logEntry = buildSyncStatusEntry(providerId, startedAt, 'success', 'Sync completed', 'all_accounts');
      state.syncLog.unshift(logEntry);
      return updateSyncStatus(successStatus);
    },
    mapCategory: (category: string) => {
      const normalized = category.trim().toLowerCase();
      const directMatch = DEFAULT_CATEGORY_MAP[normalized];
      const fallbackMatch = DEFAULT_CATEGORY_MAP[normalized.replace(/[^a-z]/g, '')];
      const targetCategory = directMatch ?? fallbackMatch ?? 'miscellaneous';
      const normalizedWords = normalized.split(/[^a-z]+/).filter(Boolean);
      const containsGenericFallback = normalizedWords.some((word) => word === 'misc' || word === 'other' || word === 'general');
      const matched = Boolean(directMatch || fallbackMatch);
      const fallbackOnly = !matched && containsGenericFallback;
      const confidence = matched ? 0.9 : fallbackOnly ? 0.55 : 0.4;

      return {
        sourceCategory: category,
        targetCategory,
        matched,
        confidence,
      };
    },
  };

  return adapter;
}

export function getAccountingConnectorCatalogSummary(): string {
  return ACCOUNTING_CONNECTOR_CATALOG.map((provider) => `${provider.name} (${provider.recommendedStage})`).join(', ');
}
