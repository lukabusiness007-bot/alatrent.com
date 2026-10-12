export const catalogAdminCleanupMigration = 'catalog-admin-cleanup-2026-10-13-v1';

/** Remove retired offers from the editable inventory, preserving rental history internally. */
export function applyCatalogAdminCleanup(db, manifest) {
  const read = db.prepare('SELECT value FROM entities WHERE kind=? AND id=?');
  if (read.get('meta', catalogAdminCleanupMigration)?.value === 'true') return false;
  const put = db.prepare('INSERT INTO entities(kind,id,value) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET value=excluded.value');
  const remove = db.prepare('DELETE FROM entities WHERE kind=? AND id=?');
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const entry of manifest.entries) {
      if (entry.action === 'keep') continue;
      const row = read.get('tools', entry.id);
      if (row) {
        if (JSON.parse(row.value).published) throw new Error('Retired offer is still published; cleanup aborted.');
        put.run('archivedTools', entry.id, row.value);
        remove.run('tools', entry.id);
      }
      const options = read.get('toolOptions', entry.id);
      if (options) {
        put.run('archivedToolOptions', entry.id, options.value);
        remove.run('toolOptions', entry.id);
      }
    }
    put.run('meta', catalogAdminCleanupMigration, 'true');
    db.exec('COMMIT');
    return true;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
