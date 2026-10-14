import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
const dir = mkdtempSync(join(tmpdir(), 'rent-commerce-test-'));
const base = 'http://127.0.0.1:3012';
const password = 'local-test-password-2026';
let child;
let cookie = '';
let logs = '';
const env = {
  ...process.env, POSTGRES_URL: '', DATABASE_URL: '', POSTGRES_PRISMA_URL: '',
  DATA_DIR: dir,
  ADMIN_PASSWORD: password,
  WHATSAPP_APP_SECRET: 'test-webhook-secret',
  WHATSAPP_VERIFY_TOKEN: 'test-verify-token',
  COMMERCE_JOB_SECRET: 'test-job-secret',
};
async function api(path, body, method = 'POST', auth = true, origin = base) {
  // Existing booking scenarios agree a deposit before confirming the rental.
  if (path === '/api/commerce/admin' && body?.action === 'order' && body.status === 'confirmed') {
    const fixture = new DatabaseSync(join(dir, 'rent-tools.sqlite'));
    const row = fixture.prepare('SELECT value FROM entities WHERE kind=? AND id=?').get('orders', body.id);
    fixture.close();
    if (row && JSON.parse(row.value).depositWaived === false) body = { depositTotal: 1000, ...body };
  }
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
    ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3012'],
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
import { createHmac, randomUUID } from 'node:crypto';
let toolA,
  toolB,
  config,
  customerCookie = '',
  strangerCookie = '',
  customer,
  order,
  token,
  referrer;
const future = n => { const at=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Belgrade'}).format(new Date()); return new Date(Date.parse(at+'T12:00:00Z')+n*86400000).toISOString().slice(0,10); };
const translations = (s) => ({ sr: s, en: s, ru: s, tr: s, zh: s });
async function client(action, body, session = customerCookie, method = 'POST') {
  const response = await fetch(base + '/api/commerce/' + action, {
    method,
    headers: { Origin: base, 'Content-Type': 'application/json', Cookie: session },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { response, result: await response.json() };
}
const item = (id = toolA.id, start = future(10), end = future(14), quantity = 1) => ({
  toolId: id,
  start,
  end,
  quantity,
});
const booking = (items = [item(), item(toolB.id)]) => ({
  items,
  name: 'Test majstor',
  phone: '+381609990002',
  address: 'Test 10, Beograd',
  company: '',
  delivery: 'standard',
  locale: 'sr',
  consent: true,
  whatsapp: true,
  marketing: false,
  idempotency: randomUUID(),
});
test('Setup authenticated commerce, rules and rental inventory', async () => {
  const login = await api('/api/login', { password }, 'POST', false);
  assert.equal(login.response.status, 200);
  cookie = login.response.headers.get('set-cookie').split(';')[0];
  const cat = (
    await api('/api/admin/categories', {
      slug: 'commerce-test',
      name: translations('Test'),
      icon: '0',
      published: true,
    })
  ).result;
  async function tool(slug, price) {
    const r = await api('/api/admin/tools', {
      slug,
      name: translations(slug),
      description: translations('Description'),
      categoryId: cat.id,
      price,
      deposit: 0,
      quantity: 5,
      image: '/images/catalog/tool-001.jpg',
      published: true,
      featured: false,
    });
    assert.equal(r.response.status, 200);
    return r.result;
  }
  toolA = await tool('commerce-drill', 50);
  toolB = await tool('commerce-vacuum', 20);
  let d = await api('/api/commerce/admin', undefined, 'GET');
  assert.equal(d.response.status, 200);
  config = d.result.config;
  assert.equal((await api('/api/commerce/admin', {}, 'POST', false)).response.status, 403);
  config = { ...config, clubThreshold: 1, referralCredit: 10 };
  assert.equal(
    (await api('/api/commerce/admin', { action: 'config', config })).response.status,
    200,
  );
  const bad = { ...config, rule: { ...config.rule, tiers: [{ from: 2, percent: 80 }] } };
  assert.equal(
    (await api('/api/commerce/admin', { action: 'config', config: bad })).response.status,
    400,
  );
});
test('Accounts have isolated sessions, recovery codes and no password disclosures', async () => {
  let r = await client(
    'register',
    {
      phone: '+381609990001',
      email: 'referrer@example.com',
      name: 'Preporučilac',
      password: 'long-enough-password',
      consent: true,
    },
    '',
  );
  assert.equal(r.response.status, 201);
  referrer = r.result.customer;
  assert.ok(r.result.recovery);
  assert.equal(r.result.customer.hash, undefined);
  r = await client(
    'register',
    {
      phone: '+381609990002',
      email: 'member@example.com',
      name: 'Test majstor',
      password: 'long-enough-password',
      consent: true,
      referral: referrer.referralCode,
    },
    '',
  );
  assert.equal(r.response.status, 201);
  customer = r.result.customer;
  customerCookie = r.response.headers.get('set-cookie').split(';')[0];
  assert.match(r.response.headers.get('set-cookie'), /HttpOnly/);
  const recovery = r.result.recovery;
  r = await client(
    'recover',
    { phone: '+381609990002', recovery, password: 'new-long-password' },
    '',
  );
  assert.equal(r.response.status, 200);
  const oldCookie = customerCookie;
  customerCookie = r.response.headers.get('set-cookie').split(';')[0];
  assert.equal((await client('me', undefined, oldCookie, 'GET')).result.customer, null);
  assert.equal(
    (
      await client(
        'recover',
        { phone: '+381609990002', recovery, password: 'new-long-password' },
        '',
      )
    ).response.status,
    400,
  );
  r = await client(
    'register',
    {
      phone: '+381609990003',
      email: 'other@example.com',
      name: 'Other person',
      password: 'long-enough-password',
      consent: true,
    },
    '',
  );
  strangerCookie = r.response.headers.get('set-cookie').split(';')[0];
});
test('Progressive pricing, nonstacking packages, floors and calendar rates', async () => {
  let r = await client('quote', { items: [item()], delivery: 'pickup' });
  assert.equal(r.response.status, 200);
  assert.equal(r.result.rentalTotal, 220);
  assert.equal(r.result.saving, 30);
  assert.equal(
    (await client('quote', { items: [item(toolA.id, future(10), future(12))], delivery: 'pickup' }))
      .result.total,
    140,
  );
  r = await api('/api/commerce/admin', {
    action: 'bundle',
    bundle: {
      name: 'Test kit',
      description: '',
      toolIds: [toolA.id, toolB.id],
      discount: 15,
      published: true,
    },
  });
  assert.equal(r.response.status, 200);
  r = await client('quote', {
    items: [item(), item(toolB.id)],
    delivery: 'standard',
    rentalTotal: 1,
  });
  assert.equal(r.result.rentalTotal, 297.5);
  assert.equal(r.result.deliveryTotal, 1500);
  assert.equal(r.result.total, 1797.5);
  const option = {
    instructions: 'Test manual',
    manualUrl: 'https://example.com/manual.pdf',
    videoUrl: '',
    model: 'Exact model',
    relatedIds: [toolB.id],
    alternativeIds: [],
    rule: { ...config.rule, floorPercent: 90 },
  };
  assert.equal(
    (await api('/api/commerce/admin', { action: 'tool', id: toolA.id, options: option })).response
      .status,
    200,
  );
  assert.equal((await client('quote', { items: [item()], delivery: 'pickup' })).result.total, 225);
  assert.equal(
    (
      await api('/api/commerce/admin', {
        action: 'tool',
        id: toolA.id,
        options: { ...option, manualUrl: 'javascript:alert(1)' },
      })
    ).response.status,
    400,
  );
  await api('/api/commerce/admin', {
    action: 'tool',
    id: toolA.id,
    options: { ...option, rule: undefined },
  });
  // Calendar-rate branches: 50% proposal is clamped by a 60% floor.
  const dow = new Date(future(30)).getUTCDay();
  await api('/api/commerce/admin', {
    action: 'tool',
    id: toolA.id,
    options: { ...option, rule: { ...config.rule, quietPercent: 50, quietDays: [dow] } },
  });
  assert.equal(
    (await client('quote', { items: [item(toolA.id, future(30), future(30))], delivery: 'pickup' }))
      .result.total,
    30,
  );
  await api('/api/commerce/admin', {
    action: 'tool',
    id: toolA.id,
    options: { ...option, rule: undefined },
  });
});
test('Multi-tool orders recompute price, deduplicate submissions and protect customer data', async () => {
  const b = booking();
  let r = await client('order', { ...b, rentalTotal: 1, customerId: 'fake' });
  assert.equal(r.response.status, 201);
  order = r.result.id;
  token = r.result.token;
  r = await client('order', b);
  assert.equal(r.result.id, order);
  const d = (await api('/api/commerce/admin', undefined, 'GET')).result;
  const saved = d.orders.find((o) => o.id === order);
  assert.equal(saved.rentalTotal, 297.5);
  assert.equal(saved.customerId, customer.id);
  assert.equal(saved.items.length, 2);
  assert.equal((await client('me', undefined, strangerCookie, 'GET')).result.orders.length, 0);
  assert.equal(
    (await client('extend', { id: order, end: future(16) }, strangerCookie)).response.status,
    404,
  );
  assert.equal((await fetch(base + '/api/commerce/order?token=bad')).status, 404);
  const page = await fetch(base + '/sr/najam/' + token);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /noindex/);
  assert.equal(page.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(d.messages.filter((m) => m.orderId === order && m.event === 'received').length, 1);
});
test('Merged quantities and overlapping cart lines cannot oversell; confirmations serialize', async () => {
  assert.equal(
    (
      await client('quote', {
        items: [
          item(toolA.id, future(20), future(22), 3),
          item(toolA.id, future(21), future(24), 3),
        ],
        delivery: 'pickup',
      })
    ).response.status,
    400,
  );
  let r = await client('quote', {
    items: [item(toolA.id, future(20), future(22), 2), item(toolA.id, future(20), future(22), 2)],
    delivery: 'pickup',
  });
  assert.equal(r.result.items.length, 1);
  assert.equal(r.result.items[0].quantity, 4);
  const b = booking([item(toolA.id, future(40), future(42), 5)]);
  const one = await client('order', b),
    two = await client('order', { ...b, idempotency: randomUUID() });
  const confirmations = await Promise.all(
    [one, two].map((r) =>
      api('/api/commerce/admin', { action: 'order', id: r.result.id, status: 'confirmed' }),
    ),
  );
  assert.deepEqual(confirmations.map((r) => r.response.status).sort(), [200, 400]);
  const confirmed = confirmations.find((r) => r.response.status === 200).result;
  await api('/api/commerce/admin', { action: 'order', id: confirmed.id, status: 'cancelled' });
  assert.equal(
    (await client('quote', { items: b.items, delivery: 'pickup' })).response.status,
    200,
  );
});
test('Extensions retain original prices; account ownership and terminal transitions enforced', async () => {
  let r = await api('/api/commerce/admin', { action: 'order', id: order, status: 'confirmed' });
  assert.equal(r.response.status, 200);
  await api('/api/admin/tools', { ...toolA, price: 500 });
  r = await client('extend', { id: order, end: future(15) });
  assert.equal(r.response.status, 200);
  assert.equal(r.result.extra, 59.5);
  r = await api('/api/commerce/admin', { action: 'extension', id: order, approve: true });
  assert.equal(r.response.status, 200);
  assert.equal(r.result.rentalTotal, 357);
  assert.equal(r.result.items[0].price, 50);
  assert.equal(
    (
      await api('/api/commerce/admin', {
        action: 'order',
        id: order,
        status: 'completed',
        paid: true,
      })
    ).response.status,
    400,
  );
  assert.equal(
    (await api('/api/commerce/admin', { action: 'order', id: order, status: 'active' })).response
      .status,
    200,
  );
  assert.equal(
    (await api('/api/commerce/admin', { action: 'order', id: order, status: 'completed' })).response
      .status,
    400,
  );
  assert.equal(
    (
      await api('/api/commerce/admin', {
        action: 'order',
        id: order,
        status: 'completed',
        paid: true,
      })
    ).response.status,
    200,
  );
  assert.equal(
    (await api('/api/commerce/admin', { action: 'order', id: order, status: 'cancelled' })).response
      .status,
    400,
  );
  await api('/api/admin/tools', toolA);
});
test('New buyers are not double-rewarded; legacy credit balances and cancellation refunds are preserved', async () => {
  let d = (await api('/api/commerce/admin', undefined, 'GET')).result;
  assert.equal(d.customers.find((c) => c.id === customer.id).credit, 0);
  assert.equal(d.customers.find((c) => c.id === referrer.id).credit, 0);
  // Simulate an existing balance from before the new referral program.
  const fixture = new DatabaseSync(join(dir, 'rent-tools.sqlite'));
  const stored = JSON.parse(fixture.prepare('SELECT value FROM entities WHERE kind=? AND id=?').get('customers',customer.id).value);
  fixture.prepare('UPDATE entities SET value=? WHERE kind=? AND id=?').run(JSON.stringify({...stored,credit:10}),'customers',customer.id);
  fixture.close();
  let me = (await client('me', undefined, customerCookie, 'GET')).result;
  assert.equal(me.customer.tier, 'regular');
  assert.equal(me.customer.discount, 5);
  let r = await client('quote', {
    items: [item(toolA.id, future(50), future(50))],
    delivery: 'pickup',
    useCredit: true,
  });
  assert.equal(r.result.rentalTotal, 47.5);
  assert.equal(r.result.credit, 9.5);
  assert.equal(r.result.total, 38);
  assert.equal(
    (await client('quote', { items: [item()], delivery: 'pickup' })).result.rentalTotal,
    220,
    'duration wins over club without stacking',
  );
  r = await client('order', {
    ...booking([item(toolA.id, future(50), future(50))]),
    delivery: 'pickup',
    useCredit: true,
  });
  const id = r.result.id;
  assert.equal((await client('me', undefined, customerCookie, 'GET')).result.customer.credit, 0.5);
  await api('/api/commerce/admin', { action: 'order', id, status: 'cancelled' });
  assert.equal((await client('me', undefined, customerCookie, 'GET')).result.customer.credit, 10);
  assert.equal(
    (await api('/api/commerce/admin', { action: 'order', id, status: 'cancelled' })).response
      .status,
    400,
  );
});
test('Saved projects and availability notices require account ownership and consent', async () => {
  let r = await client('project', { name: 'New site', items: [item()] });
  assert.equal(r.response.status, 200);
  assert.equal(
    (await client('project', { id: r.result.id, remove: true }, strangerCookie)).response.status,
    404,
  );
  assert.equal((await client('watch', { item: item(), consent: false })).response.status, 400);
  assert.equal((await client('watch', { item: item(), consent: true })).response.status, 200);
  assert.equal((await client('draft', { items: [item()] })).response.status, 200);
});
test('WhatsApp requires configuration, signed webhooks and authenticated jobs', async () => {
  const job = await fetch(base + '/api/jobs/commerce', { method: 'POST' });
  assert.equal(job.status, 401);
  const disabled = await fetch(base + '/api/jobs/commerce', {
    method: 'POST',
    headers: { Authorization: 'Bearer test-job-secret' },
  });
  assert.equal((await disabled.json()).setupRequired, true);
  let r = await fetch(
    base +
      '/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=123',
  );
  assert.equal(await r.text(), '123');
  const raw = JSON.stringify({
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                { id: 'incoming-stop-test', from: '381609990002', text: { body: 'STOP' } },
              ],
            },
          },
        ],
      },
    ],
  });
  r = await fetch(base + '/api/whatsapp/webhook', { method: 'POST', body: raw });
  assert.equal(r.status, 403);
  const signature =
    'sha256=' + createHmac('sha256', 'test-webhook-secret').update(raw).digest('hex');
  r = await fetch(base + '/api/whatsapp/webhook', {
    method: 'POST',
    body: raw,
    headers: { 'x-hub-signature-256': signature },
  });
  assert.equal(r.status, 200);
  const d = (await api('/api/commerce/admin', undefined, 'GET')).result;
  assert.equal(d.inbox.filter((m) => m.id === 'incoming-stop-test').length, 1);
  assert.equal(d.integration.ready, false);
  assert.equal(
    (await api('/api/commerce/admin', { action: 'retry', id: d.messages[0].id })).response.status,
    400,
  );
});
test('Company orders are shared only with assigned team members and use negotiated rates', async () => {
  const other = (await client('me', undefined, strangerCookie, 'GET')).result.customer;
  const created = await api('/api/commerce/admin', {
    action: 'team',
    team: { name: 'Test firma', customerIds: [customer.id, other.id], discount: 20 },
  });
  assert.equal(created.response.status, 200);
  const teamId = created.result.id;
  const q = await client('quote', {
    items: [item(toolA.id, future(60), future(60))],
    delivery: 'pickup',
    teamId,
    useCredit: true,
  });
  assert.equal(q.result.rentalTotal, 40);
  assert.equal(q.result.credit, 0);
  const made = await client('order', {
    ...booking([item(toolA.id, future(60), future(60))]),
    delivery: 'pickup',
    teamId,
  });
  assert.equal(made.response.status, 201);
  assert.ok(
    (await client('me', undefined, strangerCookie, 'GET')).result.orders.some(
      (o) => o.id === made.result.id,
    ),
  );
  await api('/api/commerce/admin', {
    action: 'team',
    team: { ...created.result, customerIds: [customer.id] },
  });
  assert.ok(
    !(await client('me', undefined, strangerCookie, 'GET')).result.orders.some(
      (o) => o.id === made.result.id,
    ),
  );
  assert.equal(
    (await client('quote', { items: [item()], delivery: 'pickup', teamId }, strangerCookie))
      .response.status,
    400,
  );
});
test('Guest orders can be claimed only with their private link and cannot be claimed twice', async () => {
  const r = await client(
    'order',
    { ...booking([item(toolA.id, future(70), future(70))]), phone: '+381609990004' },
    '',
  );
  assert.equal(r.response.status, 201);
  assert.equal((await client('claim', { token: 'f'.repeat(64) })).response.status, 404);
  assert.equal((await client('claim', { token: r.result.token })).response.status, 200);
  assert.equal(
    (await client('claim', { token: r.result.token }, strangerCookie)).response.status,
    404,
  );
  assert.ok(
    (await client('me', undefined, customerCookie, 'GET')).result.orders.some(
      (o) => o.id === r.result.id,
    ),
  );
});
test('QR labels require a configured domain and point to public tool instructions', async () => {
  assert.equal((await fetch(base + '/api/commerce/qr?toolId=' + toolA.id)).status, 401);
  assert.equal(
    (await api('/api/commerce/qr?toolId=' + toolA.id, undefined, 'GET')).response.status,
    400,
  );
  const s = (await api('/api/admin/all', undefined, 'GET')).result.settings;
  assert.equal(
    (
      await api('/api/admin/settings', {
        ...s,
        siteUrl: 'https://rental.example',
        deliveryNote: translations('Zona po dogovoru'),
      })
    ).response.status,
    200,
  );
  const response = await fetch(base + '/api/commerce/qr?toolId=' + toolA.id, {
    headers: { Cookie: cookie },
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /svg/);
  assert.match(await response.text(), /<svg/);
  const page = await fetch(base + '/sr/uputstvo/' + toolA.slug);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Test manual/);
});
test('Operational cost inputs never leak into public quotes or customer order details', async () => {
  const options = {
    instructions: 'Private cost test',
    manualUrl: '',
    videoUrl: '',
    model: 'Test',
    relatedIds: [],
    alternativeIds: [],
    costPerDay: 7.25,
    preparationCost: 13.5,
  };
  assert.equal(
    (await api('/api/commerce/admin', { action: 'tool', id: toolA.id, options })).response.status,
    200,
  );
  const q = await client('quote', {
    items: [item(toolA.id, future(80), future(80))],
    delivery: 'pickup',
  });
  assert.equal(q.response.status, 200);
  assert.equal(q.result.items[0].instructions.costPerDay, undefined);
  assert.equal(q.result.items[0].instructions.preparationCost, undefined);
  const o = await client('order', booking([item(toolA.id, future(80), future(80))]));
  assert.equal(o.response.status, 201);
  const view = await fetch(base + '/api/commerce/order?token=' + o.result.token);
  const data = await view.json();
  assert.equal(data.items[0].instructions.costPerDay, undefined);
});
test('Overdue equipment blocks new reservations until the return is recorded', async () => {
  const made = await client('order', booking([item(toolB.id, future(85), future(85), 5)]));
  assert.equal(made.response.status, 201);
  const id = made.result.id;
  assert.equal(
    (await api('/api/commerce/admin', { action: 'order', id, status: 'confirmed' })).response
      .status,
    200,
  );
  assert.equal(
    (await api('/api/commerce/admin', { action: 'order', id, status: 'active' })).response.status,
    200,
  );
  // Advance the stored fixture's rental dates to simulate an unreturned tool, without changing the system clock.
  const { DatabaseSync } = await import('node:sqlite');
  const database = new DatabaseSync(join(dir, 'rent-tools.sqlite'));
  const row = database
    .prepare('SELECT value FROM entities WHERE kind=? AND id=?')
    .get('orders', id);
  const overdue = JSON.parse(row.value);
  overdue.items = overdue.items.map((i) => ({ ...i, start: future(-2), end: future(-1) }));
  database
    .prepare('UPDATE entities SET value=? WHERE kind=? AND id=?')
    .run(JSON.stringify(overdue), 'orders', id);
  database.close();
  assert.equal(
    (await client('quote', { items: [item(toolB.id, future(86), future(86))], delivery: 'pickup' }))
      .response.status,
    400,
  );
  assert.equal(
    (await api('/api/commerce/admin', { action: 'order', id, status: 'completed', paid: true }))
      .response.status,
    200,
  );
  assert.equal(
    (await client('quote', { items: [item(toolB.id, future(86), future(86))], delivery: 'pickup' }))
      .response.status,
    200,
  );
});

