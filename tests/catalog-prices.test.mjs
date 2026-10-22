import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { applyCatalogPrices } from '../lib/catalog-prices-apply.mjs';
import { dailyPrice, formatDailyPrice, formatToolAmount } from '../lib/catalog-pricing.mjs';

const manifest = JSON.parse(readFileSync(new URL('../lib/catalog-prices.json', import.meta.url)));
const selection = JSON.parse(readFileSync(new URL('../lib/catalog-reduction.json', import.meta.url)));
const read = (db, kind, id) => JSON.parse(db.prepare('SELECT value FROM entities WHERE kind=? AND id=?').get(kind, id).value);
const put = (db, kind, id, value) => db.prepare('INSERT OR REPLACE INTO entities VALUES(?,?,?)').run(kind, id, JSON.stringify(value));
function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE entities(kind TEXT,id TEXT,value TEXT,PRIMARY KEY(kind,id))');
  return db;
}

test('Owner price list covers all 188 selected tools, with 186 paired prices and two inquiries', () => {
  assert.equal(manifest.entries.length, 188);
  assert.deepEqual(manifest.entries.map(e => e.id).sort(), selection.entries.filter(e => e.action === 'keep').map(e => e.id).sort());
  assert.equal(manifest.entries.filter(e => e.price !== null && e.priceEur !== null).length, 186);
  assert.deepEqual(manifest.entries.filter(e => e.price === null).map(e => e.id).sort(), ['tool-145', 'tool-146']);
});

test('Price migration changes only current daily prices once, preserving stock, archives and agreed rentals', () => {
  const db = fixture();
  try {
    const entry = manifest.entries.find(e => e.id === 'crafter-62576');
    const tool = { id: entry.id, price: 9000, quantity: 3, published: false, image: '/own-photo.png', deposit: 5000 };
    put(db, 'tools', tool.id, tool);
    put(db, 'tools', 'tool-145', { id: 'tool-145', price: 15000 });
    put(db, 'archivedTools', 'old-tool', { id: 'old-tool', price: 777 });
    put(db, 'orders', 'confirmed', { total: 9000, items: [{ toolId: tool.id, price: 9000 }] });
    assert.equal(applyCatalogPrices(db, manifest), true);
    assert.deepEqual(read(db, 'tools', tool.id), { ...tool, price: 1500, priceEur: 12, updatedAt: manifest.createdAt });
    assert.equal(read(db, 'tools', 'tool-145').price, null);
    assert.equal(read(db, 'tools', 'tool-145').priceEur, null);
    assert.equal(read(db, 'archivedTools', 'old-tool').price, 777);
    assert.equal(read(db, 'orders', 'confirmed').items[0].price, 9000);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM entities WHERE kind='tools'").get().n, 2);
    put(db, 'tools', tool.id, { ...read(db, 'tools', tool.id), price: 1800, priceEur: 15 });
    assert.equal(applyCatalogPrices(db, manifest), false);
    assert.equal(read(db, 'tools', tool.id).price, 1800);
  } finally { db.close(); }
});

test('Invalid price pairs roll back all writes and leave the migration retryable', () => {
  const db = fixture();
  try {
    put(db, 'tools', 'one', { id: 'one', price: 99 });
    const broken = { ...manifest, entries: [{ id: 'one', price: 100, priceEur: 1 }, { id: 'two', price: 200, priceEur: null }] };
    assert.throws(() => applyCatalogPrices(db, broken), /Neispravne cene/);
    assert.equal(read(db, 'tools', 'one').price, 99);
    assert.equal(db.prepare("SELECT id FROM entities WHERE kind='meta'").get(), undefined);
  } finally { db.close(); }
});

test('Public display uses the supplied EUR amount without inferring a rate; inquiry and legacy RSD values remain valid', () => {
  for (const locale of ['sr', 'en', 'ru', 'tr', 'zh']) {
    const tool = { price: 1500, priceEur: 12 };
    assert.equal(dailyPrice(tool), 12);
    assert.match(formatDailyPrice(tool, locale), /12/);
    assert.match(formatDailyPrice(tool, locale), /€/);
    assert.doesNotMatch(formatDailyPrice(tool, locale), /1500|1[., ]500/);
    assert.match(formatToolAmount(tool, 11.4, locale), /11[.,]4/);
  }
  assert.equal(dailyPrice({ price: null, priceEur: null }), null);
  assert.equal(formatDailyPrice({ price: null, priceEur: null }), '');
  assert.equal(dailyPrice({ price: 1500 }), 1500);
  assert.doesNotMatch(formatDailyPrice({ price: 1500 }, 'en'), /€/);
});
