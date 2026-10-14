import { href, copy } from '@/lib/i18n';
import { siteOrigin, languageTag } from '@/lib/site-url';
import { toolDescription, toolHeading } from '@/lib/seo-content';
import { defaultSocialImage, organizationLogo } from '@/lib/seo-assets';
import { contactPhone } from '@/lib/contact';
import type { Locale, PublicData, Settings, Tool } from '@/lib/types';

export function JsonLd({ value }: { value: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }} />;
}
export function OrganizationSchema({ settings }: { settings: Settings }) {
  const base = siteOrigin(settings);
  if (!base) return null;
  return <JsonLd value={{ '@context': 'https://schema.org', '@graph': [
    { '@type': settings.address.trim() ? 'LocalBusiness' : 'Organization', '@id': base + '/#organization', name: settings.brand,
      url: base + '/sr',
      logo: { '@type': 'ImageObject', url: base + organizationLogo, contentUrl: base + organizationLogo, width: 512, height: 512, caption: settings.brand },
      image: base + defaultSocialImage.url,
      ...(settings.phone && { telephone: contactPhone(settings.phone) }), ...(settings.email && { email: settings.email }),
      ...(settings.address.trim() && { address: { '@type': 'PostalAddress', streetAddress: settings.address, addressLocality: 'Beograd', addressCountry: 'RS' } }),
      areaServed: { '@type': 'AdministrativeArea', name: 'Grad Beograd, Srbija' } },
    { '@type': 'WebSite', '@id': base + '/#website', name: settings.brand, url: base + '/sr', publisher: { '@id': base + '/#organization' }, inLanguage: ['sr-Latn','en','ru','tr','zh-Hans'] },
  ] }} />;
}
export function BreadcrumbSchema({ settings, locale, items }: { settings: Settings; locale: Locale; items: { name: string; path: string }[] }) {
  const base = siteOrigin(settings);
  if (!base) return null;
  return <JsonLd value={{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: base + href(locale, item.path) })) }} />;
}
export function ToolSchema({ tool, data, locale }: { tool: Tool; data: PublicData; locale: Locale }) {
  const base = siteOrigin(data.settings);
  if (!base) return null;
  const url = base + href(locale, 'alat/' + tool.slug);
  // These are rental services with model/price confirmation, not items offered for retail sale.
  // Omit offers while rates are indicative, and never infer InStock from an unknown quantity.
  return <JsonLd value={{ '@context': 'https://schema.org', '@type': 'Service', '@id': url + '#rental', url,
    name: toolHeading(tool, locale), description: toolDescription(tool, locale),
    serviceType: copy[locale].rentalWord,
    ...(tool.image && { image: new URL(tool.image, base).href }),
    provider: { '@id': base + '/#organization' },
    areaServed: { '@type': 'AdministrativeArea', name: 'Grad Beograd, Srbija' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url, inLanguage: languageTag(locale) },
  }} />;
}
export function CollectionSchema({ data, locale, path, title, tools }: { data: PublicData; locale: Locale; path: string; title: string; tools: Tool[] }) {
  const base = siteOrigin(data.settings);
  if (!base) return null;
  const url = base + href(locale, path);
  return <JsonLd value={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': url, name: title, url,
    inLanguage: languageTag(locale), isPartOf: { '@id': base + '/#website' },
    mainEntity: { '@type': 'ItemList', numberOfItems: tools.length, itemListElement: tools.map((tool, i) => ({ '@type': 'ListItem', position: i + 1, name: tool.name[locale], url: base + href(locale, 'alat/' + tool.slug) })) },
  }} />;
}
