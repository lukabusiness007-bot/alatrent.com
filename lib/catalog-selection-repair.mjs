import { applyCatalogReduction } from './catalog-reduction-apply.mjs';
import { catalogAdminCleanupMigration } from './catalog-admin-cleanup.mjs';

export const catalogSelectionRepairMigration = 'catalog-selection-repair-2026-10-14-v1';

/** Older selection manifests reused a marker while the selected model changed.
 * Reconcile that state before archiving; never reopen completed admin cleanup.
 */
export function repairCatalogSelection(db, manifest) {
  const read = (id) => db.prepare("SELECT value FROM entities WHERE kind='meta' AND id=?").get(id);
  if (read(catalogSelectionRepairMigration)) return false;
  const retired = new Set(manifest.entries.filter(entry => entry.action !== 'keep').map(entry => entry.id));
  const stale = !read(catalogAdminCleanupMigration) && db.prepare("SELECT id,value FROM entities WHERE kind='tools'").all()
    .some(row => retired.has(row.id) && JSON.parse(row.value).published);
  if (stale) return applyCatalogReduction(db, { ...manifest, migration: catalogSelectionRepairMigration });
  db.prepare("INSERT INTO entities(kind,id,value) VALUES('meta',?,'true') ON CONFLICT(kind,id) DO NOTHING")
    .run(catalogSelectionRepairMigration);
  return false;
}
