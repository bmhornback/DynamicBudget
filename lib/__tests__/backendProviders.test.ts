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
  });

  it('returns a human-readable scorecard summary', () => {
    const summary = buildProviderRecommendationSummary();
    expect(summary).toContain('Supabase');
    expect(summary).toContain('MVP');
  });
});
