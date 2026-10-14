import type { Metadata } from 'next';
import { copy, href } from './i18n';
import { settings } from './db';
import { languageAlternates, siteOrigin } from './site-url';
import { defaultSocialImage } from './seo-assets';
import { brandName } from './brand';
import type { Locale } from './types';

export function snippet(value: string, max = 175) {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const short = text.slice(0, max - 1);
  return short.slice(0, short.lastIndexOf(' ')) + '…';
}
export function seo(
  locale: Locale,
  path: string,
  title: string,
  description: string,
  noindex = false,
  image?: { url: string; alt: string },
  singleLanguage = false,
): Metadata {
  const s = settings();
  const origin = siteOrigin(s);
  const base = origin || 'http://localhost:3010';
  const url = base + href(locale, path);
  const brand = brandName(s.brand);
  const fullTitle = path === '' ? `${brand} — ${title}` : `${title} | ${brand}`;
  const summary = snippet(description);
  const preview = image || { ...defaultSocialImage, alt: copy[locale].rentalSeo };
  const previewImage = { ...preview, url: new URL(preview.url, base).href };
  return {
    metadataBase: new URL(base),
    applicationName: brand,
    title: fullTitle,
    description: summary,
    alternates: { canonical: url, languages: noindex ? undefined : singleLanguage ? { 'sr-Latn': url, 'x-default': url } : languageAlternates(base, path) },
    robots: { index: !!origin && !noindex, follow: true, googleBot: { index: !!origin && !noindex, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
    verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined, other: process.env.BING_SITE_VERIFICATION ? { 'msvalidate.01': process.env.BING_SITE_VERIFICATION } : undefined },
    openGraph: {
      title: fullTitle, description: summary, url, siteName: brand, type: 'website',
      locale: { sr: 'sr_RS', en: 'en_GB', ru: 'ru_RU', tr: 'tr_TR', zh: 'zh_CN' }[locale],
      images: [previewImage],
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description: summary, images: [previewImage] },
  };
}
