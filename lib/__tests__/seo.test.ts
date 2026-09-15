import nextConfig from '@/next.config';
import { buildMetadata, SITE_URL } from '@/lib/seo';

describe('seo metadata helpers', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

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
  });

  it('uses the GitHub Pages base path for production exports', async () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();

    const { default: productionConfig } = await import('../../next.config');

    expect(productionConfig.basePath).toBe('/DynamicBudget');
    expect(productionConfig.assetPrefix).toBe('/DynamicBudget/');
  });

  it('omits the GitHub Pages base path outside production', () => {
    expect(nextConfig.basePath).toBeUndefined();
    expect(nextConfig.assetPrefix).toBeUndefined();
  });
});
