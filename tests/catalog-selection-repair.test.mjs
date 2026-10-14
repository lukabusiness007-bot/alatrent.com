import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { repairCatalogSelection } from '../lib/catalog-selection-repair.mjs';
import { applyCatalogAdminCleanup, catalogAdminCleanupMigration } from '../lib/catalog-admin-cleanup.mjs';
import { SQLITE_SCHEMA } from '../lib/postgres.mjs';

const manifest = JSON.parse(readFileSync('lib/catalog-reduction.json'));
const seed = JSON.parse(readFileSync('lib/seed.json'));
test('Stale completed selection can bootstrap and archive safely without changing rental history or attributes', () => {
  const db = new DatabaseSync(':memory:'); db.exec(SQLITE_SCHEMA);
  const put = (kind, id, value) => db.prepare('INSERT INTO entities VALUES(?,?,?)').run(kind,id,JSON.stringify(value));
  const get = (kind, id) => JSON.parse(db.prepare('SELECT value FROM entities WHERE kind=? AND id=?').get(kind,id).value);
  const old = { ...seed.tools.find(tool => tool.id === 'tool-097'), published: true, price: 1234, quantity: 2 };
  const selected = { ...seed.tools.find(tool => tool.id === 'crafter-20586'), published: false, price: 4321, quantity: 3 };
  put('tools', old.id, old); put('tools', selected.id, selected);
  put('meta', manifest.migration, true);
  put('orders','historic',{items:[{toolId:old.id,price:1234}]});
  try {
    assert.equal(repairCatalogSelection(db,manifest),true);
    assert.equal(get('tools',selected.id).published,true);
    assert.equal(get('tools',selected.id).price,4321);
    assert.equal(get('tools',selected.id).quantity,3);
    assert.equal(applyCatalogAdminCleanup(db,manifest),true);
    assert.equal(get('archivedTools',old.id).price,1234);
    assert.deepEqual(get('orders','historic'),{items:[{toolId:old.id,price:1234}]});
    assert.equal(repairCatalogSelection(db,manifest),false);
  } finally { db.close(); }
});
test('Completed cleanup preserves later administrator publication choices', () => {
  const db = new DatabaseSync(':memory:'); db.exec(SQLITE_SCHEMA);
  const selected = { ...seed.tools.find(tool => tool.id === 'crafter-20586'), published: false };
  db.prepare('INSERT INTO entities VALUES(?,?,?)').run('tools',selected.id,JSON.stringify(selected));
  db.prepare('INSERT INTO entities VALUES(?,?,?)').run('meta',catalogAdminCleanupMigration,'true');
  try {
    assert.equal(repairCatalogSelection(db,manifest),false);
    assert.equal(JSON.parse(db.prepare("SELECT value FROM entities WHERE kind='tools' AND id=?").get(selected.id).value).published,false);
  } finally { db.close(); }
});
