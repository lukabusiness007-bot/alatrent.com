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
const reduction = JSON.parse(readFileSync(new URL('../lib/catalog-reduction.json', import.meta.url)));
const replacement = id=>reduction.entries.find(e=>e.id===id)?.replacementId||id;
const nameCleanup = JSON.parse(readFileSync(new URL('../lib/catalog-name-cleanup.json', import.meta.url)));
const dir = mkdtempSync(join(tmpdir(), 'alat-rent-import-'));
const base = 'http://127.0.0.1:3017';
const password = 'import-test-secret-password';
let child, db, cookie = '', logs = '';
const saved = (kind, id) => {
  const row = db.prepare('SELECT value FROM entities WHERE kind=? AND id=?').get(kind, id);
  return row ? JSON.parse(row.value) : undefined;
};
const savedTool = id => saved('tools', id) || saved('archivedTools', id);
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
  // The presentation migration upgrades a catalog whose earlier functional
  // and model imports have already completed, as on production.
  const oldModel = seed.tools.find(t => t.id === 'crafter-63590');
  const oldName = nameCleanup.entries.find(e => e.id === oldModel.id).before;
  const { supplierReferences, ...oldSource } = oldModel.catalogModel;
  const update = (id, value) => db.prepare("UPDATE entities SET value=? WHERE kind='tools' AND id=?").run(JSON.stringify(value), id);
  update(oldModel.id, { ...oldModel, name: oldName, catalogModel: oldSource,
    description: Object.fromEntries(Object.entries(oldModel.description).map(([locale, description]) => [locale, description.replace(oldModel.name[locale], oldName[locale])])) });
  const customized = seed.tools.find(t => t.id === 'crafter-936');
  const customizedBefore = nameCleanup.entries.find(e => e.id === customized.id).before;
  update(customized.id, { ...customized, name: { ...customizedBefore, sr: 'Moja ručno nazvana bušilica' },
    description: { ...customized.description, sr: 'Moj ručno unet opis i uputstvo.' } });
  db.prepare("DELETE FROM entities WHERE kind='meta' AND id=?").run(nameCleanup.migration);
  await stop(); await start();
});
after(async () => { await stop(); db?.close(); rmSync(dir, { recursive: true, force: true }); });

test('Existing inventory receives new types without overwriting edits or duplicating a custom type', () => {
  const inventory=db.prepare("SELECT id FROM entities WHERE kind='tools'").all();const retired=new Set(reduction.entries.filter(e=>e.action!=='keep').map(e=>e.id));assert.ok(inventory.every(t=>!retired.has(t.id)));assert.ok(inventory.length<=reduction.groups.length+1);assert.equal(inventory.length+db.prepare("SELECT count(*) AS count FROM entities WHERE kind='archivedTools'").get().count,seed.tools.length);
  assert.equal(savedTool('tool-001').price, 4321);
  assert.equal(savedTool('tool-001').quantity, 7);
  assert.equal(savedTool('tool-001').image, '/media/kept.jpg');
  assert.equal(saved('tools', 'custom-plate').published, false);
  assert.equal(saved('tools', 'custom-plate').price, 7654);
  assert.equal(saved('tools', imported.tools.find(t => t.slug === 'vibro-ploca').id), undefined);
  assert.equal(saved('meta', imported.migration), true);
});

test('Admin can edit imported tools and refuses another brand or power of the same equipment type', async () => {
  const tool = imported.tools.find(t => t.slug === 'motokultivator');
  const selected=saved('tools',replacement(tool.id));const updated = { ...selected, published:false, price: 3000, quantity: 2 };
  assert.equal((await api('/api/admin/tools', updated)).status, 200);
  assert.equal(saved('tools', selected.id).price, 3000);
  assert.equal(saved('tools', selected.id).quantity, 2);
  const driver = seed.tools.find(t => t.id === 'tool-031');
  const duplicate = { ...driver, published:true, id: 'new-brand-driver', slug: 'srafilica-makita-900w', name: { ...driver.name, sr: 'Šrafilica Makita 900W' } };
  const refused = await api('/api/admin/tools', duplicate);
  assert.equal(refused.status, 409);
  assert.equal((await refused.json()).existingId, replacement(driver.id));
  assert.equal(saved('tools', duplicate.id), undefined);
  const cyrillic = await api('/api/admin/tools', { ...duplicate, id: 'cyrillic-driver', slug: 'cyrillic-driver', name: { ...driver.name, sr: 'Шрафилица Бош 18V' } });
  assert.equal(cyrillic.status, 409);
  assert.equal((await cyrillic.json()).existingId, replacement(driver.id));
});

test('Expanded types have rental prices, searchable pages and distinct identities from older equipment', async () => {
  assert.equal(saved('meta', expansion.migration), true);
  for (const tool of expansion.tools) {
    assert.equal(savedTool(tool.id).price, tool.price);
    assert.equal(savedTool(tool.id).deposit, null);
    assert.equal(savedTool(tool.id).quantity, null);
    assert.ok(tool.price > 0);
  }
  for (const slug of ['teleskopska-testera', 'ivicna-hoblerka-za-parket', 'dijamantska-busilica-sa-stalkom', 'jednodiskna-masina-za-pranje-i-poliranje-podova']) {
    const tool = expansion.tools.find(t => t.slug === slug);
    const response = await fetch(base + '/sr/alat/' + slug);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Iznajmi/);
    const duplicate = await api('/api/admin/tools', { ...tool, id: 'duplicate-' + tool.id, slug: 'duplicate-' + slug, name: { ...tool.name, sr: tool.name.sr + ' Bosch 18V' } });
    assert.equal(duplicate.status, 409, slug);
    assert.equal((await duplicate.json()).existingId, replacement(tool.id), slug);
  }
  const search = await fetch(base + '/sr/katalog?q=' + encodeURIComponent('каротирка'));
  assert.ok((await search.text()).includes(seed.tools.find(t=>t.id===replacement(expansion.tools.find(t=>t.slug==='dijamantska-busilica-sa-stalkom').id)).slug));
});

