export const SITE_BASE_PATH = '/DynamicBudget';

export function buildStaticSitePathConfig(nodeEnv = process.env.NODE_ENV): {
  basePath?: string;
  assetPrefix?: string;
} {
  if (nodeEnv !== 'production') {
    return {};
  }

  return {
    basePath: SITE_BASE_PATH,
    assetPrefix: `${SITE_BASE_PATH}/`,
  };
}