test('Indefinite rentals keep totals unknown, reserve future stock and settle on return at the agreed rate', async () => {
  const tool = (await api('/api/admin/tools', {
    ...toolA, id: undefined, slug: 'open-rental-test', name: translations('Najam bez roka'),
    quantity: 1, price: 100,
  })).result;
  const at = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade' }).format(new Date());
  const open = { toolId: tool.id, quantity: 1, start: at, end: '', openEnded: true };
  const quote = (items) => client('quote', { items, delivery: 'pickup' }, '');
  assert.equal((await quote([{ ...open, openEnded: undefined }])).response.status, 400);
  assert.equal((await quote([{ ...open, end: at }])).response.status, 400);
  assert.equal((await quote([{ ...open, openEnded: 'true' }])).response.status, 400);
  assert.equal((await quote([open, item(tool.id, future(180), future(180))])).response.status, 400);
  let r = await quote([open]);
  assert.equal(r.response.status, 200, JSON.stringify(r.result));
  assert.equal(r.result.total, null);
  assert.equal(r.result.rentalTotal, null);
  assert.equal(r.result.items[0].end, '');
  assert.equal(r.result.items[0].days, 0);
  assert.equal(r.result.items[0].openEnded, true);

  // A reservation far beyond 90 days also prevents promising an indefinite rental.
  const fixed = await client('order', { ...booking([item(tool.id, future(180), future(180))]),
    phone: '+381609990010', delivery: 'pickup', whatsapp: false }, '');
  assert.equal(fixed.response.status, 201, JSON.stringify(fixed.result));
  assert.equal((await api('/api/commerce/admin', { action: 'order', id: fixed.result.id, status: 'confirmed' })).response.status, 200);
  assert.equal((await quote([open])).response.status, 400);
  await api('/api/commerce/admin', { action: 'order', id: fixed.result.id, status: 'cancelled' });

  const made = await client('order', { ...booking([open]), phone: '+381609990011', delivery: 'pickup' }, '');
  assert.equal(made.response.status, 201, JSON.stringify(made.result));
  const id = made.result.id;
  r = await api('/api/commerce/admin', { action: 'order', id, status: 'confirmed', dailyRates: [120] });
  assert.equal(r.response.status, 200, JSON.stringify(r.result));
  assert.equal(r.result.total, null);
  assert.equal(r.result.items[0].price, 120);
  assert.equal((await quote([item(tool.id, future(180), future(180))])).response.status, 400);
  assert.equal((await client('extend', { id, token: made.result.token, end: future(1) }, '')).response.status, 400);
  const page = await (await fetch(base + '/sr/najam/' + made.result.token)).text();
  assert.match(page, /Bez datuma vraćanja/);
  assert.match(page, /Konačna cena po vraćanju/);
  const messages = (await api('/api/commerce/admin', undefined, 'GET')).result.messages;
  assert.match(messages.find(m => m.orderId === id && m.event === 'confirmed').params[2], /Konačna cena/);
  assert.doesNotMatch(messages.find(m => m.orderId === id && m.event === 'confirmed').params[2], /null/);

  await api('/api/commerce/admin', { action: 'order', id, status: 'active' });
  assert.equal((await api('/api/commerce/admin', { action: 'order', id, status: 'completed', paid: true })).response.status, 400);
  assert.equal((await api('/api/commerce/admin', { action: 'order', id, status: 'active', dailyRates: [1] })).response.status, 400);
  assert.equal((await api('/api/commerce/admin', { action: 'order', id, status: 'completed', returnEnd: future(1), paid: true })).response.status, 400);
  await api('/api/admin/tools', { ...tool, price: 900 });
  r = await api('/api/commerce/admin', { action: 'order', id, status: 'completed', returnEnd: at, paid: true });
  assert.equal(r.response.status, 200, JSON.stringify(r.result));
  assert.equal(r.result.items[0].price, 120);
  assert.equal(r.result.items[0].days, 1);
  assert.equal(r.result.items[0].openEnded, false);
  assert.equal(r.result.items[0].end, at);
  assert.equal(r.result.total, 120);
  assert.equal((await quote([item(tool.id, future(180), future(180))])).response.status, 200);
});
