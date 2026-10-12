import type { Locale } from './types';
export const CATALOG_PAGE_SIZE = 24;

export function catalogPage(value: unknown) {
  if (typeof value !== 'string' || !/^[1-9]\d{0,5}$/.test(value)) return 1;
  return Number(value);
}

export function catalogPagination(total: number, page = 1) {
  const pages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  const offset = (page - 1) * CATALOG_PAGE_SIZE;
  return { page, pages, offset, end: Math.min(offset + CATALOG_PAGE_SIZE, total) };
}

export function pageLabel(locale: Locale, page: number) {
  return ({ sr: 'Strana', en: 'Page', ru: 'Страница', tr: 'Sayfa', zh: '页' }[locale] || 'Page') + ' ' + page;
}

export const paginationCopy: Record<Locale, { previous: string; next: string }> = {
  sr: { previous: 'Prethodna', next: 'Sledeća' },
  en: { previous: 'Previous', next: 'Next' },
  ru: { previous: 'Предыдущая', next: 'Следующая' },
  tr: { previous: 'Önceki', next: 'Sonraki' },
  zh: { previous: '上一页', next: '下一页' },
};
