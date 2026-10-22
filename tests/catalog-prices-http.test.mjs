import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const manifest = JSON.parse(readFileSync('lib/catalog-prices.json'));
const dir = mkdtempSync(join(tmpdir(), 'catalog-prices-http-'));
const base = 'http://127.0.0.1:3021';
let child, cookie = '', logs = '', tools;
const post = (path, body) => fetch(base + path, { method: 'POST', headers: {
  Origin: base, Cookie: cookie, 'Content-Type': 'application/json',
}, body: JSON.stringify(body) });

before(async () => {
  child = spawn(process.execPath, ['scripts/start-production.mjs'], { env: {
    ...process.env, POSTGRES_URL: '', DATABASE_URL: '', POSTGRES_PRISMA_URL: '', VERCEL: '',
    DATA_DIR: dir, ADMIN_PASSWORD: 'catalog-prices-local-test-password', PORT: '3021', APP_HOST: '127.0.0.1',
  }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', chunk => logs += chunk);
  child.stderr.on('data', chunk => logs += chunk);
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(base + '/sr')).ok) { ready = true; break; } } catch {}
    if (child.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.ok(ready, logs);
  const login = await post('/api/login', { password: 'catalog-prices-local-test-password' });
  assert.equal(login.status, 200);
  cookie = login.headers.get('set-cookie').split(';')[0];
  tools = (await (await fetch(base + '/api/admin/all', { headers: { Cookie: cookie } })).json()).tools;
});
after(async () => {
  if (child?.exitCode === null) {
    const stopped = new Promise(resolve => child.once('exit', resolve));
    child.kill('SIGTERM'); await stopped;
  }
  rmSync(dir, { recursive: true, force: true });
});

test('A fresh runtime imports every EUR/RSD pair, including the two inquiry prices', () => {
  assert.equal(tools.length, 188);
  for (const entry of manifest.entries) {
    const tool = tools.find(t => t.id === entry.id);
    assert.ok(tool, entry.id);
    assert.equal(tool.price, entry.price, entry.id + ' RSD');
    assert.equal(tool.priceEur, entry.priceEur, entry.id + ' EUR');
  }
});

test('Daily tool prices and duration tables show EUR; every language explains payment in RSD', async () => {
  const tool = tools.find(t => t.id === 'crafter-62576'); // CSV explicitly pairs EUR 12 with RSD 1500.
  for (const locale of ['sr', 'en', 'ru', 'tr', 'zh']) {
    const r = await fetch(base + '/' + locale + '/alat/' + tool.slug);
    assert.equal(r.status, 200);
    const html = (await r.text()).replaceAll('<!-- -->', '');
    const daily = html.match(/class="detail-price">([^<]+)/)[1];
    assert.match(daily, /12/);
    assert.match(daily, /€/);
    assert.match(html, /EUR/);
    assert.match(html, /RSD/);
    assert.match(html, /class="product-rental-prices"[\s\S]*?€/);
    if (locale === 'sr') assert.match(html, /Naplata se vrši u dinarima/);
  }
  const inquiry = tools.find(t => t.id === 'tool-145');
  const html = await (await fetch(base + '/sr/alat/' + inquiry.slug)).text();
  assert.match(html, /class="detail-price">Cena na upit/);
  assert.doesNotMatch(html, /class="product-rental-prices"/);
});

test('Catalog maximum price uses EUR and checkout still charges the exact CSV dinar price', async () => {
  const html = await (await fetch(base + '/sr/katalog?maxPrice=4&sort=price')).text();
  const cards = [...html.matchAll(/<article class="service-card tool-card">([\s\S]*?)<\/article>/g)].map(m => m[1]);
  assert.ok(cards.length > 0);
  for (const card of cards) {
    const slug = card.match(/href="\/sr\/alat\/([^"]+)"/)[1];
    const tool = tools.find(t => t.slug === slug);
    assert.ok(tool.priceEur !== null && tool.priceEur <= 4, tool.id);
    assert.match(card, /€/);
  }
  const start = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const r = await post('/api/commerce/quote', { items: [{ toolId: 'crafter-62576', start, end: start, quantity: 1 }], delivery: 'pickup' });
  assert.equal(r.status, 200);
  const quote = await r.json();
  assert.equal(quote.items[0].price, 1500);
  assert.equal(quote.rentalTotal, 1500);
  assert.equal(quote.total, 1500);
  const cart = await (await fetch(base + '/sr/korpa')).text();
  assert.match(cart, /Naplata se vrši u dinarima/);
});

test('Admin edits preserve and validate EUR prices independently of payable RSD prices', async () => {
  const tool = tools.find(t => t.id === 'crafter-62576');
  try {
    let r = await post('/api/admin/tools', { ...tool, price: 1600, priceEur: 12.5 });
    assert.equal(r.status, 200);
    const saved = await r.json();
    assert.equal(saved.price, 1600);
    assert.equal(saved.priceEur, 12.5);
    r = await post('/api/admin/tools', { ...saved, priceEur: -1 });
    assert.equal(r.status, 400);
    const { priceEur, ...legacy } = saved;
    r = await post('/api/admin/tools', legacy);
    assert.equal((await r.json()).priceEur, 12.5);
    r = await post('/api/admin/tools', { ...legacy, price: 1700 });
    assert.equal((await r.json()).priceEur, null, 'A legacy client changing RSD must not retain a stale EUR amount');
  } finally {
    assert.equal((await post('/api/admin/tools', tool)).status, 200);
  }
});
