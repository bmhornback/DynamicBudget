import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
    },
    {
      url: `${SITE_URL}/app`,
      lastModified: new Date(),
    },
    {
      url: `${SITE_URL}/learn`,
      lastModified: new Date(),
    },
  ];
}
