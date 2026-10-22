import { locales, type Localized } from './types';
export function text(v: unknown, max = 200, required = true) {
  if (typeof v !== 'string' || v.length > max || (required && !v.trim()))
    throw new Error('Proveri obavezna polja i dužinu teksta.');
  return v.trim();
}
export function emailAddress(v: unknown) {
  const email = text(v, 150).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Unesi ispravan email.');
  return email;
}
export function localized(v: unknown, max = 200): Localized {
  if (!v || typeof v !== 'object') throw new Error('Potrebni su prevodi za svih pet jezika.');
  return Object.fromEntries(
    locales.map((l) => [l, text((v as Record<string, unknown>)[l], max)]),
  ) as Localized;
}
export function amount(v: unknown, nullable = true) {
  if (v === null && nullable) return null;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 10000000)
    throw new Error('Neispravan iznos.');
  return Math.round(v);
}
export function euroAmount(v: unknown) {
  if (v === null) return null;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 10000000)
    throw new Error('Neispravna cena u evrima.');
  return Math.round((v + Number.EPSILON) * 100) / 100;
}
export function slug(v: unknown) {
  const s = text(v, 160);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s))
    throw new Error('URL oznaka: mala slova, brojevi i crtice.');
  return s;
}
export function date(v: unknown) {
  const s = text(v, 10);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    !Number.isFinite(Date.parse(s)) ||
    new Date(s).toISOString().slice(0, 10) !== s
  )
    throw new Error('Neispravan datum.');
  return s;
}
export const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Belgrade',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export function rentalDays(start: string, end: string) {
  return Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
}
