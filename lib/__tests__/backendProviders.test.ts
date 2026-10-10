import {
  BACKEND_PROVIDER_CATALOG,
  buildProviderRecommendationSummary,
  createBackendProviderAdapter,
  getDefaultProviderRecommendation,
  getStaticAuthFlow,
  rankBackendProviders,
} from '../backendProviders';

describe('backendProviders', () => {
  it('ranks providers by weighted score and keeps the local-only fallback as a safe default', () => {
    const ranked = rankBackendProviders();
    expect(ranked.length).toBe(BACKEND_PROVIDER_CATALOG.length);
    expect(ranked[0].id).toBe('supabase');
    expect(ranked[ranked.length - 1].id).toBe('local_only');
  });

  it('recommends a provider with a static-friendly auth flow', () => {
    const recommendation = getDefaultProviderRecommendation();
    expect(recommendation.id).toBe('supabase');
    expect(getStaticAuthFlow('supabase').mode).toBe('oauth');
    expect(getStaticAuthFlow('local_only').mode).toBe('none');
  });

  it('creates an adapter that respects local-only and configured provider states', async () => {
    const unconfigured = createBackendProviderAdapter('supabase', { configured: false });
    const configured = createBackendProviderAdapter('supabase', { configured: true });

    await expect(unconfigured.signInWithOAuth('github')).resolves.toMatchObject({ status: 'not_configured' });
    await expect(configured.signInWithOAuth('google')).resolves.toMatchObject({ status: 'success' });

    await expect(unconfigured.saveBudget({ id: 'demo' })).resolves.toBeUndefined();
    await expect(unconfigured.listBudgetHistory()).resolves.toEqual([]);

    const created = await configured.upsertBudget({ id: 'demo-budget', name: 'Demo', annualSalary: 120000 });
    expect(created).toMatchObject({ id: 'demo-budget', name: 'Demo', version: 1 });

    const history = await configured.listBudgetHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0]).toMatchObject({ action: 'create', version: 1 });

    const budgets = await configured.listBudgets();
    expect(budgets).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'demo-budget' })]));

    const actual = await configured.getBudget('demo-budget');
    expect(actual).toMatchObject({ id: 'demo-budget', name: 'Demo' });

    const deleted = await configured.deleteBudget('demo-budget');
    expect(deleted).toBe(true);

    const afterDelete = await configured.listBudgetHistory();
    expect(afterDelete[0]).toMatchObject({ action: 'delete', version: 1 });
    expect(afterDelete[0].previousVersion).toBeUndefined();

    await configured.upsertBudget({ id: 'multi-version', name: 'Multi', annualSalary: 120000 });
    await configured.upsertBudget({ id: 'multi-version', name: 'Multi revised', annualSalary: 130000 });
    const deletedRevision = await configured.deleteBudget('multi-version');
    expect(deletedRevision).toBe(true);

    const historyWithPrevious = await configured.listBudgetHistory();
    expect(historyWithPrevious[0]).toMatchObject({ action: 'delete', version: 2, previousVersion: 1 });
  });

  it('returns a human-readable scorecard summary', () => {
    const summary = buildProviderRecommendationSummary();
    expect(summary).toContain('Supabase');
    expect(summary).toContain('MVP');
  });
});
