"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SITE_NAME = exports.SITE_URL = void 0;
exports.buildCanonicalUrl = buildCanonicalUrl;
exports.buildMetadata = buildMetadata;
exports.buildWebApplicationJsonLd = buildWebApplicationJsonLd;
const siteConfig_1 = require("@/lib/siteConfig");
exports.SITE_URL = `https://bmhornback.github.io${siteConfig_1.SITE_BASE_PATH}`;
exports.SITE_NAME = 'DynamicBudget';
// Normalize route fragments like "/", "/learn/", or "learn" into a canonical site URL.
function buildCanonicalUrl(path) {
    const normalizedPath = !path || path === '/'
        ? ''
        : path.replace(/^\/+/, '').replace(/\/+$/, '');
    const baseUrl = exports.SITE_URL.replace(/\/+$/, '');
    return normalizedPath ? `${baseUrl}/${normalizedPath}` : baseUrl;
}
function buildMetadata({ title, description, path = '/', }) {
    const canonicalUrl = buildCanonicalUrl(path);
    return {
        title,
        description,
        alternates: {
            canonical: canonicalUrl,
        },
        openGraph: {
            title,
            description,
            url: canonicalUrl,
            siteName: exports.SITE_NAME,
            type: 'website',
        },
        twitter: {
            card: 'summary',
            title,
            description,
        },
        robots: {
            index: true,
            follow: true,
        },
    };
}
function buildWebApplicationJsonLd() {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: exports.SITE_NAME,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        url: `${exports.SITE_URL}/app`,
        description: 'Interactive personal finance sandbox for budgeting, scenario planning, savings goals, and practical financial literacy guidance.',
        offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
        },
    };
}
