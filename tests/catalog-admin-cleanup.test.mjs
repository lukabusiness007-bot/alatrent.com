import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { applyCatalogAdminCleanup, catalogAdminCleanupMigration } from '../lib/catalog-admin-cleanup.mjs';
import { SQLITE_SCHEMA } from '../lib/postgres.mjs';

const seed = JSON.parse(readFileSync('lib/seed.json'));
const manifest = JSON.parse(readFileSync('lib/catalog-reduction.json'));
function fixture() {
  const db = new DatabaseSync(':memory:'); db.exec(SQLITE_SCHEMA);
  const put = (kind, id, value) => db.prepare('INSERT INTO entities VALUES(?,?,?)').run(kind, id, JSON.stringify(value));
  for (const tool of seed.tools) put('tools', tool.id, tool);
  put('toolOptions', 'crafter-423', { model: 'Original model', costPerDay: 12 });
  put('orders', 'historical', { items: [{ toolId: 'crafter-423', price: 1234 }], status: 'active' });
  put('requests', 'legacy', { toolId: 'crafter-423', rentalTotal: 5678 });
  put('savedProjects', 'old-cart', { items: [{ toolId: 'crafter-423' }] });
  put('tools', 'custom-hidden', { id: 'custom-hidden', published: false });
  return db;
}
test('Cleanup removes all 1809 retired offers from inventory, preserving history, original records and custom offers', () => {
  const db = fixture();
  try {
    const before = db.prepare('SELECT kind,id,value FROM entities ORDER BY kind,id').all();
    const protectedRows = rows => rows.filter(r => !['tools','toolOptions','archivedTools','archivedToolOptions','meta'].includes(r.kind));
    assert.equal(applyCatalogAdminCleanup(db, manifest), true);
    const after = db.prepare('SELECT kind,id,value FROM entities ORDER BY kind,id').all();
    assert.deepEqual(protectedRows(after), protectedRows(before));
    assert.equal(after.filter(r => r.kind === 'tools').length, 189);
    assert.equal(after.filter(r => r.kind === 'archivedTools').length, 1809);
    const keep = new Set(manifest.groups.map(g => g.selectedId));
    for (const row of before.filter(r => r.kind === 'tools' && r.id !== 'custom-hidden')) {
      const destination = keep.has(row.id) ? 'tools' : 'archivedTools';
      assert.equal(after.find(r => r.kind === destination && r.id === row.id).value, row.value);
    }
    assert.equal(after.find(r => r.kind === 'archivedToolOptions').value, before.find(r => r.kind === 'toolOptions').value);
    assert.equal(after.some(r => r.kind === 'toolOptions' && r.id === 'crafter-423'), false);
    assert.equal(applyCatalogAdminCleanup(db, manifest), false);
    assert.deepEqual(db.prepare('SELECT kind,id,value FROM entities ORDER BY kind,id').all(), after);
    assert.equal(db.prepare("SELECT value FROM entities WHERE kind='meta' AND id=?").get(catalogAdminCleanupMigration).value, 'true');
  } finally { db.close(); }
});
test('A published retired offer aborts the complete cleanup without partial deletion', () => {
  const db = fixture();
  try {
    const row = db.prepare("SELECT value FROM entities WHERE kind='tools' AND id='crafter-423'").get();
    db.prepare("UPDATE entities SET value=? WHERE kind='tools' AND id='crafter-423'").run(JSON.stringify({ ...JSON.parse(row.value), published: true }));
    const before = db.prepare('SELECT kind,id,value FROM entities ORDER BY kind,id').all();
    assert.throws(() => applyCatalogAdminCleanup(db, manifest), /still published/);
    assert.deepEqual(db.prepare('SELECT kind,id,value FROM entities ORDER BY kind,id').all(), before);
  } finally { db.close(); }
});
