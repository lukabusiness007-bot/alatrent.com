import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const seed = JSON.parse(readFileSync(new URL('../lib/seed.json', import.meta.url)));
const imported = JSON.parse(readFileSync(new URL('../lib/catalog-import.json', import.meta.url)));
const dir = mkdtempSync(join(tmpdir(), 'alat-rent-import-'));
const base = 'http://127.0.0.1:3017';
const password = 'import-test-secret-password';
let child, db, cookie = '', logs = '';
const saved = (kind, id) => {
  const row = db.prepare('SELECT value FROM entities WHERE kind=? AND id=?').get(kind, id);
  return row ? JSON.parse(row.value) : undefined;
};
async function stop() {
  if (child && child.exitCode === null) {
    const exited = new Promise(resolve => child.once('exit', resolve));
    child.kill('SIGTERM'); await exited;
  }
}
async function start(adminPassword = password) {
  child = spawn(process.execPath, ['scripts/start-production.mjs'], {
    env: { ...process.env, VERCEL: '', DATA_DIR: dir, ADMIN_PASSWORD: adminPassword, PORT: '3017', APP_HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', x => logs += x); child.stderr.on('data', x => logs += x);
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(base + '/sr')).ok) return; } catch {}
    if (child.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(logs);
}
async function api(path, body) {
  return fetch(base + path, { method: 'POST', headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
before(async () => {
  db = new DatabaseSync(join(dir, 'rent-tools.sqlite'));
  db.exec('CREATE TABLE entities(kind TEXT,id TEXT,value TEXT,PRIMARY KEY(kind,id))');
  const put = (kind, id, value) => db.prepare('INSERT INTO entities VALUES(?,?,?)').run(kind, id, JSON.stringify(value));
  for (const category of seed.categories) put('categories', category.id, category);
  for (const tool of seed.tools.filter(t => Number(t.id.split('-')[1]) <= 72)) {
    put('tools', tool.id, tool.id === 'tool-001' ? { ...tool, price: 4321, quantity: 7, image: '/media/kept.jpg' } : tool);
  }
  const plate = imported.tools.find(t => t.slug === 'vibro-ploca');
  put('tools', 'custom-plate', { ...plate, id: 'custom-plate', slug: 'moja-vibro-ploca', name: { ...plate.name, sr: 'Vibro ploča Bomag 500kg' }, price: 7654, published: false });
  put('settings', 'main', { brand: 'alat rent', phone: '', email: '', address: '', siteUrl: '', standardDelivery: 1500, expressDelivery: 2500, deliveryNote: { sr: '', en: '', ru: '', tr: '', zh: '' } });
  put('meta', 'seeded', true); put('meta', 'photos-prices-no-deposit-v1', true);
  await start();
  const login = await api('/api/login', { password });
  assert.equal(login.status, 200);
  cookie = login.headers.get('set-cookie').split(';')[0];
});
after(async () => { await stop(); db?.close(); rmSync(dir, { recursive: true, force: true }); });

test('Existing inventory receives new types without overwriting edits or duplicating a custom type', () => {
  assert.equal(db.prepare("SELECT count(*) AS count FROM entities WHERE kind='tools'").get().count, seed.tools.length);
  assert.equal(saved('tools', 'tool-001').price, 4321);
  assert.equal(saved('tools', 'tool-001').quantity, 7);
  assert.equal(saved('tools', 'tool-001').image, '/media/kept.jpg');
  assert.equal(saved('tools', 'custom-plate').published, false);
  assert.equal(saved('tools', 'custom-plate').price, 7654);
  assert.equal(saved('tools', imported.tools.find(t => t.slug === 'vibro-ploca').id), undefined);
  assert.equal(saved('meta', imported.migration), true);
});

test('Admin can edit imported tools and refuses another brand or power of the same equipment type', async () => {
  const tool = imported.tools.find(t => t.slug === 'motokultivator');
  const updated = { ...tool, price: 3000, quantity: 2 };
  assert.equal((await api('/api/admin/tools', updated)).status, 200);
  assert.equal(saved('tools', tool.id).price, 3000);
  assert.equal(saved('tools', tool.id).quantity, 2);
  const driver = seed.tools.find(t => t.id === 'tool-031');
  const duplicate = { ...driver, id: 'new-brand-driver', slug: 'srafilica-makita-900w', name: { ...driver.name, sr: 'Šrafilica Makita 900W' } };
  const refused = await api('/api/admin/tools', duplicate);
  assert.equal(refused.status, 409);
  assert.equal((await refused.json()).existingId, driver.id);
  assert.equal(saved('tools', duplicate.id), undefined);
  const cyrillic = await api('/api/admin/tools', { ...duplicate, id: 'cyrillic-driver', slug: 'cyrillic-driver', name: { ...driver.name, sr: 'Шрафилица Бош 18V' } });
  assert.equal(cyrillic.status, 409);
  assert.equal((await cyrillic.json()).existingId, driver.id);
});

test('Admin edits and deletions persist across server restart; startup never resets the password', async () => {
  const deleted = imported.tools.find(t => t.slug === 'set-gedora');
  assert.equal((await fetch(base + '/api/admin/tools?id=' + deleted.id, { method: 'DELETE', headers: { Origin: base, Cookie: cookie } })).status, 200);
  await stop(); await start('another-test-password-not-used');
  assert.equal(saved('tools', deleted.id), undefined);
  const cultivator = imported.tools.find(t => t.slug === 'motokultivator');
  assert.equal(saved('tools', cultivator.id).price, 3000);
  assert.equal(saved('tools', cultivator.id).quantity, 2);
  assert.equal((await api('/api/login', { password })).status, 200);
  assert.equal((await api('/api/login', { password: 'another-test-password-not-used' })).status, 401);
  assert.equal((await fetch(base + '/api/admin/all', { headers: { Cookie: cookie } })).status, 200);
});
