import {
  ACCOUNTING_CONNECTOR_CATALOG,
  buildAccountingConnectorRecommendationSummary,
  createAccountingConnectorAdapter,
  getDefaultAccountingConnectorRecommendation,
  getStaticAccountingAuthFlow,
  rankAccountingConnectors,
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

  it('creates a configured connector adapter with sync status and mapping metadata', async () => {
    const unconfigured = createAccountingConnectorAdapter('quickbooks', { configured: false });
    const configured = createAccountingConnectorAdapter('quickbooks', { configured: true });

    await expect(unconfigured.signInWithOAuth?.('google')).resolves.toMatchObject({ status: 'not_configured' });
    await expect(configured.signInWithOAuth?.('quickbooks')).resolves.toMatchObject({ status: 'success' });
    await expect(configured.signInWithOAuth?.('google')).resolves.toMatchObject({ status: 'skipped' });
    await expect(() => createAccountingConnectorAdapter('missing' as any)).toThrow('Unsupported accounting connector ID');

    const syncStatus = await configured.syncNow();
    expect(syncStatus.status).toBe('success');
    expect(syncStatus.message).toContain('QuickBooks');
    expect(configured.getSyncStatus().lastSyncAt).not.toBeNull();
    expect(configured.getSyncLog()[0]).toMatchObject({ connectorId: 'quickbooks', status: 'success' });

    const mapped = configured.mapCategory('Groceries');
    expect(mapped.matched).toBe(true);
    expect(mapped.targetCategory).toBe('groceries');
    expect(mapped.confidence).toBeGreaterThan(0.5);
  });

  it('returns a human readable summary for the connector recommendation', () => {
    const summary = buildAccountingConnectorRecommendationSummary();
    expect(summary).toContain('QuickBooks');
    expect(summary).toContain('static-first');
  });
});
