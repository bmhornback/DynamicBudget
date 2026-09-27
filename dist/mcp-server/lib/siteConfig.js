"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SITE_BASE_PATH = void 0;
exports.buildStaticSitePathConfig = buildStaticSitePathConfig;
exports.SITE_BASE_PATH = '/DynamicBudget';
function buildStaticSitePathConfig(nodeEnv = process.env.NODE_ENV) {
    if (nodeEnv !== 'production') {
        return {};
    }
    return {
        basePath: exports.SITE_BASE_PATH,
        assetPrefix: `${exports.SITE_BASE_PATH}/`,
    };
}
