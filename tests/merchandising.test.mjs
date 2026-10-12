import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
const dir = mkdtempSync(join(tmpdir(), 'rent-merchandising-test-'));
const base = 'http://127.0.0.1:3021',
  password = 'merchandising-test-password';
const env = {
  ...process.env,
  POSTGRES_URL: '',
  DATABASE_URL: '',
  POSTGRES_PRISMA_URL: '',
  DATA_DIR: dir,
  ADMIN_PASSWORD: password,
};
let child,
  cookie = '',
  logs = '',
  tools = [],
  cfg;
const loc = (s) => ({ sr: s, en: s, ru: s, tr: s, zh: s });
const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const item = (t = tools[0], quantity = 1, start = day(10), end = day(11)) => ({
  toolId: t.id,
  quantity,
  start,
  end,
});
const options = (extra = {}) => ({
  instructions: '',
  model: '',
  manualUrl: '',
  videoUrl: '',
  relatedIds: [],
  alternativeIds: [],
  costPerDay: 100,
  preparationCost: 50,
  ...extra,
});
async function api(action, body, admin = false, method = 'POST') {
  const r = await fetch(base + '/api/commerce/' + action, {
    method,
    headers: {
      Origin: base,
      'Content-Type': 'application/json',
      ...(admin ? { Cookie: cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: r.status, data: await r.json() };
}
async function save(body) {
  const r = await api('admin', body, true);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return r.data;
}
async function quote(items, extra = {}) {
  const r = await api('quote', { items, delivery: 'pickup', ...extra });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return r.data;
}
before(async () => {
  const reset = spawnSync(process.execPath, ['scripts/reset-admin.mjs'], { env, encoding: 'utf8' });
  assert.equal(reset.status, 0, reset.stderr);
  child = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3021'],
    { env, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  child.stdout.on('data', (x) => (logs += x));
  child.stderr.on('data', (x) => (logs += x));
  for (let n = 0; n < 80; n++) {
    try {
      if ((await fetch(base + '/sr')).status === 200) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  const login = await fetch(base + '/api/login', {
    method: 'POST',
    headers: { Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  assert.equal(login.status, 200, logs);
  cookie = login.headers.get('set-cookie').split(';')[0];
  const admin = await api('admin', undefined, true, 'GET');
  cfg = admin.data.config;
  await save({
    action: 'config',
    config: {
      ...cfg,
      clubPercent: 0,
      rule: {
        tiers: [{ from: 1, percent: 100 }],
        floorPercent: 60,
        weekendPercent: 100,
        quietPercent: 100,
        quietDays: [],
      },
    },
  });
  const cat = await fetch(base + '/api/admin/categories', {
    method: 'POST',
    headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug: 'merch-test',
      name: loc('Merch test'),
      icon: '0',
      published: true,
    }),
  });
  const category = await cat.json();
  for (const [n, price] of [1000, 1500, 500, 700].entries()) {
    const r = await fetch(base + '/api/admin/tools', {
      method: 'POST',
      headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: 'merch-tool-' + n,
        name: loc('Merch tool ' + n),
        description: loc('Tool for test'),
        categoryId: category.id,
        price,
        quantity: 5,
        image: '',
        deposit: null,
        published: true,
        featured: false,
      }),
    });
    assert.equal(r.status, 200, await r.clone().text());
    tools.push(await r.json());
    await save({ action: 'tool', id: tools[n].id, options: options() });
  }
});
after(async () => {
  if (child && child.exitCode === null) {
    const done = new Promise((r) => child.once('exit', r));
    child.kill('SIGTERM');
    await done;
  }
  rmSync(dir, { recursive: true, force: true });
});

test('Independent flags, protected admin, five-language jobs and hidden public kits', async () => {
  let r = await api('admin', undefined, true, 'GET');
  assert.deepEqual(r.data.merchandising, {
    recommendationsEnabled: false,
    promotionsEnabled: false,
  });
  assert.equal(r.data.jobs.length, 8);
  assert.equal(
    (await api('admin', { action: 'merchandising', config: { recommendationsEnabled: true } }))
      .status,
    403,
  );
  assert.equal(
    (
      await api(
        'admin',
        {
          action: 'job',
          job: {
            id: 'bad',
            name: { sr: 'test' },
            description: loc(''),
            toolIds: [],
            rank: 1,
            published: true,
          },
        },
        true,
      )
    ).status,
    400,
  );
  await save({
    action: 'job',
    job: {
      id: 'test-job',
      name: loc('Test project'),
      description: loc('Test purpose'),
      toolIds: [tools[0].id],
      rank: 0,
      published: true,
    },
  });
  for (const l of ['sr', 'en', 'ru', 'tr', 'zh']) {
    const html = await (await fetch(base + '/' + l)).text();
    assert.ok(html.includes('Test project'));
    assert.ok(html.includes('job=test-job'));
    assert.equal((await fetch(base + '/' + l + '/paketi')).status, 404);
  }
  assert.equal((await api('recommendations', { items: [item()] })).data.offers.length, 0);
});

test('Typed recommendations compare the entire cart and inherit source dates and quantity', async () => {
  await save({
    action: 'tool',
    id: tools[0].id,
    options: options({
      relatedIds: [tools[2].id],
      alternativeIds: [tools[1].id],
      recommendations: [
        { toolId: tools[1].id, kind: 'upgrade', reason: loc('Suitable upgrade'), rank: 1 },
        { toolId: tools[3].id, kind: 'budget', reason: loc('Enough for smaller jobs'), rank: 2 },
      ],
    }),
  });
  await save({
    action: 'merchandising',
    config: { recommendationsEnabled: true, promotionsEnabled: false },
  });
  const r = await api('recommendations', { items: [item(tools[0], 2)], delivery: 'standard' });
  assert.equal(r.status, 200);
  const upgrade = r.data.offers.find((o) => o.kind === 'upgrade');
  assert.equal(upgrade.delta, 2000);
  assert.equal(upgrade.items[0].quantity, 2);
  assert.equal(upgrade.items[0].start, day(10));
  assert.ok(!upgrade.quote.promotionPolicy);
  assert.equal(r.data.offers.find((o) => o.kind === 'budget').delta, -1200);
  const extra = r.data.offers.find((o) => o.kind === 'complement');
  assert.equal(extra.delta, 1000);
  assert.equal(extra.items[1].quantity, 1);
  assert.equal(extra.items[1].end, day(11));
  const multi = await api('recommendations', {
    items: [item(tools[3], 1, day(20), day(22)), item(tools[0], 2)],
    sourceIndex: 1,
  });
  assert.equal(multi.data.offers.find((o) => o.kind === 'upgrade').items[0].start, day(20));
  assert.equal(multi.data.offers.find((o) => o.kind === 'upgrade').items[1].quantity, 2);
  const duplicate = await api('recommendations', { items: [item(), item(tools[2])] });
  assert.ok(!duplicate.data.offers.some((o) => o.toolId === tools[2].id));
  const open = await api('recommendations', { items: [{ ...item(), end: '', openEnded: true }] });
  assert.ok(!open.data.offers.some(o=>o.kind==='budget'),'No invented savings for an unknown total');
  const complement = open.data.offers.find((o) => o.kind === 'complement');
  assert.equal(complement.delta, null);
  assert.equal(complement.quote.total, null);
  assert.equal(complement.items[1].openEnded, true);
  assert.equal(complement.items[1].end, '');
});

test('Capacity includes every candidate line; hidden, unknown and unavailable inventory are handled', async () => {
  const db = new DatabaseSync(join(dir, 'rent-tools.sqlite'));
  const update = (t, patch) =>
    db
      .prepare('UPDATE entities SET value=? WHERE kind=? AND id=?')
      .run(JSON.stringify({ ...t, ...patch }), 'tools', t.id);
  update(tools[2], { quantity: 0 });
  let r = await api('recommendations', { items: [item()] });
  assert.ok(!r.data.offers.some((o) => o.toolId === tools[2].id));
  update(tools[2], { quantity: null });
  r = await api('recommendations', { items: [item()] });
  assert.equal(r.data.offers.find((o) => o.toolId === tools[2].id).availability, 'confirmation');
  update(tools[2], { published: false });
  r = await api('recommendations', { items: [item()] });
  assert.ok(!r.data.offers.some((o) => o.toolId === tools[2].id));
  update(tools[2], {});
  update(tools[0], { quantity: 0 });
  const rescued = await api('compare', { items: [item()], nextItems: [item(tools[1])] });
  assert.equal(rescued.status, 200);
  assert.equal(rescued.data.before, null);
  update(tools[0], {});
  const impossible = await api('compare', { items: [item()], nextItems: [item(tools[1], 6)] });
  assert.equal(impossible.status, 400);
  db.close();
});

const campaign = (extra = {}) => ({
  id: 'season',
  name: loc('Seasonal offer'),
  kind: 'seasonal',
  toolIds: [tools[0].id],
  start: day(1),
  end: day(80),
  percent: 20,
  maxDiscount: 500,
  minContributionPercent: 20,
  enabled: true,
  ...extra,
});
test('Seasonal offers respect limits, costs, date boundaries and existing better rates', async () => {
  await save({ action: 'promotion', promotion: campaign() });
  assert.equal((await quote([item()])).total, 2000);
  await save({
    action: 'merchandising',
    config: { recommendationsEnabled: true, promotionsEnabled: true },
  });
  let q = await quote([item()]);
  assert.equal(q.total, 1600);
  assert.equal(q.promotion.name.sr, 'Seasonal offer');
  assert.ok(!q.promotionPolicy);
  assert.ok(!('costPerDay' in q.items[0].instructions));
  await save({ action: 'promotion', promotion: campaign({ maxDiscount: 100 }) });
  assert.equal((await quote([item()])).total, 1900);
  await save({ action: 'promotion', promotion: campaign({ start: day(10), end: day(11) }) });
  assert.equal((await quote([item()])).total, 1600);
  assert.equal((await quote([item(tools[0], 1, day(9), day(11))])).total, 3000);
  assert.equal((await quote([item(tools[0], 1, day(10), day(12))])).total, 3000);
  await save({ action: 'tool', id: tools[0].id, options: options({ costPerDay: null }) });
  assert.equal((await quote([item()])).total, 2000);
  await save({ action: 'tool', id: tools[0].id, options: options({ costPerDay: 900 }) });
  assert.equal((await quote([item()])).total, 2000);
  await save({
    action: 'tool',
    id: tools[0].id,
    options: options({
      rule: {
        tiers: [{ from: 1, percent: 70 }],
        floorPercent: 60,
        weekendPercent: 100,
        quietPercent: 100,
        quietDays: [],
      },
    }),
  });
  assert.equal((await quote([item()])).total, 1400);
  await save({ action: 'tool', id: tools[0].id, options: options() });
  await save({ action: 'promotion', promotion: campaign({ percent: 50, maxDiscount: 10000 }) });
  assert.equal((await quote([item()])).total, 1200, 'floor at 60%');
  await save({ action: 'promotion', promotion: campaign({ enabled: false }) });
});

test('Combination campaigns require every tool and the same interval; caps round safely', async () => {
  await save({
    action: 'promotion',
    promotion: campaign({
      id: 'combo',
      kind: 'combination',
      toolIds: [tools[0].id, tools[2].id],
      percent: 20,
      maxDiscount: 333.33,
    }),
  });
  assert.equal((await quote([item()])).total, 2000);
  const q = await quote([item(), item(tools[2])]);
  assert.equal(q.total, 2666.67);
  assert.equal(q.saving, 333.33);
  assert.equal((await quote([item(), item(tools[2], 1, day(20), day(21))])).total, 3000);
  const open = await quote([
    { ...item(), end: '', openEnded: true },
    { ...item(tools[2]), end: '', openEnded: true },
  ]);
  assert.equal(open.total, null);
  assert.ok(!open.promotion);
});

test('Campaign contribution accounts for member credit before choosing an offer', async () => {
  const response = await fetch(base + '/api/commerce/register', {
    method: 'POST',
    headers: { Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Credit member',
      phone: '+381609876544',
      email: 'credit@example.test',
      password: 'credit-member-password',
      consent: true,
    }),
  });
  assert.equal(response.status, 201);
  const member = await response.json();
  const session = response.headers.get('set-cookie').split(';')[0];
  const db = new DatabaseSync(join(dir, 'rent-tools.sqlite'));
  const customer = JSON.parse(
    db
      .prepare('SELECT value FROM entities WHERE kind=? AND id=?')
      .get('customers', member.customer.id).value,
  );
  db.prepare('UPDATE entities SET value=? WHERE kind=? AND id=?').run(
    JSON.stringify({ ...customer, credit: 1000 }),
    'customers',
    customer.id,
  );
  db.close();
  await save({
    action: 'tool',
    id: tools[0].id,
    options: options({ costPerDay: 600, preparationCost: 200 }),
  });
  await save({
    action: 'tool',
    id: tools[2].id,
    options: options({ costPerDay: 200, preparationCost: 100 }),
  });
  const r = await fetch(base + '/api/commerce/quote', {
    method: 'POST',
    headers: { Origin: base, Cookie: session, 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: [item(), item(tools[2])], delivery: 'pickup', useCredit: true }),
  });
  assert.equal(r.status, 200);
  const result = await r.json();
  assert.equal(result.rentalTotal, 3000);
  assert.equal(result.credit, 600);
  assert.ok(!result.promotion);
  await save({ action: 'tool', id: tools[0].id, options: options() });
  await save({ action: 'tool', id: tools[2].id, options: options() });
});

test('Order snapshots, idempotency and extensions retain agreed campaign rules', async () => {
  const idempotency = randomUUID(),
    session = randomUUID();
  const body = {
    items: [item(), item(tools[2])],
    name: 'Test',
    phone: '+381609876543',
    delivery: 'pickup',
    locale: 'sr',
    consent: true,
    idempotency,
    analyticsConsent: true,
    analyticsSession: session,
  };
  const created = await api('order', body);
  assert.equal(created.status, 201);
  const again = await api('order', body);
  assert.deepEqual(again.data, created.data);
  const db = new DatabaseSync(join(dir, 'rent-tools.sqlite'));
  let order = JSON.parse(
    db.prepare('SELECT value FROM entities WHERE kind=? AND id=?').get('orders', created.data.id)
      .value,
  );
  assert.equal(order.promotionPolicy.id, 'combo');
  assert.equal(order.total, 2666.67);
  const requests = db
    .prepare("SELECT value FROM entities WHERE kind='funnelEvents'")
    .all()
    .map((r) => JSON.parse(r.value))
    .filter((e) => e.event === 'request');
  assert.equal(requests.length, 1);
  assert.ok(!JSON.stringify(requests).includes(body.phone));
  db.close();
  await save({
    action: 'promotion',
    promotion: campaign({
      id: 'combo',
      kind: 'combination',
      toolIds: [tools[0].id, tools[2].id],
      percent: 1,
      maxDiscount: 1,
      enabled: false,
    }),
  });
  const unsafe = await api(
    'admin',
    {
      action: 'order',
      id: created.data.id,
      status: 'confirmed',
      depositTotal: 1000,
      rentalTotal: 100,
    },
    true,
  );
  assert.equal(unsafe.status, 400);
  await save({ action: 'order', id: created.data.id, status: 'confirmed', depositTotal: 1000 });
  const extend = await api('extend', {
    id: created.data.id,
    token: created.data.token,
    end: day(12),
  });
  assert.equal(extend.status, 200);
  assert.equal(extend.data.extra, 1500);
  await save({ action: 'extension', id: created.data.id, approve: true });
  const publicOrder = await api('order?token=' + created.data.token, undefined, false, 'GET');
  assert.ok(!publicOrder.data.promotionPolicy);
  assert.equal(publicOrder.data.rentalTotal, 4166.67);
});

test('Consent, event validation, deduplication and sample metrics', async () => {
  const session = randomUUID(),
    id = randomUUID();
  assert.equal(
    (await api('event', { id, session, event: 'view', surface: 'catalog' })).status,
    400,
  );
  const event = {
    id,
    session,
    event: 'view',
    surface: 'catalog',
    consent: true,
    phone: 'do-not-save',
    url: '/sr/najam/private',
  };
  assert.equal((await api('event', event)).status, 200);
  await api('event', event);
  assert.equal(
    (await api('event', { ...event, id: randomUUID(), offerKey: 'https://bad.example/private' }))
      .status,
    400,
  );
  assert.equal(
    (await api('event', { ...event, id: randomUUID(), event: 'request' })).status,
    400,
    'requests are server recorded',
  );
  const db = new DatabaseSync(join(dir, 'rent-tools.sqlite'));
  const stored = JSON.parse(
    db.prepare('SELECT value FROM entities WHERE kind=? AND id=?').get('funnelEvents', id).value,
  );
  assert.ok(!stored.phone);
  assert.ok(!stored.url);
  assert.equal(
    db.prepare('SELECT count(*) AS n FROM entities WHERE kind=? AND id=?').get('funnelEvents', id)
      .n,
    1,
  );
  db.close();
  const metrics = (await api('admin', undefined, true, 'GET')).data.funnel;
  assert.equal(metrics.sessions, 1);
  assert.equal(metrics.conversion, 0);
});

test('Catalog filters preserve multilingual SEO and distinguish unknown inventory', async () => {
  const db = new DatabaseSync(join(dir, 'rent-tools.sqlite'));
  const t = tools[0];
  db.prepare('UPDATE entities SET value=? WHERE kind=? AND id=?').run(
    JSON.stringify({ ...t, quantity: null }),
    'tools',
    t.id,
  );
  db.close();
  const html = await (
    await fetch(
      base + '/sr/katalog?job=test-job&maxPrice=1200&start=' + day(40) + '&end=' + day(41),
    )
  ).text();
  assert.ok(html.includes('/sr/alat/' + t.slug));
  assert.ok(html.includes('Potrebna potvrda'));
  assert.ok(html.includes('noindex'));
  const available = await (
    await fetch(
      base + '/sr/katalog?job=test-job&start=' + day(40) + '&end=' + day(41) + '&available=1',
    )
  ).text();
  assert.ok(!available.includes('href="/sr/alat/' + t.slug + '"'));
  const invalid = await (await fetch(base + '/sr/katalog?available=1')).text();
  assert.ok(invalid.includes('Za proveru raspoloživosti'));
});

test('Restart preserves edited jobs, removals, flags and frozen order prices', async () => {
  const db = new DatabaseSync(join(dir, 'rent-tools.sqlite'));
  const job = JSON.parse(
    db.prepare('SELECT value FROM entities WHERE kind=? AND id=?').get('rentalJobs', 'cleaning')
      .value,
  );
  db.prepare('UPDATE entities SET value=? WHERE kind=? AND id=?').run(
    JSON.stringify({ ...job, name: loc('Edited cleaning job'), published: false }),
    'rentalJobs',
    job.id,
  );
  db.prepare('DELETE FROM entities WHERE kind=? AND id=?').run('rentalJobs', 'walls');
  db.close();
  const exited = new Promise((r) => child.once('exit', r));
  child.kill('SIGTERM');
  await exited;
  child = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3021'],
    { env, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  child.stdout.on('data', (x) => (logs += x));
  child.stderr.on('data', (x) => (logs += x));
  for (let n = 0; n < 80; n++) {
    try {
      if ((await fetch(base + '/sr')).status === 200) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  const r = await api('admin', undefined, true, 'GET');
  assert.equal(r.status, 200);
  assert.equal(r.data.jobs.find((j) => j.id === 'cleaning').name.sr, 'Edited cleaning job');
  assert.equal(r.data.jobs.find((j) => j.id === 'cleaning').published, false);
  assert.ok(!r.data.jobs.some((j) => j.id === 'walls'));
  assert.deepEqual(r.data.merchandising, { recommendationsEnabled: true, promotionsEnabled: true });
  assert.equal(r.data.orders[0].rentalTotal, 4166.67);
});
