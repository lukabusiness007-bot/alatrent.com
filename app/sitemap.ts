import { databaseComponent } from '@/lib/db';
import type { MetadataRoute } from 'next';
import { publicData } from '@/lib/db';
import { showProjectKits } from '@/lib/commerce/features';
import { locales, href } from '@/lib/i18n';
import { SEO_CONTENT_UPDATED_AT } from '@/lib/seo-content';
import { siteOrigin, languageAlternates } from '@/lib/site-url';
export const dynamic = 'force-dynamic';
function dbsitemap(): MetadataRoute.Sitemap {
  const d = publicData();
  const base = siteOrigin(d.settings);
  if (!base) return [];
  const paths = [
    '', 'katalog', ...(showProjectKits ? ['paketi'] : []), 'klub', 'dostava', 'kako-funkcionise', 'kontakt',
    ...d.categories.filter(c => d.tools.some(t => t.categoryId === c.id)).map(c => 'kategorija/' + c.slug),
    ...d.tools.map(t => 'alat/' + t.slug),
  ];
  return locales.flatMap(locale => paths.map(path => {
    const tool = path.startsWith('alat/') ? d.tools.find(t => path === 'alat/' + t.slug) : undefined;
    return {
      url: base + href(locale, path),
      ...(tool?.updatedAt && Number.isFinite(Date.parse(tool.updatedAt)) ? { lastModified: new Date(Math.max(Date.parse(tool.updatedAt), Date.parse(SEO_CONTENT_UPDATED_AT))).toISOString() } : {}),
      ...(tool?.image ? { images: [new URL(tool.image, base).href] } : {}),
      alternates: { languages: languageAlternates(base, path) },
    };
  }));
}

export default databaseComponent(dbsitemap);
