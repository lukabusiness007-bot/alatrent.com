import { publicDatabaseComponent } from '@/lib/db';
import type { MetadataRoute } from 'next';
import { settings } from '@/lib/db';
import { siteOrigin } from '@/lib/site-url';
export const dynamic = 'force-dynamic';
function dbrobots(): MetadataRoute.Robots {
  const base = siteOrigin(settings());
  return {
    rules: {
      userAgent: '*', allow: base ? '/' : undefined,
      // Account, cart, filters and guides remain crawlable so their noindex can be read.
      disallow: base ? ['/admin', '/api/'] : ['/'],
    },
    sitemap: base ? base + '/sitemap.xml' : undefined,
  };
}

export default publicDatabaseComponent(dbrobots, ['settings']);
