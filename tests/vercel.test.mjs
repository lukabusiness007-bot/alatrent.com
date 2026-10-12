import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const dir = mkdtempSync(join(tmpdir(), 'rent-vercel-test-'));
const blocked = join(dir, 'not-a-directory');
writeFileSync(blocked, 'No database can be created below this file.');
const base = 'http://127.0.0.1:3016';
let child, logs = '';

before(async () => {
  child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3016'], {
    env: { ...process.env, VERCEL: '1', DATA_DIR: join(blocked, 'data') },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', chunk => logs += chunk);
  child.stderr.on('data', chunk => logs += chunk);
  for (let attempt = 0; attempt < 80; attempt++) {
    try { if ((await fetch(base + '/sr')).status === 200) return; } catch {}
    if (child.exitCode !== null) break;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Vercel-mode server failed: ' + logs);
});

after(async () => {
  if (child && child.exitCode === null) {
    const exited = new Promise(resolve => child.once('exit', resolve));
    child.kill('SIGTERM');
    await exited;
  }
  rmSync(dir, { recursive: true, force: true });
});

test('Vercel renders catalog without a writable data directory', async () => {
  for (const locale of ['sr', 'en', 'ru', 'tr', 'zh']) {
    const response = await fetch(base + '/' + locale);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /class="catalog-notice"/);
  }
  const catalog = await fetch(base + '/sr/katalog');
  assert.equal(catalog.status, 200);
  assert.match(await catalog.text(), /Laserski nivelator/);
  assert.equal((await fetch(base + '/favicon.ico')).status, 404);
  const admin = await fetch(base + '/admin');
  assert.equal(admin.status, 200);
  assert.match(await admin.text(), /Administracija trenutno nije dostupna/);
});

test('Vercel refuses writes instead of acknowledging ephemeral orders and accounts', async () => {
  for (const [method, path] of [
    ['POST', '/api/commerce/order'], ['POST', '/api/commerce/register'],
    ['POST', '/api/requests'], ['POST', '/api/login'], ['POST', '/api/uploads'],
    ['POST', '/api/jobs/commerce'], ['POST', '/api/whatsapp/webhook'],
    ['PATCH', '/api/admin/tools'], ['DELETE', '/api/admin/tools'],
    ['PUT', '/api/commerce/admin'],
  ]) {
    const response = await fetch(base + path, { method, headers: { Origin: base } });
    assert.equal(response.status, 503, path);
    assert.match((await response.json()).error, /trenutno nisu dostupne/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  const me = await fetch(base + '/api/commerce/me');
  assert.equal(me.status, 200);
  assert.equal((await me.json()).customer, null);
});

test('Vercel still calculates prices without saving data', async () => {
  const start = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const response = await fetch(base + '/api/commerce/quote', {
    method: 'POST',
    headers: { Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [{ toolId: 'tool-001', start, end: start, quantity: 1 }], delivery: 'pickup' }),
  });
  assert.equal(response.status, 200, await response.text());
});
