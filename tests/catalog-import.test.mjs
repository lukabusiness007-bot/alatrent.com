import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const seed = JSON.parse(readFileSync(new URL('../lib/seed.json', import.meta.url)));
const imported = JSON.parse(readFileSync(new URL('../lib/catalog-import.json', import.meta.url)));
const expansion = JSON.parse(readFileSync(new URL('../lib/catalog-expansion.json', import.meta.url)));
const sourcesImport = JSON.parse(readFileSync(new URL('../lib/catalog-sources-import.json', import.meta.url)));
const crafterImport = JSON.parse(readFileSync(new URL('../lib/catalog-crafter-import.json', import.meta.url)));
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
    env: { ...process.env, POSTGRES_URL: '', DATABASE_URL: '', POSTGRES_PRISMA_URL: '', VERCEL: '', DATA_DIR: dir, ADMIN_PASSWORD: adminPassword, PORT: '3017', APP_HOST: '127.0.0.1' },
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
  for (const tool of seed.tools.filter(t => !t.catalogModel && Number(t.id.split('-')[1]) <= 72)) {
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

test('Expanded types have rental prices, searchable pages and distinct identities from older equipment', async () => {
  assert.equal(saved('meta', expansion.migration), true);
  for (const tool of expansion.tools) {
    assert.equal(saved('tools', tool.id).price, tool.price);
    assert.equal(saved('tools', tool.id).deposit, null);
    assert.equal(saved('tools', tool.id).quantity, null);
    assert.ok(tool.price > 0);
  }
  for (const slug of ['teleskopska-testera', 'ivicna-hoblerka-za-parket', 'dijamantska-busilica-sa-stalkom', 'jednodiskna-masina-za-pranje-i-poliranje-podova']) {
    const tool = expansion.tools.find(t => t.slug === slug);
    const response = await fetch(base + '/sr/alat/' + slug);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Iznajmi/);
    const duplicate = await api('/api/admin/tools', { ...tool, id: 'duplicate-' + tool.id, slug: 'duplicate-' + slug, name: { ...tool.name, sr: tool.name.sr + ' Bosch 18V' } });
    assert.equal(duplicate.status, 409, slug);
    assert.equal((await duplicate.json()).existingId, tool.id, slug);
  }
  const search = await fetch(base + '/sr/katalog?q=' + encodeURIComponent('каротирка'));
  assert.match(await search.text(), /dijamantska-busilica-sa-stalkom/);
});

test('Four-source import adds distinct equipment and never fabricates a daily rate from service or EUR prices', async () => {
  assert.equal(saved('meta', sourcesImport.migration), true);
  for (const tool of sourcesImport.tools) {
    assert.equal(saved('tools', tool.id).price, tool.price, tool.slug);
    assert.equal(saved('tools', tool.id).quantity, null);
    assert.equal(saved('tools', tool.id).deposit, null);
  }
  for (const slug of ['podna-brusilica-za-beton', 'pneumatski-pistolj-za-ciscenje', 'fonometar', 'rucna-teleskopska-testera-za-grane']) {
    const tool = sourcesImport.tools.find(t => t.slug === slug);
    const response = await fetch(base + '/sr/alat/' + slug);
    assert.equal(response.status, 200, slug);
    assert.match(await response.text(), tool.price === null ? /Cena na upit/ : /4\.800/);
    const duplicate = await api('/api/admin/tools', { ...tool, id: 'source-duplicate-' + tool.id, slug: 'source-duplicate-' + slug, name: { ...tool.name, sr: tool.name.sr + ' Bosch 18V' } });
    assert.equal(duplicate.status, 409, slug);
    assert.equal((await duplicate.json()).existingId, tool.id);
  }
});

