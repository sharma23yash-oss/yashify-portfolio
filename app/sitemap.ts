import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/** Served at /sitemap.xml. Lists the pages search engines should index. The tabs (/#youtube, /#ai ...) are part of the home page. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/newsletters`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ];
}
