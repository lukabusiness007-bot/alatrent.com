import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
function harness(t) {
  const store = new Map(),
    cfg = { enabled: true, templates: { received: 'rental_received' }, templateLanguage: 'sr' };
  const db = {
    all: (kind) =>
      [...store.entries()]
        .filter(([k]) => k.startsWith(kind + ':'))
        .map(([, v]) => structuredClone(v)),
    get: (kind, id) => structuredClone(store.get(kind + ':' + id)),
    put: (kind, id, value) => store.set(kind + ':' + id, structuredClone(value)),
    settings: () => ({ siteUrl: 'https://rent.example' }),
    transaction: (fn) => fn(),
  };
  const code =
    stripTypeScriptTypes(
      readFileSync(new URL('../lib/commerce/messages.ts', import.meta.url), 'utf8'),
    )
      .replace(
        /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"];?/g,
        (_, names, path) => `const {${names}} = require('${path}');`,
      )
      .replace(/export /g, '') + '\nmodule.exports = { enqueueOrder, processMessages };';
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(
    (name) => {
      if (name === '../db') return db;
      if (name === './data') return { config: () => cfg, checkCapacity: () => {} };
      if (name === '../validation') return { today: () => new Date().toISOString().slice(0, 10) };
      if (name === 'node:crypto') return {};
      throw new Error(name);
    },
    module,
    module.exports,
  );
  const old = { ...process.env };
  Object.assign(process.env, {
    WHATSAPP_TOKEN: 'test-only',
    WHATSAPP_PHONE_ID: '123',
    WHATSAPP_API_VERSION: 'v-test',
  });
  t.after(() => {
    for (const k of ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_ID', 'WHATSAPP_API_VERSION']) {
      if (old[k] === undefined) delete process.env[k];
      else process.env[k] = old[k];
    }
  });
  const order = {
    id: 'order',
    status: 'pending',
    whatsapp: true,
    phone: '+381600001234',
    name: 'Test',
    locale: 'sr',
    accessToken: 'private-token',
    items: [],
  };
  db.put('orders', order.id, order);
  module.exports.enqueueOrder(order, 'received');
  return { api: module.exports, db, cfg, order };
}
test('WhatsApp outbox uses approved templates and current domain; concurrent workers do not double send', async (t) => {
  const { api, db } = harness(t);
  let calls = 0,
    payload;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls++;
    payload = JSON.parse(init.body);
    await new Promise((resolve) => setTimeout(resolve, 10));
    return Response.json({ messages: [{ id: 'wamid.test' }] });
  });
  await Promise.all([api.processMessages(), api.processMessages()]);
  assert.equal(calls, 1);
  assert.equal(payload.type, 'template');
  assert.equal(payload.template.name, 'rental_received');
  assert.equal(
    payload.template.components[0].parameters[3].text,
    'https://rent.example/sr/najam/private-token',
  );
  assert.equal(db.get('messages', 'order:received').status, 'sent');
  await api.processMessages();
  assert.equal(calls, 1);
});
test('WhatsApp opts out before sending, including messages already queued', async (t) => {
  const { api, db } = harness(t);
  db.put('whatsappOptOut', '+381600001234', { at: 'now' });
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return Response.json({});
  });
  await api.processMessages();
  assert.equal(calls, 0);
  assert.equal(db.get('messages', 'order:received').status, 'cancelled');
});
test('Ambiguous network outcomes are held for review rather than sent twice', async (t) => {
  const { api, db } = harness(t);
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    throw new Error('timeout');
  });
  await api.processMessages();
  assert.equal(db.get('messages', 'order:received').status, 'unknown');
  await api.processMessages();
  assert.equal(calls, 1);
});
test('Rate limited messages back off; configuration and stale lifecycle messages are not sent', async (t) => {
  const { api, db, cfg, order } = harness(t);
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    calls++;
    return Response.json({ error: { code: 130429 } }, { status: 429 });
  });
  await api.processMessages();
  const m = db.get('messages', 'order:received');
  assert.equal(m.status, 'failed');
  assert.equal(m.attempts, 1);
  assert.ok(m.nextAt > Date.now());
  await api.processMessages();
  assert.equal(calls, 1);
  db.put('messages', m.id, { ...m, nextAt: 0 });
  db.put('orders', order.id, { ...order, status: 'completed' });
  await api.processMessages();
  assert.equal(calls, 1);
  assert.equal(db.get('messages', m.id).status, 'cancelled');
  cfg.enabled = false;
  assert.equal((await api.processMessages()).setupRequired, true);
});
