import {
  ACCOUNTING_CONNECTOR_CATALOG,
  buildAccountingConnectorRecommendationSummary,
  createAccountingConnectorAdapter,
  getDefaultAccountingConnectorRecommendation,
  getStaticAccountingAuthFlow,
  rankAccountingConnectors,
  type AccountingConnectorId,
} from '../accountingConnectors';

describe('accountingConnectors', () => {
  it('ranks connector options by import and mapping capability, with a safe manual fallback', () => {
    const ranked = rankAccountingConnectors();
    expect(ranked.length).toBe(ACCOUNTING_CONNECTOR_CATALOG.length);
    expect(ranked[0].id).toBe('quickbooks');
    expect(ranked[ranked.length - 1].id).toBe('manual');
    expect(
      ranked.slice(1).every((provider, index) => {
        const previous = ranked[index];
        return provider.score <= previous.score || provider.recommendedStage !== previous.recommendedStage;
      }),
    ).toBe(true);
  });

  it('recommends a connector with a static-friendly auth flow', () => {
    const recommendation = getDefaultAccountingConnectorRecommendation();
    expect(recommendation.id).toBe('quickbooks');
    expect(getStaticAccountingAuthFlow('quickbooks').mode).toBe('oauth');
    expect(getStaticAccountingAuthFlow('csv').mode).toBe('none');
    expect(getStaticAccountingAuthFlow('manual').mode).toBe('none');
  });

  it('creates a configured connector adapter with sync status, mapping metadata, and approval guardrails', async () => {
    const unconfigured = createAccountingConnectorAdapter('quickbooks', { configured: false });
    const configured = createAccountingConnectorAdapter('quickbooks', { configured: true });

    await expect(unconfigured.signInWithOAuth?.('google')).resolves.toMatchObject({ status: 'not_configured' });
    await expect(configured.signInWithOAuth?.('quickbooks')).resolves.toMatchObject({ status: 'success' });
    await expect(configured.signInWithOAuth?.('google')).resolves.toMatchObject({ status: 'skipped' });
    await expect(() => createAccountingConnectorAdapter('missing' as AccountingConnectorId)).toThrow('Unsupported accounting connector ID');

    const syncStatus = await configured.syncNow();
    expect(syncStatus.status).toBe('success');
    expect(syncStatus.message).toContain('QuickBooks');
    expect(configured.getSyncStatus().lastSyncAt).not.toBeNull();
    expect(configured.getSyncLog()[0]).toMatchObject({ connectorId: 'quickbooks', status: 'success' });

    const mapped = configured.mapCategory('Groceries');
    expect(mapped.matched).toBe(true);
    expect(mapped.targetCategory).toBe('groceries');
    expect(mapped.confidence).toBeGreaterThan(0.5);

    const report = configured.generateReconciliationReport?.();
    expect(report?.status).toBe('review');
    expect(report?.reviewRequired).toBe(true);

    const blockedWrite = await configured.writeBackApprovedTransactions?.([
      { id: 'tx-1', merchant: 'Whole Foods', amount: 128.45, date: '2026-10-10', category: 'groceries' },
    ]);
    expect(blockedWrite?.status).toBe('rejected');
    expect(blockedWrite?.rejectedCount).toBe(1);
    expect(blockedWrite?.reconciliationId).toBeDefined();
  });

  it('keeps the read-only import snapshot null until a configured QuickBooks sync populates it', async () => {
    const unconfigured = createAccountingConnectorAdapter('quickbooks', { configured: false });
    const quickbooks = createAccountingConnectorAdapter('quickbooks', { configured: true });
    const csvConnector = createAccountingConnectorAdapter('csv', { configured: true });

    expect(unconfigured.getReadOnlySnapshot()).toBeNull();
    expect(quickbooks.getReadOnlySnapshot()).toBeNull();
    expect(csvConnector.getReadOnlySnapshot()).toBeNull();

    await unconfigured.syncNow();
    expect(unconfigured.getReadOnlySnapshot()).toBeNull();

    await quickbooks.syncNow();

    const snapshot = quickbooks.getReadOnlySnapshot();
    expect(snapshot).not.toBeNull();
    expect(snapshot).toMatchObject({
      importer: 'quickbooks',
      reviewRequired: true,
      syncedAt: expect.any(String),
      accounts: [
        { id: 'qb-asset', accountId: 'banking-001', accountName: 'Bank Account', category: 'Cash & Bank', type: 'account', connectedTo: 'banking' },
        { id: 'qb-credit', accountId: 'liability-001', accountName: 'Credit Card', category: 'Liabilities', type: 'account', connectedTo: 'credit' },
      ],
      categories: [
        { id: 'qb-cat-groceries', accountId: 'expense-001', accountName: 'Groceries', category: 'Food & Dining', type: 'expense', connectedTo: 'food' },
        { id: 'qb-cat-utilities', accountId: 'expense-002', accountName: 'Utilities', category: 'Utilities', type: 'expense', connectedTo: 'utilities' },
      ],
      expenses: [
        { id: 'qb-expense-1', accountId: 'txn-001', accountName: 'Whole Foods', category: 'Groceries', type: 'expense', amount: 128.45, currency: 'USD', connectedTo: 'food' },
        { id: 'qb-expense-2', accountId: 'txn-002', accountName: 'NV Energy', category: 'Utilities', type: 'expense', amount: 96.2, currency: 'USD', connectedTo: 'utilities' },
      ],
      transactions: [
        { id: 'qb-txn-1', accountId: 'txn-101', accountName: 'Whole Foods', category: 'Groceries', type: 'transaction', amount: 128.45, currency: 'USD', connectedTo: 'banking' },
        { id: 'qb-txn-2', accountId: 'txn-102', accountName: 'NV Energy', category: 'Utilities', type: 'transaction', amount: 96.2, currency: 'USD', connectedTo: 'banking' },
      ],
    });
    expect(csvConnector.getReadOnlySnapshot()).toBeNull();
  });

  it('returns a human readable summary for the connector recommendation', () => {
    const summary = buildAccountingConnectorRecommendationSummary();
    expect(summary).toContain('QuickBooks');
    expect(summary).toContain('static-first');
  });
});
