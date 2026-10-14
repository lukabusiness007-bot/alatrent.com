import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import seed from './seed.json';
import catalogImport from './catalog-import.json';
import catalogExpansion from './catalog-expansion.json';
import catalogSourcesImport from './catalog-sources-import.json';
import catalogCrafterImport from './catalog-crafter-import.json';
import catalogNameCleanup from './catalog-name-cleanup.json';
import catalogReduction from './catalog-reduction.json';
import catalogPhotos from './catalog-photos.json';
import { applyCatalogPhotos } from './catalog-photos-apply.mjs';
import { applyCatalogReduction } from './catalog-reduction-apply.mjs';
import { applyCatalogAdminCleanup, catalogAdminCleanupMigration } from './catalog-admin-cleanup.mjs';
import { repairCatalogSelection, catalogSelectionRepairMigration } from './catalog-selection-repair.mjs';
import { equipmentType } from './equipment-type';
import { normalizedEquipmentName } from './equipment-type';
import { randomBytes, scryptSync } from 'node:crypto';
import { locales } from './types';
import { toolDescription } from './seo-content';
import enrichment from './catalog-enrichment.json';
import type { Tool, Category, Settings, RentalRequest, PublicData } from './types';
import type { Order } from './commerce/types';
import { today } from './validation';
import { extraKits } from './commerce/kits';
import { initialJobs } from './commerce/job-seed';
import { catalogOnly, persistentDatabase } from './storage';
import { requestDatabase, withPersistentDatabase, SQLITE_SCHEMA } from './postgres.mjs';
import { defaultContact } from './contact';
const dir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
if (!catalogOnly && !persistentDatabase) mkdirSync(dir, { recursive: true });
const globalDb = globalThis as unknown as { rentalDb?: DatabaseSync };
const localDb = globalDb.rentalDb || new DatabaseSync(catalogOnly || persistentDatabase ? ':memory:' : path.join(dir, 'rent-tools.sqlite'));
globalDb.rentalDb = localDb;
// Resolve each call against the request's isolated PostgreSQL unit of work.
export const db = new Proxy(localDb, {
  get(_target, property) {
    const current = requestDatabase(localDb);
    const value = Reflect.get(current, property, current);
    return typeof value === 'function' ? value.bind(current) : value;
  },
});
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
// Historical agreements can still resolve their original model after inventory cleanup.
export const historicalTool = (id: string) => get<Tool>('tools', id) || get<Tool>('archivedTools', id);
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
function initializeDatabase() {
  db.exec((persistentDatabase ? '' : 'PRAGMA busy_timeout=10000; PRAGMA journal_mode=WAL;') + SQLITE_SCHEMA);
  if (!get('meta', 'seeded'))
    transaction(() => {
      if (get('meta', 'seeded')) return;
      for (const c of seed.categories) put('categories', c.id, c);
      for (const t of seed.tools) put('tools', t.id, t);
      put('settings', 'main', {
        brand: 'alat rent',
        phone: defaultContact.phone,
        email: defaultContact.email,
        address: '',
        standardDelivery: 1500,
        expressDelivery: 2500,
        siteUrl: '',
        deliveryNote: { sr: '', en: '', ru: '', tr: '', zh: '' },
      });
      put('meta', 'seeded', true);
    });
  // Fill missing contact details once; later edits remain under admin control.
  if (!get('meta', 'alat-rent-contact-v1'))
    transaction(() => {
      if (get('meta', 'alat-rent-contact-v1')) return;
      const current = get<Settings>('settings', 'main');
      if (current) {
        put('settings', 'main', {
          ...current,
          phone: current.phone.trim() || defaultContact.phone,
          email: current.email.trim() || defaultContact.email,
        });
      }
      put('meta', 'alat-rent-contact-v1', true);
    });
  // Rename the original brand in existing installations as well as new catalogs.
  if (!get('meta', 'alat-rent-brand-v1'))
    transaction(() => {
      if (get('meta', 'alat-rent-brand-v1')) return;
      const current = get<Settings>('settings', 'main');
      if (current?.brand.trim().toLowerCase() === 'rent tools') {
        put('settings', 'main', { ...current, brand: 'alat rent' });
      }
      put('meta', 'alat-rent-brand-v1', true);
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
          deposit: tool.deposit,
        });
      }
      put('meta', 'photos-prices-no-deposit-v1', true);
    });
  // Membership benefits apply immediately; completed rentals unlock deposit-free rental.
  if (!get('meta', 'club-deposit-policy-v1'))
    transaction(() => {
      if (get('meta', 'club-deposit-policy-v1')) return;
      const cfg = get<Record<string, unknown>>('commerce', 'config');
      if (cfg) put('commerce', 'config', { ...cfg, clubThreshold: 3, clubPercent: 5 });
      for (const tool of all<Tool>('tools')) {
        if (tool.deposit === 0) put('tools', tool.id, { ...tool, deposit: null, published: tool.published && catalogReduction.entries.some(e=>e.id===tool.id&&e.action==='keep') });
      }
      put('meta', 'club-deposit-policy-v1', true);
    });
  // Import new equipment types once into existing databases. Preserve edited
  // records, custom IDs, prices, quantities, photos and removed imported tools.
  for (const importedCatalog of [catalogImport, catalogExpansion, catalogSourcesImport]) {
    if (!get('meta', importedCatalog.migration))
      transaction(() => {
        if (get('meta', importedCatalog.migration)) return;
        const existing = all<Tool>('tools');
        const knownTypes = new Set(existing.map(tool => equipmentType(tool.name.sr)));
        for (const tool of importedCatalog.tools) {
          const type = equipmentType(tool.name.sr);
          if (get('tools', tool.id) || get('archivedTools', tool.id) || existing.some(saved => saved.slug === tool.slug) || knownTypes.has(type)) continue;
          if (!get('categories', tool.categoryId)) {
            const category = seed.categories.find(category => category.id === tool.categoryId);
            if (category) put('categories', category.id, category);
          }
          put('tools', tool.id, { ...tool, deposit: null, published: tool.published && catalogReduction.entries.some(e=>e.id===tool.id&&e.action==='keep') });
          knownTypes.add(type);
        }
        put('meta', importedCatalog.migration, true);
      });
  }

  // Distinct supplier models may share a function. Import once, preserving
  // administrator edits, custom stock, hidden records and later deletions.
  if (!get('meta', catalogCrafterImport.migration)) transaction(() => {
    if (get('meta', catalogCrafterImport.migration)) return;
    const existing = all<Tool>('tools');
    const slugs = new Set(existing.map(t => t.slug));
    const names = new Set(existing.filter(t => !t.catalogModel).map(t => normalizedEquipmentName(t.name.sr)));
    const models = new Set(existing.filter(t => t.catalogModel).map(t => t.catalogModel!.productId));
    for (const category of catalogCrafterImport.categories)
      if (!get('categories', category.id)) put('categories', category.id, category);
    for (const imported of catalogCrafterImport.tools) {
      if (get('tools', imported.id) || get('archivedTools', imported.id) || slugs.has(imported.slug)
        || names.has(normalizedEquipmentName(imported.name.sr)) || models.has(imported.catalogModel.productId)) continue;
      const tool = imported as Tool;
      put('tools', tool.id, { ...tool, published: tool.published && catalogReduction.entries.some(e=>e.id===tool.id&&e.action==='keep') });
      slugs.add(tool.slug); models.add(tool.catalogModel!.productId);
    }
    put('meta', catalogCrafterImport.migration, true);
  });

  if (!get('meta', catalogNameCleanup.migration)) transaction(() => {
    if (get('meta', catalogNameCleanup.migration)) return;
    for (const entry of catalogNameCleanup.entries) {
      const tool = get<Tool>('tools', entry.id);
      if (!tool) continue;
      const name = { ...tool.name }, description = { ...tool.description };
      let changed = false;
      for (const locale of locales) if (name[locale] === entry.before[locale] && name[locale] !== entry.after[locale]) {
        description[locale] = description[locale].replace(name[locale], entry.after[locale]);
        name[locale] = entry.after[locale]; changed = true;
      }
      if (changed) put('tools', tool.id, { ...tool, name, description, updatedAt: catalogNameCleanup.createdAt,
        ...(tool.catalogModel && entry.references.length ? { catalogModel: { ...tool.catalogModel,
          supplierReferences: [...new Set([...(tool.catalogModel.supplierReferences || []), ...entry.references])] } } : {}),
      });
    }
    put('meta', catalogNameCleanup.migration, true);
  });

  if (!get('meta', 'suggested-import-prices-v1')) transaction(() => {
    if (get('meta', 'suggested-import-prices-v1')) return;
    for (const tool of all<Tool>('tools')) {
      const preset = (enrichment as Record<string, { price: number; image: string }>)[tool.id];
      if (tool.price === null && preset) put('tools', tool.id, { ...tool, price: preset.price });
    }
    put('meta', 'suggested-import-prices-v1', true);
  });

  // An explicitly configured secret bootstraps first-time hosted admin access.
  // Existing password hashes are never overwritten on startup or redeploy.
  if (!catalogOnly && process.env.ADMIN_PASSWORD && !db.prepare('SELECT id FROM auth WHERE id=1').get()) {
    if (process.env.ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD mora imati najmanje 12 znakova.');
    const salt = randomBytes(32).toString('hex');
    db.prepare('INSERT OR IGNORE INTO auth VALUES(1,?,?)').run(
      salt, scryptSync(process.env.ADMIN_PASSWORD, salt, 64).toString('hex'),
    );
  }

  initializeKits();
  if (!get('meta', 'commerce-merchandising-v1')) transaction(() => {
    if (get('meta', 'commerce-merchandising-v1')) return;
    for (const job of initialJobs) if (!get('rentalJobs',job.id)) put('rentalJobs',job.id,{...job,toolIds:job.toolIds.filter(id=>get('tools',id))});
    if (!get('commerce','merchandising')) put('commerce','merchandising',{recommendationsEnabled:false,promotionsEnabled:false});
    put('meta','commerce-merchandising-v1',true);
  });
  applyCatalogReduction(db, catalogReduction);
  repairCatalogSelection(db, catalogReduction);
  applyCatalogAdminCleanup(db, catalogReduction);
  applyCatalogPhotos(db, catalogPhotos, seed.tools);
  if (catalogOnly) db.exec('PRAGMA query_only=ON');
}

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
  const orderLines = all<Order>('orders').filter(o => o.id !== exceptId && ['confirmed', 'active'].includes(o.status)).flatMap(o => o.items.map(i => ({ ...i, end: i.openEnded || (o.status === 'active' && i.end < today()) ? '9999-12-31' : i.end, id: o.id, status: 'confirmed' })));
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

