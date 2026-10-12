import { href, locales } from './i18n';
import type { Locale } from './types';

export function publicOrigin(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) return undefined;
    if (!url.hostname.includes('.') || /^(localhost|127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname) || /\.(localhost|local|test)$/.test(url.hostname)) return undefined;
    return url.origin;
  } catch { return undefined; }
}
export function siteOrigin(settings: { siteUrl: string }) {
  return publicOrigin(settings.siteUrl || process.env.SITE_URL);
}
export const languageTag = (locale: Locale) => locale === 'sr' ? 'sr-Latn' : locale === 'zh' ? 'zh-Hans' : locale;
export function languageAlternates(base: string, path: string) {
  return Object.fromEntries([
    ...locales.map(locale => [languageTag(locale), base + href(locale, path)]),
    ['x-default', base + href('sr', path)],
  ]);
}