test('Four-source import adds distinct equipment and never fabricates a daily rate from service or EUR prices', async () => {
  assert.equal(saved('meta', sourcesImport.migration), true);
  for (const tool of sourcesImport.tools) {
    assert.equal(savedTool(tool.id).price, tool.price, tool.slug);
    assert.equal(savedTool(tool.id).quantity, null);
    assert.equal(savedTool(tool.id).deposit, null);
  }
  for (const slug of ['podna-brusilica-za-beton', 'fonometar']) {
    const tool = sourcesImport.tools.find(t => t.slug === slug);
    const response = await fetch(base + '/sr/alat/' + slug);
    assert.equal(response.status, 200, slug);
    assert.match(await response.text(), /Iznajmi/);
    const duplicate = await api('/api/admin/tools', { ...tool, id: 'source-duplicate-' + tool.id, slug: 'source-duplicate-' + slug, name: { ...tool.name, sr: tool.name.sr + ' Bosch 18V' } });
    assert.equal(duplicate.status, 409, slug);
    assert.equal((await duplicate.json()).existingId, replacement(tool.id));
  }
});

test('Approved Crafter models import once, distinguish models and preserve trusted source identity during admin edits', async () => {
  assert.equal(saved('meta', crafterImport.migration), true);
  assert.equal(crafterImport.tools.length, 1813);
  for (const tool of crafterImport.tools) {
    assert.ok(savedTool(tool.id), tool.id + ': ' + tool.name.sr);
    const editedCultivator=tool.id===replacement(imported.tools.find(t=>t.slug==='motokultivator').id);
    assert.equal(savedTool(tool.id).quantity, editedCultivator?2:null);
    assert.equal(savedTool(tool.id).price, editedCultivator?3000:tool.price);
  }
  const tool = saved('tools', crafterImport.tools.find(t => t.published && t.price !== null).id);
  const result = await api('/api/admin/tools', { ...tool, published:false, price: 2345, quantity: 3,
    catalogModel: { ...tool.catalogModel, productId: 'forged', purchasePrice: 1 } });
  assert.equal(result.status, 200);
  assert.deepEqual((await result.json()).catalogModel, tool.catalogModel);
  assert.equal(saved('tools', tool.id).image, tool.image);
  assert.equal(saved('tools', tool.id).price, 2345);
  const copy = await api('/api/admin/tools', { ...tool, id: 'copy-crafter', slug: 'copy-crafter', image: '' });
  assert.equal(copy.status, 409);
  assert.equal(saved('tools', 'copy-crafter'), undefined);
});

test('Name cleanup updates old titles and their references without replacing custom names, descriptions or rental data', () => {
  const preset = seed.tools.find(t => t.id === 'crafter-63590');
  const savedModel = saved('tools', preset.id);
  assert.deepEqual(savedModel.name, preset.name);
  assert.deepEqual(savedModel.description, preset.description);
  assert.deepEqual(savedModel.catalogModel.supplierReferences, ['0611316000']);
  assert.equal(savedModel.price, preset.price);
  assert.equal(savedModel.slug, preset.slug);
  assert.equal(saved('tools', 'crafter-936').name.sr, 'Moja ručno nazvana bušilica');
  assert.equal(saved('tools', 'crafter-936').description.sr, 'Moj ručno unet opis i uputstvo.');
  assert.equal(saved('meta', nameCleanup.migration), true);
});

test('Admin edits and deletions persist across server restart; startup never resets the password', async () => {
  const crafter = crafterImport.tools.find(t => t.published && t.price !== null);
  const removedCrafter = crafterImport.tools.find(t => t.published && t.price !== null && t.id !== crafter.id && !['crafter-63590','crafter-936'].includes(t.id));
  assert.equal((await fetch(base + '/api/admin/tools?id=' + removedCrafter.id, { method: 'DELETE', headers: { Origin: base, Cookie: cookie } })).status, 200);
  const deleted = imported.tools.find(t => t.slug === 'set-gedora');
  assert.equal((await fetch(base + '/api/admin/tools?id=' + deleted.id, { method: 'DELETE', headers: { Origin: base, Cookie: cookie } })).status, 200);
  const expanded = saved('tools',replacement(expansion.tools.find(t => t.slug === 'paletar').id));
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
  assert.equal(saved('tools', replacement(cultivator.id)).price, 3000);
  assert.equal(saved('tools', replacement(cultivator.id)).quantity, 2);
  assert.equal((await api('/api/login', { password })).status, 200);
  assert.equal((await api('/api/login', { password: 'another-test-password-not-used' })).status, 401);
  assert.equal((await fetch(base + '/api/admin/all', { headers: { Cookie: cookie } })).status, 200);
});
