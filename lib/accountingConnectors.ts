import type { TrackableCategory } from '@/types/budget';
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
  targetCategory: TrackableCategory;
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

export interface AccountingConnectorImportRecord {
  id: string;
  accountId: string;
  accountName: string;
  category: string;
  type: 'account' | 'expense' | 'transaction';
  amount?: number;
  currency?: string;
  connectedTo: string;
  lastUpdatedAt: string | null;
}

export interface AccountingImportSnapshot {
  importer: AccountingConnectorId;
  accounts: AccountingConnectorImportRecord[];
  categories: AccountingConnectorImportRecord[];
  expenses: AccountingConnectorImportRecord[];
  transactions: AccountingConnectorImportRecord[];
  syncedAt: string;
  reviewRequired: boolean;
}

export interface AccountingWritebackTransaction {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  category: TrackableCategory;
  accountId?: string;
  externalId?: string;
  note?: string;
}

export interface AccountingWritebackResult {
  status: 'success' | 'skipped' | 'rejected';
  message: string;
  submittedCount: number;
  rejectedCount: number;
  transactionIds: string[];
  rejectedTransactions?: AccountingWritebackRejection[];
  reconciliationId?: string;
}

export interface AccountingReconciliationMismatch {
  transactionId: string;
  accountId?: string;
  expectedCategory?: TrackableCategory;
  actualCategory?: TrackableCategory;
  expectedAmount?: number;
  actualAmount?: number;
  reason: string;
  resolution: 'approve' | 'review' | 'ignore';
}

export interface AccountingWritebackRejection {
  id: string;
  reason: string;
}

export interface AccountingReconciliationReport {
  id: string;
  connectorId: AccountingConnectorId;
  generatedAt: string;
  summary: string;
  totalTransactions: number;
  matchedTransactions: number;
  mismatches: AccountingReconciliationMismatch[];
  unresolvedCount: number;
  approvedWritebackCount: number;
  reviewRequired: boolean;
  status: 'clean' | 'review' | 'blocked';
}