test('Approved Crafter models import once, distinguish models and preserve trusted source identity during admin edits', async () => {
  assert.equal(saved('meta', crafterImport.migration), true);
  assert.equal(crafterImport.tools.length, 1813);
  for (const tool of crafterImport.tools) {
    assert.ok(saved('tools', tool.id), tool.id + ': ' + tool.name.sr);
    assert.equal(saved('tools', tool.id).quantity, null);
    assert.equal(saved('tools', tool.id).price, tool.price);
  }
  const tool = crafterImport.tools.find(t => t.price !== null);
  const result = await api('/api/admin/tools', { ...tool, price: 2345, quantity: 3,
    catalogModel: { ...tool.catalogModel, productId: 'forged', purchasePrice: 1 } });
  assert.equal(result.status, 200);
  assert.deepEqual((await result.json()).catalogModel, tool.catalogModel);
  assert.equal(saved('tools', tool.id).image, tool.image);
  assert.equal(saved('tools', tool.id).price, 2345);
  const copy = await api('/api/admin/tools', { ...tool, id: 'copy-crafter', slug: 'copy-crafter', image: '' });
  assert.equal(copy.status, 409);
  assert.equal(saved('tools', 'copy-crafter'), undefined);
});

test('Admin edits and deletions persist across server restart; startup never resets the password', async () => {
  const crafter = crafterImport.tools.find(t => t.price !== null);
  const removedCrafter = crafterImport.tools.find(t => t.price === null);
  assert.equal((await fetch(base + '/api/admin/tools?id=' + removedCrafter.id, { method: 'DELETE', headers: { Origin: base, Cookie: cookie } })).status, 200);
  const deleted = imported.tools.find(t => t.slug === 'set-gedora');
  assert.equal((await fetch(base + '/api/admin/tools?id=' + deleted.id, { method: 'DELETE', headers: { Origin: base, Cookie: cookie } })).status, 200);
  const expanded = expansion.tools.find(t => t.slug === 'paletar');
  assert.equal((await api('/api/admin/tools', { ...expanded, price: 2345, quantity: 3, published: false })).status, 200);
  const removed = expansion.tools.find(t => t.slug === 'freza-za-panjeve');
  assert.equal((await fetch(base + '/api/admin/tools?id=' + removed.id, { method: 'DELETE', headers: { Origin: base, Cookie: cookie } })).status, 200);
  const sourced = sourcesImport.tools.find(t => t.slug === 'rasvetni-toranj');
  assert.equal((await api('/api/admin/tools', { ...sourced, price: 6789, quantity: 4, published: false })).status, 200);
  const removedSource = sourcesImport.tools.find(t => t.slug === 'fonometar');
  assert.equal((await fetch(base + '/api/admin/tools?id=' + removedSource.id, { method: 'DELETE', headers: { Origin: base, Cookie: cookie } })).status, 200);
  await stop(); await start('another-test-password-not-used');
  assert.equal(saved('tools', removedCrafter.id), undefined);
  assert.equal(saved('tools', crafter.id).price, 2345);
  assert.equal(saved('tools', crafter.id).quantity, 3);
  assert.equal(saved('tools', deleted.id), undefined);
  assert.equal(saved('tools', removed.id), undefined);
  assert.equal(saved('tools', removedSource.id), undefined);
  assert.equal(saved('tools', sourced.id).price, 6789);
  assert.equal(saved('tools', sourced.id).quantity, 4);
  assert.equal(saved('tools', sourced.id).published, false);
  assert.equal(saved('tools', expanded.id).price, 2345);
  assert.equal(saved('tools', expanded.id).quantity, 3);
  assert.equal(saved('tools', expanded.id).published, false);
  const cultivator = imported.tools.find(t => t.slug === 'motokultivator');
  assert.equal(saved('tools', cultivator.id).price, 3000);
  assert.equal(saved('tools', cultivator.id).quantity, 2);
  assert.equal((await api('/api/login', { password })).status, 200);
  assert.equal((await api('/api/login', { password: 'another-test-password-not-used' })).status, 401);
  assert.equal((await fetch(base + '/api/admin/all', { headers: { Cookie: cookie } })).status, 200);
});
