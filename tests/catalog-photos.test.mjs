import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { applyCatalogPhotos } from '../lib/catalog-photos-apply.mjs';
import { SQLITE_SCHEMA } from '../lib/postgres.mjs';

const seed = JSON.parse(readFileSync('lib/seed.json'));
const manifest = JSON.parse(readFileSync('lib/catalog-photos.json'));
const reduction = JSON.parse(readFileSync('lib/catalog-reduction.json'));
const sources = JSON.parse(readFileSync('docs/catalog-photo-sources.json'));

test('Every retained rental has a local product photo and recorded source', () => {
  const entries = new Map(manifest.entries.map(entry => [entry.id, entry]));
  assert.equal(entries.size, reduction.groups.length);
  for (const group of reduction.groups) {
    const entry = entries.get(group.selectedId);
    assert.ok(entry, group.selectedId);
    assert.match(entry.image, /^\/images\/catalog\/(tool-\d{3}|crafter-\d+)\.(jpg|png|webp)$/);
    assert.ok(existsSync('public' + entry.image), entry.image);
    const source = sources.find(source => source.id === entry.id);
    assert.ok(source?.source.startsWith('https://'), entry.id);
    assert.equal(source.image, entry.image);
  }
});

test('Photo migration preserves custom photos, stock, prices, descriptions and history; restores requested rentals once', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(SQLITE_SCHEMA);
  const put = (kind, id, value) => db.prepare('INSERT INTO entities VALUES(?,?,?)').run(kind, id, JSON.stringify(value));
  const get = (kind, id) => JSON.parse(db.prepare('SELECT value FROM entities WHERE kind=? AND id=?').get(kind, id).value);
  for (const entry of manifest.entries) {
    const tool = seed.tools.find(tool => tool.id === entry.id);
    put(entry.id === 'crafter-20586' ? 'archivedTools' : 'tools', entry.id, { ...tool, published: entry.id !== 'crafter-20586' });
  }
  const custom = { ...get('tools', 'tool-073'), image: '/media/custom-owner-photo.jpg', price: 7777, quantity: 3, description: { ...get('tools', 'tool-073').description, sr: 'Owner description' } };
  db.prepare("UPDATE entities SET value=? WHERE kind='tools' AND id='tool-073'").run(JSON.stringify(custom));
  put('orders', 'rental-history', { items: [{ toolId: 'tool-073', price: 4321 }] });
  put('tools', 'custom-hidden', { id: 'custom-hidden', published: false, image: '' });
  try {
    assert.equal(applyCatalogPhotos(db, manifest, seed.tools), true);
    assert.deepEqual(get('tools', 'tool-073'), custom);
    const ladder = get('tools', 'crafter-20586');
    assert.equal(ladder.published, true);
    assert.equal(ladder.price, get('archivedTools', ladder.id).price);
    assert.equal(ladder.quantity, null);
    assert.match(ladder.image, /^\/images\/catalog\//);
    assert.equal(get('tools', 'tool-076').image, manifest.entries.find(entry => entry.id === 'tool-076').image);
    assert.deepEqual(get('orders', 'rental-history'), { items: [{ toolId: 'tool-073', price: 4321 }] });
    assert.equal(get('tools', 'custom-hidden').published, false);
    const before = db.prepare('SELECT kind,id,value FROM entities ORDER BY kind,id').all();
    assert.equal(applyCatalogPhotos(db, manifest, seed.tools), false);
    assert.deepEqual(db.prepare('SELECT kind,id,value FROM entities ORDER BY kind,id').all(), before);
  } finally { db.close(); }
});
