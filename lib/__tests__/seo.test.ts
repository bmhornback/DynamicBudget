import { buildMetadata, SITE_URL } from '@/lib/seo';
import { buildStaticSitePathConfig } from '@/lib/siteConfig';

describe('seo metadata helpers', () => {
  it('preserves the project subpath in canonical and Open Graph URLs', () => {
    const homeMetadata = buildMetadata({
      title: 'Home',
      description: 'Home page',
    });
    const learnMetadata = buildMetadata({
      title: 'Learn',
      description: 'Learn page',
      path: '/learn',
    });

    expect(homeMetadata.alternates?.canonical).toBe(SITE_URL);
    expect(homeMetadata.openGraph?.url).toBe(SITE_URL);
    expect(learnMetadata.alternates?.canonical).toBe(`${SITE_URL}/learn`);
    expect(learnMetadata.openGraph?.url).toBe(`${SITE_URL}/learn`);
    expect(
      buildMetadata({
        title: 'Learn slash',
        description: 'Learn page',
        path: '/learn/',
      }).alternates?.canonical
    ).toBe(`${SITE_URL}/learn`);
  });

  it('uses the GitHub Pages base path for production exports', () => {
    expect(buildStaticSitePathConfig('production')).toEqual({
      basePath: '/DynamicBudget',
      assetPrefix: '/DynamicBudget/',
    });
  });

  it('omits the GitHub Pages base path outside production', () => {
    expect(buildStaticSitePathConfig('test')).toEqual({});
  });
});
