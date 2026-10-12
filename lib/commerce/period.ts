import type { CartItem } from './types';

export const capacityEnd = (item: Pick<CartItem, 'end' | 'openEnded'>) =>
  item.openEnded ? '9999-12-31' : item.end;

export const periodReady = (item: Pick<CartItem, 'start' | 'end' | 'openEnded'>) =>
  !!item.start && (item.openEnded === true || !!item.end);

export function endForDays(start: string, days: number) {
  if (!start || !Number.isInteger(days) || days < 1 || days > 90) return '';
  const at = Date.parse(start) + (days - 1) * 86400000;
  return Number.isFinite(at) ? new Date(at).toISOString().slice(0, 10) : '';
}

export function durationDays(start: string, end: string) {
  return start && end ? Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1 : 0;
}
