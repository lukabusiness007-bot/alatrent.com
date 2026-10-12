import type { Metadata } from 'next';
import { copy, href } from './i18n';
import { settings } from './db';
import { languageAlternates, siteOrigin } from './site-url';
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
): Metadata {
  const s = settings();
  const origin = siteOrigin(s);
  const base = origin || 'http://localhost:3010';
  const url = base + href(locale, path);
  const fullTitle = `${title} | ${s.brand}`;
  const summary = snippet(description);
  const preview = image || { url: '/images/equipment-hero.png', alt: copy[locale].rentalSeo };
  return {
    metadataBase: new URL(base),
    title: fullTitle,
    description: summary,
    alternates: { canonical: url, languages: noindex ? undefined : languageAlternates(base, path) },
    robots: { index: !!origin && !noindex, follow: true, googleBot: { index: !!origin && !noindex, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
    verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined, other: process.env.BING_SITE_VERIFICATION ? { 'msvalidate.01': process.env.BING_SITE_VERIFICATION } : undefined },
    openGraph: {
      title: fullTitle, description: summary, url, siteName: s.brand, type: 'website',
      locale: { sr: 'sr_RS', en: 'en_GB', ru: 'ru_RU', tr: 'tr_TR', zh: 'zh_CN' }[locale],
      images: [preview],
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description: summary, images: [preview] },
    icons: { icon: '/favicon.svg' },
  };
}
