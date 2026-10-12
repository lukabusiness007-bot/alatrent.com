import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import seed from './seed.json';
import { locales } from './types';
import { toolDescription } from './seo-content';
import enrichment from './catalog-enrichment.json';
import type { Tool, Category, Settings, RentalRequest, PublicData } from './types';
import type { Order } from './commerce/types';
import { today } from './validation';
import { extraKits } from './commerce/kits';
const dir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
mkdirSync(dir, { recursive: true });
const globalDb = globalThis as unknown as { rentalDb?: DatabaseSync };
export const db = globalDb.rentalDb || new DatabaseSync(path.join(dir, 'rent-tools.sqlite'));
globalDb.rentalDb = db;
db.exec(`PRAGMA busy_timeout=10000; PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS entities (kind TEXT NOT NULL,id TEXT NOT NULL,value TEXT NOT NULL,PRIMARY KEY(kind,id));
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS auth (id INTEGER PRIMARY KEY CHECK(id=1),salt TEXT NOT NULL,hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS limits (key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);`);
export function all<T>(kind: string): T[] {
  return (
    db.prepare('SELECT value FROM entities WHERE kind=? ORDER BY rowid').all(kind) as {
      value: string;
    }[]
  ).map((r) => JSON.parse(r.value));
}
export function get<T>(kind: string, id: string): T | undefined {
  const r = db.prepare('SELECT value FROM entities WHERE kind=? AND id=?').get(kind, id) as
    { value: string } | undefined;
  return r ? JSON.parse(r.value) : undefined;
}
export function put(kind: string, id: string, value: unknown) {
  db.prepare(
    'INSERT INTO entities(kind,id,value) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET value=excluded.value',
  ).run(kind, id, JSON.stringify(value));
}
export function remove(kind: string, id: string) {
  db.prepare('DELETE FROM entities WHERE kind=? AND id=?').run(kind, id);
}
export function transaction<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
if (!get('meta', 'seeded'))
  transaction(() => {
    if (get('meta', 'seeded')) return;
    for (const c of seed.categories) put('categories', c.id, c);
    for (const t of seed.tools) put('tools', t.id, t);
    put('settings', 'main', {
      brand: 'rent tools',
      phone: '',
      email: '',
      address: '',
      standardDelivery: 1500,
      expressDelivery: 2500,
      siteUrl: '',
      deliveryNote: { sr: '', en: '', ru: '', tr: '', zh: '' },
    });
    put('meta', 'seeded', true);
  });
// One-time catalog refresh. Preserve custom prices and uploaded photographs.
if (!get('meta', 'photos-prices-no-deposit-v1'))
  transaction(() => {
    if (get('meta', 'photos-prices-no-deposit-v1')) return;
    const presets = enrichment as Record<string, { price: number; image: string }>;
    for (const tool of all<Tool>('tools')) {
      const preset = presets[tool.id];
      put('tools', tool.id, {
        ...tool,
        price: tool.price ?? preset?.price ?? null,
        image: tool.image || preset?.image || '',
        deposit: 0,
      });
    }
    for (const request of all<RentalRequest>('requests')) {
      put('requests', request.id, { ...request, deposit: 0 });
    }
    put('meta', 'photos-prices-no-deposit-v1', true);
  });
export const settings = () => get<Settings>('settings', 'main')!;
export function publicData(): PublicData {
  const categories = all<Category>('categories').filter((c) => c.published);
  return {
    categories,
    tools: all<Tool>('tools').filter(
      (t) => t.published && categories.some((c) => c.id === t.categoryId),
    ).map(tool => ({ ...tool, description: Object.fromEntries(locales.map(locale => [locale, toolDescription(tool, locale)])) as Tool['description'] })),
    settings: settings(),
  };
}
export function occupied(toolId: string, start: string, end: string, exceptId = ''): number {
  const orderLines = all<Order>('orders').filter(o => o.id !== exceptId && ['confirmed', 'active'].includes(o.status)).flatMap(o => o.items.map(i => ({ ...i, end: o.status === 'active' && i.end < today() ? '9999-12-31' : i.end, id: o.id, status: 'confirmed' })));
  const rentals = [...all<RentalRequest>('requests'), ...orderLines].filter(
    (r) =>
      r.id !== exceptId &&
      r.status === 'confirmed' &&
      r.toolId === toolId &&
      r.start <= end &&
      r.end >= start,
  );
  // Capacity is the peak daily overlap, not the sum of disjoint reservations.
  const boundaries = [start, ...rentals.map((r) => r.start).filter((d) => d >= start && d <= end)];
  return Math.max(
    0,
    ...boundaries.map((d) =>
      rentals.filter((r) => r.start <= d && r.end >= d).reduce((n, r) => n + r.quantity, 0),
    ),
  );
}

// Initial project kits are editable suggestions, with prices derived from the catalog.
if (!get('meta', 'commerce-kits-v1')) transaction(() => {
  const kits = [
    { id: 'kit-garden', name: 'Uređivanje dvorišta', description: 'Košenje, obrada ivica i skupljanje lišća. Izaberi termine za ceo komplet.', toolIds: ['tool-016', 'tool-018', 'tool-021'], discount: 5, published: true },
    { id: 'kit-tiles', name: 'Postavljanje pločica', description: 'Sečenje pločica, priprema lepka i precizno nivelisanje.', toolIds: ['tool-049', 'tool-051', 'tool-055'], discount: 5, published: true },
    { id: 'kit-clean', name: 'Dubinsko čišćenje', description: 'Komplet za usisavanje i dubinsko pranje. Prikladnost za materijal proveravamo pri potvrdi.', toolIds: ['tool-003', 'tool-004'], discount: 5, published: true },
  ];
  for (const kit of kits) if (kit.toolIds.every(id => get('tools', id)) && !get('bundles', kit.id)) put('bundles', kit.id, kit);
  const recommendations: Record<string, string[]> = { 'tool-049': ['tool-051', 'tool-055'], 'tool-016': ['tool-018', 'tool-021'], 'tool-003': ['tool-004'], 'tool-028': ['tool-051', 'tool-070'] };
  for (const [id, relatedIds] of Object.entries(recommendations)) if (get('tools', id) && !get('toolOptions', id)) put('toolOptions', id, { instructions: '', manualUrl: '', videoUrl: '', model: '', relatedIds: relatedIds.filter(id => get('tools', id)), alternativeIds: [] });
  put('meta', 'commerce-kits-v1', true);
});

// Add new job kits once; never overwrite an administrator's edits or republish removed kits.
if (!get('meta', 'commerce-kits-v2')) transaction(() => {
  if (get('meta', 'commerce-kits-v2')) return;
  for (const kit of extraKits) {
    if (!get('bundles', kit.id) && kit.toolIds.every(id => get('tools', id))) put('bundles', kit.id, kit);
  }
  put('meta', 'commerce-kits-v2', true);
});
