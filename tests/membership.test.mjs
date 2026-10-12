import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const dir = mkdtempSync(join(tmpdir(), 'rent-membership-test-'));
const base = 'http://127.0.0.1:3023';
const password = 'membership-admin-password';
const signup = { name: 'Test majstor', email: 'MAJSTOR@example.com', phone: '+381609991818', password: 'membership-test-password', consent: true };
let child, logs = '', admin = '', session = '', tool;
async function request(path, body, cookie = '', method = 'POST') {
  const response = await fetch(base + path, { method, headers: { Origin: base, 'Content-Type': 'application/json', Cookie: cookie }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = await response.json();
  return { status: response.status, data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
const api = (action, body, cookie = session, method = 'POST') => request('/api/commerce/' + action, body, cookie, method);
const manage = body => request('/api/commerce/admin', body, admin);
const item = () => ({ toolId: tool.id, quantity: 1, start: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10), end: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10) });
const booking = () => ({ items: [item()], delivery: 'pickup', name: signup.name, phone: signup.phone, locale: 'sr', consent: true, idempotency: randomUUID() });
before(async () => {
  child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3023'], {
    env: { ...process.env, POSTGRES_URL: '', DATABASE_URL: '', POSTGRES_PRISMA_URL: '', DATA_DIR: dir, ADMIN_PASSWORD: password }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', x => logs += x); child.stderr.on('data', x => logs += x);
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(base + '/sr')).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(logs);
});
after(async () => {
  if (child && child.exitCode === null) { const exited = new Promise(resolve => child.once('exit', resolve)); child.kill('SIGTERM'); await exited; }
  rmSync(dir, { recursive: true, force: true });
});

test('Club signup requires valid email and phone and grants 5% immediately', async () => {
  assert.equal((await api('register', { ...signup, email: undefined }, '')).status, 400);
  assert.equal((await api('register', { ...signup, email: 'bad@' }, '')).status, 400);
  assert.equal((await api('register', { ...signup, phone: 'invalid' }, '')).status, 400);
  const joined = await api('register', signup, '');
  assert.equal(joined.status, 201);
  session = joined.cookie;
  assert.equal(joined.data.customer.email, 'majstor@example.com');
  assert.equal(joined.data.customer.discount, 5);
  assert.equal(joined.data.customer.completed, 0);
  assert.equal(joined.data.customer.depositWaived, false);
  assert.equal(joined.data.customer.depositThreshold, 3);
  admin = (await request('/api/login', { password })).cookie;
  const name = Object.fromEntries(['sr', 'en', 'ru', 'tr', 'zh'].map(l => [l, 'Membership test equipment']));
  tool = (await request('/api/admin/tools', { slug: 'membership-test-equipment', name, description: name, categoryId: 'cat-1', price: 2000, deposit: 9999, quantity: 5, image: '', published: true, featured: false }, admin)).data;
  const member = await api('quote', { items: [item()], delivery: 'pickup' });
  assert.equal(member.data.rentalTotal, 1900);
  assert.equal(member.data.total, 1900, 'deposit is separate from rental revenue');
  assert.equal(member.data.depositTotal, null, 'deposit needs an individual agreement');
  const guest = await api('quote', { items: [item()], delivery: 'pickup', depositWaived: true, depositTotal: 0 }, '');
  assert.equal(guest.data.rentalTotal, 2000);
  assert.equal(guest.data.depositWaived, false);
  assert.equal(guest.data.depositTotal, null);
});

test('Only three paid completed rentals unlock deposit-free rental; agreed deposits lock at confirmation', async () => {
  const ids = [];
  for (let i = 0; i < 3; i++) {
    const created = await api('order', { ...booking(), depositWaived: true, depositTotal: 0 });
    assert.equal(created.status, 201);
    const id = created.data.id; ids.push(id);
    const pending = (await api('me', undefined, session, 'GET')).data;
    assert.equal(pending.customer.completed, i, 'pending rentals do not qualify');
    assert.equal(pending.customer.depositWaived, false);
    assert.equal((await manage({ action: 'order', id, status: 'confirmed' })).status, 400);
    assert.equal((await manage({ action: 'order', id, status: 'confirmed', depositTotal: 0 })).status, 400);
    const confirmed = await manage({ action: 'order', id, status: 'confirmed', depositTotal: 3000 });
    assert.equal(confirmed.status, 200, JSON.stringify(confirmed.data));
    assert.equal(confirmed.data.depositTotal, 3000);
    assert.equal(confirmed.data.total, 1900);
    assert.equal((await manage({ action: 'order', id, status: 'active', depositTotal: 1000 })).status, 400);
    assert.equal((await manage({ action: 'order', id, status: 'active' })).status, 200);
    assert.equal((await manage({ action: 'order', id, status: 'completed' })).status, 400);
    assert.equal((await manage({ action: 'order', id, status: 'completed', paid: true })).status, 200);
    const me = (await api('me', undefined, session, 'GET')).data;
    assert.equal(me.customer.completed, i + 1);
    assert.equal(me.customer.depositWaived, i === 2);
  }
  const db = new DatabaseSync(join(dir, 'rent-tools.sqlite'));
  for (const id of ids) {
    const order = JSON.parse(db.prepare('SELECT value FROM entities WHERE kind=? AND id=?').get('orders', id).value);
    db.prepare('UPDATE entities SET value=? WHERE kind=? AND id=?').run(JSON.stringify({ ...order, completedAt: '2020-01-01T12:00:00Z' }), 'orders', id);
  }
  db.close();
  const me = (await api('me', undefined, session, 'GET')).data;
  assert.equal(me.customer.completed, 3, 'benefit does not expire after 12 months');
  const quote = await api('quote', { items: [item()], delivery: 'pickup' });
  assert.equal(quote.data.depositWaived, true);
  assert.equal(quote.data.depositTotal, 0);
  const next = await api('order', booking());
  assert.equal(next.status, 201);
  assert.equal((await manage({ action: 'order', id: next.data.id, status: 'confirmed', depositTotal: 2000 })).status, 400);
  assert.equal((await manage({ action: 'order', id: next.data.id, status: 'confirmed' })).status, 200);
});

test('Legacy requests also count only when paid, completed and linked to the member', async () => {
  const joined = await api('register', { ...signup, email: 'legacy@example.com', phone: '+381609991820' }, '');
  assert.equal(joined.status, 201);
  const memberSession = joined.cookie;
  const body = { toolId: tool.id, quantity: 1, start: item().start, end: item().end, name: signup.name, phone: '+381609991820', delivery: 'pickup', locale: 'sr', consent: true };
  const created = await request('/api/requests', body, memberSession);
  assert.equal(created.status, 201);
  const id = created.data.id;
  assert.equal((await request('/api/admin/requests', { id, status: 'confirmed' }, admin)).status, 400);
  assert.equal((await request('/api/admin/requests', { id, status: 'confirmed', deposit: 1000 }, admin)).status, 200);
  assert.equal((await request('/api/admin/requests', { id, status: 'completed' }, admin)).status, 400);
  assert.equal((await request('/api/admin/requests', { id, status: 'completed', paid: true }, admin)).status, 200);
  const me = (await api('me', undefined, memberSession, 'GET')).data;
  assert.equal(me.customer.completed, 1);
  assert.equal(me.customer.depositWaived, false);
  const db = new DatabaseSync(join(dir, 'rent-tools.sqlite'));
  const record = JSON.parse(db.prepare('SELECT value FROM entities WHERE kind=? AND id=?').get('requests', id).value);
  for (const [id, status, paid] of [['unpaid', 'completed', false], ['cancelled', 'cancelled', true], ['pending', 'pending', true]]) {
    db.prepare('INSERT INTO entities(kind,id,value) VALUES(?,?,?)').run('requests', id, JSON.stringify({ ...record, id, status, paid }));
  }
  db.close();
  assert.equal((await api('me', undefined, memberSession, 'GET')).data.customer.completed, 1);
});
