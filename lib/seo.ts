import type { Metadata } from 'next';
import { SITE_BASE_PATH } from '@/lib/siteConfig';

export const SITE_URL = `https://bmhornback.github.io${SITE_BASE_PATH}`;
export const SITE_NAME = 'DynamicBudget';

export function buildCanonicalUrl(path?: string): string {
  const normalizedPath = !path || path === '/'
    ? ''
    : path.replace(/^\/+/, '').replace(/\/+$/, '');
  const baseUrl = SITE_URL.replace(/\/+$/, '');

  return normalizedPath ? `${baseUrl}/${normalizedPath}` : baseUrl;
}

export function buildMetadata({
  title,
  description,
  path = '/',
}: {
  title: string;
  description: string;
  path?: string;
}): Metadata {
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
      siteName: SITE_NAME,
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

export function buildWebApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    url: SITE_URL,
    description:
      'Interactive personal finance sandbox for budgeting, scenario planning, savings goals, and practical financial literacy guidance.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };
}
