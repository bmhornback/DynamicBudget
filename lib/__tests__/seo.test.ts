import { buildMetadata, SITE_URL } from '@/lib/seo';
import { buildStaticSitePathConfig, SITE_BASE_PATH } from '@/lib/siteConfig';

describe('buildMetadata', () => {
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
});

describe('buildStaticSitePathConfig', () => {
  it('uses the GitHub Pages base path for production exports', () => {
    expect(buildStaticSitePathConfig('production')).toEqual({
      basePath: SITE_BASE_PATH,
      assetPrefix: `${SITE_BASE_PATH}/`,
    });
  });

  it('omits the GitHub Pages base path outside production', () => {
    expect(buildStaticSitePathConfig('test')).toEqual({});
    expect(buildStaticSitePathConfig('development')).toEqual({});
  });

  it('falls back to process.env.NODE_ENV when no env is provided', () => {
    expect(buildStaticSitePathConfig()).toEqual({});
  });
});