export interface AccountingConnectorAdapter {
  readonly providerId: AccountingConnectorId;
  readonly auth: StaticAuthFlow;
  isConfigured(): boolean;
  getCapabilities(): AccountingConnectorCapabilityFlags;
  signInWithOAuth?: (provider: OAuthProviderId) => Promise<AuthResult>;
  getSyncStatus(): AccountingSyncStatus;
  getSyncLog(): ConnectorSyncLogEntry[];
  syncNow(): Promise<AccountingSyncStatus>;
  mapCategory(category: string): ConnectorMappingResult;
  getReadOnlySnapshot(): AccountingImportSnapshot | null;
  writeBackApprovedTransactions?: (transactions: AccountingWritebackTransaction[]) => Promise<AccountingWritebackResult>;
  generateReconciliationReport: () => AccountingReconciliationReport;
  getReconciliationReport: () => AccountingReconciliationReport | null;
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

// This mapping intentionally targets DynamicBudget's actual TrackableCategory union.
// Several provider-side buckets do not have a 1:1 app category today, so they map to
// the neutral fallback 'other' until the taxonomy expands further.
const DEFAULT_CATEGORY_MAP: Record<string, TrackableCategory> = {
  housing: 'other',
  rent: 'other',
  mortgage: 'other',
  utilities: 'other',
  electric: 'electricity',
  gas: 'gas_utility',
  water: 'water',
  internet: 'internet',
  phone: 'phone',
  transportation: 'other',
  fuel: 'gasoline',
  commute: 'other',
  groceries: 'groceries',
  food: 'other',
  dining: 'dining_out',
  health: 'other',
  insurance: 'other',
  pets: 'other',
  travel: 'other',
  subscriptions: 'subscriptions',
  debt: 'other',
  savings: 'other',
  lifestyle: 'other',
  misc: 'other',
  other: 'other',
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
      write: true,
      reconcile: true,
      fileImport: true,
      transactions: true,
      categories: true,
      accounts: true,
    },
    authProviders: ['quickbooks'],
    bestFor: ['read-only import', 'manual sync review', 'approved write-back', 'reconciliation review', 'account mapping'],
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
    authProviders: ['xero'],
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
    authProviders: ['wave'],
    bestFor: ['small business expense feeds', 'spreadsheet-based onboarding'],
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
      reconcile: false,
      fileImport: true,
      transactions: true,
      categories: true,
      accounts: true,
    },
    authProviders: [],
    bestFor: ['spreadsheet import', 'fallback onboarding'],
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
    authProviders: ['plaid'],
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

  if (!provider || !provider.capabilities.oauth || provider.authProviders.length === 0) {
    return {
      mode: 'none',
      providers: ['none'],
      fallbackMode: 'local_storage',
      requiresUserInteraction: false,
      notes: provider
        ? `Use a local ${provider.name} import flow and keep the data in a user-confirmed local review until the import is approved.`
        : 'This accounting connector is unavailable in the current environment.',
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
  const randomHex = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(16).slice(2, 10);

  return {
    id: `${connectorId}-${startedAt.replace(/[:.]/g, '-')}-${randomHex}`,
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
  const initialSyncStatus: AccountingSyncStatus = {
    status: 'idle',
    message: 'No sync has been attempted yet.',
    lastSyncAt: null,
    lastError: null,
    lastAttemptAt: null,
  };

  const state: {
    syncStatus: AccountingSyncStatus;
    syncLog: ConnectorSyncLogEntry[];
    readOnlySnapshot: AccountingImportSnapshot | null;
    reconciliationReport: AccountingReconciliationReport | null;
  } = {
    syncStatus: initialSyncStatus,
    syncLog: [],
    readOnlySnapshot: null,
    reconciliationReport: null,
  };

  const updateSyncStatus = (next: AccountingSyncStatus): AccountingSyncStatus => {
    state.syncStatus = next;
    return { ...next };
  };

  const cloneSnapshot = (snapshot: AccountingImportSnapshot | null): AccountingImportSnapshot | null => {
    if (!snapshot) {
      return null;
    }

    return {
      ...snapshot,
      accounts: snapshot.accounts.map((entry) => ({ ...entry })),
      categories: snapshot.categories.map((entry) => ({ ...entry })),
      expenses: snapshot.expenses.map((entry) => ({ ...entry })),
      transactions: snapshot.transactions.map((entry) => ({ ...entry })),
    };
  };

  const buildReconciliationReport = (): AccountingReconciliationReport => {
    const transactions = state.readOnlySnapshot?.transactions ?? [];
    const mismatches: AccountingReconciliationMismatch[] = [];
    let matchedTransactions = 0;

    for (const transaction of transactions) {
      const mapped = adapter.mapCategory(transaction.category ?? 'other');
      const originalCategory = (transaction.category ?? 'other') as TrackableCategory;
      const expectedAmount = typeof transaction.amount === 'number' ? transaction.amount : undefined;

      if (mapped.matched && expectedAmount !== undefined) {
        matchedTransactions += 1;
      } else if (expectedAmount !== undefined) {
        mismatches.push({
          transactionId: transaction.id,
          accountId: transaction.accountId,
          expectedCategory: originalCategory,
          actualCategory: mapped.targetCategory,
          expectedAmount,
          reason: `Category mapping could not be confirmed for ${transaction.accountName || transaction.id}; manual review is required before write-back.`,
          resolution: 'review',
        });
      } else {
        mismatches.push({
          transactionId: transaction.id,
          accountId: transaction.accountId,
          expectedCategory: originalCategory,
          actualCategory: mapped.targetCategory,
          expectedAmount,
          reason: 'Amount or category metadata is missing; manual review is required before write-back.',
          resolution: 'review',
        });
      }
    }

    const unresolvedCount = mismatches.filter((entry) => entry.resolution === 'review').length;
    const reviewRequired = unresolvedCount > 0;

    const report: AccountingReconciliationReport = {
      id: `recon-${providerId}-${new Date().toISOString().replace(/[:.]/g, '-')}`,
      connectorId: providerId,
      generatedAt: new Date().toISOString(),
      summary: reviewRequired
        ? `${definition.name} reconciliation requires review before write-back.`
        : `${definition.name} reconciliation is clean and ready for approved write-back.`,
      totalTransactions: transactions.length,
      matchedTransactions,
      mismatches,
      unresolvedCount,
      approvedWritebackCount: 0,
      reviewRequired,
      status: reviewRequired ? 'review' : 'clean',
    };

    state.reconciliationReport = report;
    return { ...report, mismatches: report.mismatches.map((entry) => ({ ...entry })) };
  };

  const adapter: AccountingConnectorAdapter = {
    providerId,
    auth: getStaticAccountingAuthFlow(providerId),
    isConfigured: () => configured,
    getCapabilities: () => definition.capabilities,
    ...(definition.capabilities.oauth
      ? {
          signInWithOAuth: async (provider: OAuthProviderId) => {
            if (!configured) {
              return {
                provider,
                status: 'not_configured',
                reason: 'This accounting connector is not configured. Local review remains available.',
              };
            }

            if (!definition.authProviders.includes(provider)) {
              return {
                provider,
                status: 'skipped',
                reason: `${definition.name} does not support ${provider} OAuth sign-in. Supported providers: ${definition.authProviders.join(', ') || 'none'}.`,
              };
            }

            return {
              provider,
              status: 'success',
              userId: `${definition.id}-session`,
            };
          },
        }
      : {}),
    getSyncStatus: () => ({ ...state.syncStatus }),
    getSyncLog: () => state.syncLog.map((entry) => ({ ...entry })),
    getReadOnlySnapshot: () => cloneSnapshot(state.readOnlySnapshot),
    getReconciliationReport: () => state.reconciliationReport ? {
      ...state.reconciliationReport,
      mismatches: state.reconciliationReport.mismatches.map((entry) => ({ ...entry })),
    } : null,
    generateReconciliationReport: () => buildReconciliationReport(),
    writeBackApprovedTransactions: async (transactions: AccountingWritebackTransaction[]) => {
      if (!configured) {
        return {
          status: 'skipped',
          message: `${definition.name} is not configured for write-back.`,
          submittedCount: 0,
          rejectedCount: transactions.length,
          transactionIds: transactions.map((entry) => entry.id),
          rejectedTransactions: transactions.map((entry) => ({
            id: entry.id,
            reason: 'Connector is not configured for write-back.',
          })),
        };
      }

      if (!definition.capabilities.write) {
        return {
          status: 'skipped',
          message: `${definition.name} does not support approved write-back in this static MVP flow.`,
          submittedCount: 0,
          rejectedCount: transactions.length,
          transactionIds: transactions.map((entry) => entry.id),
          rejectedTransactions: transactions.map((entry) => ({
            id: entry.id,
            reason: 'Connector capability does not allow write-back.',
          })),
        };
      }

      const report = state.reconciliationReport ?? buildReconciliationReport();
      const hasReviewIssues = report.reviewRequired;
      if (hasReviewIssues) {
        return {
          status: 'rejected',
          message: 'Write-back was blocked because reconciliation issues require review before approval.',
          submittedCount: 0,
          rejectedCount: transactions.length,
          transactionIds: transactions.map((entry) => entry.id),
          rejectedTransactions: transactions.map((entry) => ({
            id: entry.id,
            reason: 'Reconciliation requires manual review before approval.',
          })),
          reconciliationId: report.id,
        };
      }

      const rejectedTransactions: AccountingWritebackRejection[] = [];
      const approvedTransactions = transactions.filter((entry) => {
        if (!Number.isFinite(entry.amount) || entry.amount <= 0) {
          rejectedTransactions.push({ id: entry.id, reason: 'Amount must be a finite number greater than zero.' });
          return false;
        }
        if (!entry.category) {
          rejectedTransactions.push({ id: entry.id, reason: 'Category is required.' });
          return false;
        }
        if (!entry.merchant.trim()) {
          rejectedTransactions.push({ id: entry.id, reason: 'Merchant name is required.' });
          return false;
        }
        return true;
      });

      const result: AccountingWritebackResult = {
        status: approvedTransactions.length === 0 ? 'rejected' : 'success',
        message: approvedTransactions.length === 0
          ? `No transactions were approved for ${definition.name} write-back because they failed validation.`
          : `Approved ${approvedTransactions.length} transaction(s) queued for ${definition.name} write-back.`,
        submittedCount: approvedTransactions.length,
        rejectedCount: rejectedTransactions.length,
        transactionIds: approvedTransactions.map((entry) => entry.id),
        rejectedTransactions,
        reconciliationId: report.id,
      };

      const logEntry = buildSyncStatusEntry(providerId, new Date().toISOString(), 'success', 'Approved write-back queued', 'reviewed_transactions');
      state.syncLog.unshift(logEntry);
      return result;
    },
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

      if (providerId === 'quickbooks') {
        // This is a static MVP stub used to model the QuickBooks read-only import contract.
        // It intentionally illustrates the expected import payload shape and review workflow without
        // claiming to connect to a live QuickBooks tenant in this browser-only application.
        state.readOnlySnapshot = {
          importer: 'quickbooks',
          syncedAt: completedAt,
          reviewRequired: true,
          accounts: [
            { id: 'qb-asset', accountId: 'banking-001', accountName: 'Bank Account', category: 'Cash & Bank', type: 'account', connectedTo: 'banking', lastUpdatedAt: completedAt },
            { id: 'qb-credit', accountId: 'liability-001', accountName: 'Credit Card', category: 'Liabilities', type: 'account', connectedTo: 'credit', lastUpdatedAt: completedAt },
          ],
          categories: [
            { id: 'qb-cat-groceries', accountId: 'expense-001', accountName: 'Groceries', category: 'Food & Dining', type: 'expense', connectedTo: 'food', lastUpdatedAt: completedAt },
            { id: 'qb-cat-utilities', accountId: 'expense-002', accountName: 'Utilities', category: 'Utilities', type: 'expense', connectedTo: 'utilities', lastUpdatedAt: completedAt },
          ],
          // These records intentionally mirror the same spend events in two collections:
          // expense items are the categorized import view, while transactions represent the
          // underlying bank/ledger entries a user may review before accepting the import.
          expenses: [
            { id: 'qb-expense-1', accountId: 'txn-001', accountName: 'Whole Foods', category: 'Groceries', type: 'expense', amount: 128.45, currency: 'USD', connectedTo: 'food', lastUpdatedAt: completedAt },
            { id: 'qb-expense-2', accountId: 'txn-002', accountName: 'NV Energy', category: 'Utilities', type: 'expense', amount: 96.2, currency: 'USD', connectedTo: 'utilities', lastUpdatedAt: completedAt },
          ],
          transactions: [
            { id: 'qb-txn-1', accountId: 'txn-101', accountName: 'Whole Foods', category: 'Groceries', type: 'transaction', amount: 128.45, currency: 'USD', connectedTo: 'banking', lastUpdatedAt: completedAt },
            { id: 'qb-txn-2', accountId: 'txn-102', accountName: 'NV Energy', category: 'Utilities', type: 'transaction', amount: 96.2, currency: 'USD', connectedTo: 'banking', lastUpdatedAt: completedAt },
          ],
        };
      }

      const logEntry = buildSyncStatusEntry(providerId, startedAt, 'success', 'Sync completed', 'all_accounts');
      state.syncLog.unshift(logEntry);
      state.reconciliationReport = buildReconciliationReport();
      return updateSyncStatus(successStatus);
    },
    mapCategory: (category: string) => {
      const normalized = category.trim().toLowerCase();
      const directMatch = DEFAULT_CATEGORY_MAP[normalized];
      const fallbackMatch = DEFAULT_CATEGORY_MAP[normalized.replace(/[^a-z]/g, '')];
      const targetCategory = directMatch ?? fallbackMatch ?? 'other';
      const normalizedWords = normalized.split(/[^a-z]+/).filter(Boolean);
      const containsGenericFallback = normalizedWords.some((word) => word === 'misc' || word === 'other' || word === 'general');
      const matched = Boolean((directMatch || fallbackMatch) && targetCategory !== 'other');
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
