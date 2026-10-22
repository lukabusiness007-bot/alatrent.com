import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
const dir = mkdtempSync(join(tmpdir(), 'rent-tools-test-'));
const base = 'http://127.0.0.1:3011';
const password = 'local-test-password-2026';
let child;
let cookie = '';
let logs = '';
const env = { ...process.env, POSTGRES_URL: '', DATABASE_URL: '', POSTGRES_PRISMA_URL: '', DATA_DIR: dir, ADMIN_PASSWORD: password };
async function api(path, body, method = 'POST', auth = true, origin = base) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      ...(auth ? { Cookie: cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    result = null;
  }
  return { response, result };
}
before(async () => {
  const reset = spawnSync(process.execPath, ['scripts/reset-admin.mjs'], { env, encoding: 'utf8' });
  assert.equal(reset.status, 0, reset.stderr);
  child = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3011'],
    { env, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  child.stdout.on('data', (x) => (logs += x));
  child.stderr.on('data', (x) => (logs += x));
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(base + '/sr');
      if (r.status === 200) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Test server failed: ' + logs);
});
after(async () => {
  if (child) {
    child.kill('SIGTERM');
    await new Promise((r) => child.once('exit', r));
  }
  rmSync(dir, { recursive: true, force: true });
});
test('Five server-rendered languages, metadata, catalog and safe preview SEO', async () => {
  for (const [lang, title] of [
    ['sr', 'Najniže cene i najveći izbor alata'],
    ['en', 'The lowest prices and widest tool selection'],
    ['ru', 'Самые низкие цены и самый большой выбор'],
    ['tr', 'En düşük fiyatlar, en geniş alet seçimi'],
    ['zh', '最低价格，最全工具选择'],
  ]) {
    const r = await fetch(base + '/' + lang);
    const html = await r.text();
    assert.equal(r.status, 200);
    assert.ok(html.includes(title));
    assert.match(html, /noindex/);
    assert.match(html, /rel="canonical"/);
    assert.match(html, /hrefLang="zh-Hans"/);
  }
  const root = await fetch(base, { redirect: 'manual' });
  assert.equal(root.status, 308);
  assert.equal(new URL(root.headers.get('location'), base).href, base + '/sr');
  const filtered = await fetch(base + '/sr/katalog?q=laser');
  assert.equal(filtered.status, 200);
  assert.match(await filtered.text(), /Laserski nivelator/);
  for (const path of ['/sr/alat/not-real', '/sr/no-page', '/sr/katalog/extra', '/xx'])
    assert.equal((await fetch(base + path)).status, 404, path);
  const robots = await (await fetch(base + '/robots.txt')).text();
  assert.match(robots, /Disallow: \//);
});
test('Admin requires login and same-origin writes', async () => {
  assert.equal((await api('/api/admin/all', undefined, 'GET', false)).response.status, 401);
  assert.equal((await api('/api/admin/tools', {}, 'POST', false)).response.status, 403);
  assert.equal(
    (await api('/api/login', { password }, 'POST', false, 'https://other.example')).response.status,
    403,
  );
  assert.equal(
    (await api('/api/login', { password: 'wrong' }, 'POST', false)).response.status,
    401,
  );
  const result = await api('/api/login', { password }, 'POST', false);
  assert.equal(result.response.status, 200);
  const c = result.response.headers.get('set-cookie');
  assert.ok(c.includes('HttpOnly'));
  assert.ok(c.includes('SameSite=strict'));
  cookie = c.split(';')[0];
});
let category, tool, requestOne, requestTwo;
const translations = (s) => ({
  sr: s,
  en: 'English ' + s,
  ru: 'Русский ' + s,
  tr: 'Türkçe ' + s,
  zh: '中文 ' + s,
});
test('Create, update, hide and delete categories and tools with all translations', async () => {
  let r = await api('/api/admin/categories', {
    slug: 'test-category',
    name: translations('Test kategorija'),
    icon: '3',
    published: true,
  });
  assert.equal(r.response.status, 200);
  category = r.result;
  r = await api('/api/admin/tools', {
    slug: 'test-drill',
    name: translations('Test inventar'),
    description: translations('Opis alata'),
    categoryId: category.id,
    price: 1000,
    deposit: 5000,
    quantity: 1,
    image: '/images/catalog/tool-001.jpg',
    published: true,
    featured: true,
  });
  assert.equal(r.response.status, 200);
  tool = r.result;
  assert.equal((await api('/api/admin/tools', { ...tool, image: '' })).response.status, 400,
    'Published rentals require a real photograph');
  assert.equal(tool.deposit, null, "deposits are agreed per rental rather than per tool");
  assert.equal((await fetch(base + '/en/alat/test-drill')).status, 200);
  assert.equal(
    (await api('/api/admin/tools', { ...tool, id: undefined })).response.status,
    400,
    'duplicate slug',
  );
  assert.equal((await api('/api/admin/tools', { ...tool, quantity: -1 })).response.status, 400);
  assert.equal(
    (await api('/api/admin/tools', { ...tool, name: { sr: 'Only Serbian' } })).response.status,
    400,
  );
  assert.equal(
    (await api('/api/admin/categories?id=' + category.id, undefined, 'DELETE')).response.status,
    409,
  );
  r = await api('/api/admin/categories', { ...category, published: false });
  assert.equal(r.response.status, 200);
  assert.equal((await fetch(base + '/en/alat/test-drill')).status, 404);
  await api('/api/admin/categories', category);
  assert.equal((await api('/api/admin/tools', { ...tool, id: undefined, slug: 'duplicate-type' })).response.status, 409, 'same equipment type cannot use a new slug');
  const extra = await api('/api/admin/tools', { ...tool, id: undefined, slug: 'disposable-tool', name: translations('Disposable alat') });
  assert.equal(extra.response.status, 200);
  assert.equal(
    (await api('/api/admin/tools?id=' + extra.result.id, undefined, 'DELETE')).response.status,
    200,
  );
  assert.equal((await fetch(base + '/sr/alat/disposable-tool')).status, 404);
});
const future = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const booking = () => ({
  toolId: tool.id,
  name: 'Test korisnik',
  phone: '+381600000001',
  email: 'test@example.com',
  address: 'Test adresa 10, Beograd',
  note: 'Automatski test',
  start: future(20),
  end: future(22),
  quantity: 1,
  delivery: 'standard',
  locale: 'sr',
  consent: true,
  website: '',
});
test('Request is saved with server-side prices and validated dates/consent', async () => {
  assert.equal(
    (await api('/api/requests', { ...booking(), start: '2020-01-01' }, 'POST', false)).response
      .status,
    400,
  );
  assert.equal(
    (await api('/api/requests', { ...booking(), consent: false }, 'POST', false)).response.status,
    400,
  );
  assert.equal(
    (await api('/api/requests', { ...booking(), quantity: 0 }, 'POST', false)).response.status,
    400,
  );
  assert.equal(
    (await api('/api/requests', { ...booking(), address: '' }, 'POST', false)).response.status,
    400,
  );
  let r = await api(
    '/api/requests',
    { ...booking(), rentalTotal: 1, deliveryTotal: 1 },
    'POST',
    false,
  );
  assert.equal(r.response.status, 201);
  requestOne = r.result.id;
  r = await api('/api/admin/all', undefined, 'GET');
  let saved = r.result.requests.find((x) => x.id === requestOne);
  assert.equal(saved.rentalTotal, 3000);
  assert.equal(saved.deliveryTotal, 1500);
  assert.equal(saved.deposit, null);
  assert.equal(saved.depositWaived, false);
  assert.equal(saved.days, 3);
  assert.equal(saved.status, 'pending');
  r = await api('/api/requests', { ...booking(), phone: '+381600000002' }, 'POST', false);
  assert.equal(r.response.status, 201);
  requestTwo = r.result.id;
});
test('Confirmation prevents double booking and cancellation releases capacity', async () => {
  assert.equal(
    (await api('/api/admin/requests', { id: requestOne, status: 'confirmed', deposit: 1000 })).response.status,
    200,
  );
  assert.equal(
    (await api('/api/admin/requests', { id: requestTwo, status: 'confirmed', deposit: 1000 })).response.status,
    400,
  );
  const unavailable = await api(
    '/api/requests',
    { ...booking(), phone: '+381600000003' },
    'POST',
    false,
  );
  assert.equal(unavailable.response.status, 409);
  assert.equal(unavailable.result.error, 'unavailable');
  await api('/api/admin/requests', { id: requestOne, status: 'cancelled' });
  assert.equal(
    (await api('/api/admin/requests', { id: requestTwo, status: 'confirmed', deposit: 1000 })).response.status,
    200,
  );
  assert.equal(
    (await api('/api/admin/tools?id=' + tool.id, undefined, 'DELETE')).response.status,
    409,
  );
});
test('Upload validates actual file format and serves persistent image', async () => {
  const form = new FormData();
  form.set('file', new Blob(['<svg onload="alert(1)"></svg>'], { type: 'image/png' }), 'fake.png');
  let r = await fetch(base + '/api/uploads', {
    method: 'POST',
    headers: { Origin: base, Cookie: cookie },
    body: form,
  });
  assert.equal(r.status, 400);
  const good = new FormData();
  good.set(
    'file',
    new Blob(
      [
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
          'base64',
        ),
      ],
      { type: 'image/png' },
    ),
    'test.png',
  );
  r = await fetch(base + '/api/uploads', {
    method: 'POST',
    headers: { Origin: base, Cookie: cookie },
    body: good,
  });
  assert.equal(r.status, 200);
  const body = await r.json();
  r = await fetch(base + body.url);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/png');
});
test('Settings update delivery and public SEO; logout invalidates session', async () => {
  const { result } = await api('/api/admin/all', undefined, 'GET');
  const s = {
    ...result.settings,
    standardDelivery: 1800,
    siteUrl: 'https://rental.example',
    deliveryNote: translations('Zona po dogovoru'),
  };
  assert.equal((await api('/api/admin/settings', s)).response.status, 200);
  const sitemap = await (await fetch(base + '/sitemap.xml')).text();
  assert.match(sitemap, /https:\/\/rental.example\/sr/);
  assert.match(sitemap, /hreflang="zh-Hans"/);
  assert.ok(!sitemap.includes('/admin'));
  assert.match(await (await fetch(base + '/robots.txt')).text(), /Disallow: \/admin/);
  assert.equal((await api('/api/logout', {})).response.status, 200);
  assert.equal((await api('/api/admin/all', undefined, 'GET')).response.status, 401);
});