function initializeKits() {
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
}

if (!persistentDatabase) initializeDatabase();

// Keep this list in step with initializeDatabase, including any schema upgrade
// marker added in future. A missing flag or bootstrap password still runs the
// full initializer under its cross-instance transaction lock.
const initializationCompletion = {
  meta: ['seeded', 'alat-rent-contact-v1', 'alat-rent-brand-v1',
    'photos-prices-no-deposit-v1', 'club-deposit-policy-v1',
    catalogImport.migration, catalogExpansion.migration, catalogSourcesImport.migration,
    catalogCrafterImport.migration, catalogNameCleanup.migration,
    'suggested-import-prices-v1', 'commerce-kits-v1', 'commerce-kits-v2', 'commerce-merchandising-v1', catalogReduction.migration, catalogSelectionRepairMigration, catalogAdminCleanupMigration, catalogPhotos.migration],
  requireAuth: !catalogOnly && !!process.env.ADMIN_PASSWORD,
};

export function withDatabase<T>(fn: () => T | Promise<T>, write = false): Promise<T> {
  return withPersistentDatabase(initializeDatabase, fn, write, initializationCompletion);
}
export function databaseComponent<A extends unknown[], T>(fn: (...args: A) => T | Promise<T>) {
  return (...args: A) => withDatabase(() => fn(...args));
}
// Only use projections at read-only boundaries whose data dependencies are known.
export function publicDatabaseComponent<A extends unknown[], T>(fn: (...args: A) => T | Promise<T>, entityKinds: string[]) {
  return (...args: A) => withPersistentDatabase(initializeDatabase, () => fn(...args), false, initializationCompletion, { entityKinds });
}
export function withCurrentInventory<T>(fn: () => T | Promise<T>) {
  return withPersistentDatabase(initializeDatabase, fn, false, initializationCompletion, { excludeArchived: true });
}
export function databaseRoute<A extends unknown[]>(fn: (...args: A) => Response | Promise<Response>, write = false) {
  return (...args: A): Promise<Response> => withDatabase(() => fn(...args), write).catch(() =>
    Response.json({ error: 'Baza trenutno nije dostupna. Pokušaj ponovo.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }),
  );
}
