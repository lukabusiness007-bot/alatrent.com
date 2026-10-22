import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { renderEmail } from '../lib/email/templates.ts';
import { deliverEmailBatch } from '../lib/email/delivery.ts';

test('Every email has branded HTML, plain text, localized links and escaped user input', () => {
  for (const locale of ['sr', 'en', 'ru', 'tr', 'zh']) for (const kind of ['contact-received', 'club-welcome', 'rental-received']) {
    const rendered = renderEmail({ kind, locale, name: '<img src=x onerror="alert(1)">&', reference: '<CT-123>', discount: 7, threshold: 4 });
    assert.match(rendered.html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;&amp;/);
    assert.doesNotMatch(rendered.html, /<img src=x/);
    assert.match(rendered.html, /https:\/\/alatrent.rs\/favicon.png/);
    assert.match(rendered.html, /#d8ff3e/);
    assert.match(rendered.html, /#7bc8c5/);
    assert.ok(rendered.html.includes(`https://alatrent.rs/${locale}/${kind === 'club-welcome' ? 'nalog' : 'katalog'}`));
    assert.ok(rendered.text.includes('https://alatrent.rs/' + locale));
    assert.ok(rendered.subject && !/[\r\n]/.test(rendered.subject));
    assert.doesNotMatch(rendered.html, /<script|<iframe|recoveryHash|accessToken/);
    if (kind === 'club-welcome') { assert.match(rendered.text, /7%/); assert.match(rendered.text, /4/); }
  }
});

test('Overlapping workers claim a receipt once and keep provider acknowledgement', async () => {
  const messages = [{ id: 'once', status: 'queued', attempts: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
  let sends = 0;
  const deps = {
    claim: async () => messages.filter(m => m.status === 'queued').map(m => { m.status = 'sending'; return { ...m, attempts: ++m.attempts }; }),
    send: async () => { sends++; await new Promise(r => setTimeout(r, 10)); return 'ses-provider-id'; },
    finish: async m => { Object.assign(messages[0], m); },
  };
  await Promise.all([deliverEmailBatch(deps), deliverEmailBatch(deps)]);
  assert.equal(sends, 1);
  assert.equal(messages[0].status, 'sent');
  assert.equal(messages[0].providerId, 'ses-provider-id');
});

test('SES throttling can retry, permanent rejections stop and ambiguous requests never resend automatically', async () => {
  for (const [error, status, exhausted] of [
    [{ name: 'TooManyRequestsException', $metadata: { httpStatusCode: 429 } }, 'failed', false],
    [{ name: 'MessageRejected', $metadata: { httpStatusCode: 400 } }, 'failed', true],
    [new Error('request timed out with private detail'), 'unknown', true],
  ]) {
    let saved;
    const result = await deliverEmailBatch({ claim: async () => [{ id: 'failed', attempts: 1 }], send: async () => { throw error; }, finish: async m => { saved = m; } });
    assert.equal(saved.status, status);
    assert.equal(saved.attempts === 4, exhausted);
    assert.equal(result[status], 1);
    assert.ok(!saved.error.includes('private detail'));
  }
  let sends = 0;
  await assert.rejects(deliverEmailBatch({ claim: async () => [{ id: 'ack', attempts: 1 }], send: async () => { sends++; return 'accepted'; }, finish: async () => { throw new Error('database unavailable'); } }), /database unavailable/);
  assert.equal(sends, 1, 'a persistence error must not cause a second SES request');
});

const dir = mkdtempSync(join(tmpdir(), 'rent-email-test-'));
const base = 'http://127.0.0.1:3027';
let child, logs = '', admin = '';
async function request(path, body, cookie = '', method = 'POST', origin = base) {
  const r = await fetch(base + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', Cookie: cookie }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: r.status, data: await r.json().catch(() => null), cookie: r.headers.get('set-cookie')?.split(';')[0] };
}
function entities(kind) {
  const db = new DatabaseSync(join(dir, 'rent-tools.sqlite'));
  try { return db.prepare('SELECT value FROM entities WHERE kind=?').all(kind).map(r => JSON.parse(r.value)); }
  finally { db.close(); }
}
before(async () => {
  child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3027'], {
    env: { ...process.env, POSTGRES_URL: '', DATABASE_URL: '', POSTGRES_PRISMA_URL: '', DATA_DIR: dir, ADMIN_PASSWORD: 'email-test-admin-password',
      SES_ENABLED: 'false', SES_ROLE_ARN: '', AWS_ACCESS_KEY_ID: '', AWS_SECRET_ACCESS_KEY: '', CRON_SECRET: 'email-test-job-secret' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', x => logs += x); child.stderr.on('data', x => logs += x);
  for (let i = 0; i < 120; i++) { try { if ((await fetch(base + '/sr')).ok) { admin = (await request('/api/login', { password: 'email-test-admin-password' })).cookie; return; } } catch {} await new Promise(r => setTimeout(r, 250)); }
  throw new Error(logs);
});
after(async () => { if (child?.exitCode === null) { const exited = new Promise(r => child.once('exit', r)); child.kill('SIGTERM'); await exited; } rmSync(dir, { recursive: true, force: true }); });

test('Contact form validates, saves an admin-visible inquiry and queues exactly one receipt across retries', async () => {
  const body = { name: 'Test kontakt', email: 'CONTACT@example.com', phone: '+381601234567', message: 'Probni upit za izbor alata.', consent: true, locale: 'sr', idempotency: randomUUID() };
  assert.equal((await request('/api/contact', { ...body, website: 'spam' })).status, 400);
  assert.equal((await request('/api/contact', { ...body, consent: false })).status, 400);
  assert.equal((await request('/api/contact', { ...body, email: 'invalid' })).status, 400);
  assert.equal((await request('/api/contact', body, '', 'POST', 'https://attacker.example')).status, 403);
  assert.equal(entities('emails').length, 0);
  const sent = await request('/api/contact', body);
  assert.equal(sent.status, 201);
  assert.match(sent.data.id, /^CT-/);
  assert.equal((await request('/api/contact', body)).data.id, sent.data.id);
  assert.equal((await request('/api/contact', { ...body, email: 'different@example.com' })).status, 409);
  const messages = entities('emails');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].to, 'contact@example.com');
  assert.equal(messages[0].status, 'queued');
  assert.equal(messages[0].content.kind, 'contact-received');
  const data = await request('/api/commerce/admin', undefined, admin, 'GET');
  assert.ok(data.data.email.inquiries.some(e => e.id === sent.data.id && e.email === 'contact@example.com' && e.note === body.message));
});

test('Club signup queues a localized welcome without passwords or recovery codes; failed signup sends nothing', async () => {
  const body = { name: 'Test član', email: 'MEMBER@example.com', phone: '+381609991827', password: 'email-membership-password', consent: true, locale: 'en' };
  const joined = await request('/api/commerce/register', body);
  assert.equal(joined.status, 201, JSON.stringify(joined.data));
  const messages = entities('emails').filter(m => m.content.kind === 'club-welcome');
  assert.equal(messages.length, 1);
  assert.equal(messages[0].content.locale, 'en');
  assert.equal(messages[0].content.discount, 5);
  assert.equal(messages[0].content.threshold, 3);
  assert.ok(!JSON.stringify(messages).includes(joined.data.recovery));
  assert.ok(!JSON.stringify(messages).includes(body.password));
  assert.equal((await request('/api/commerce/register', body)).status, 400);
  assert.equal(entities('emails').filter(m => m.content.kind === 'club-welcome').length, 1);
});

test('Cart idempotency queues one pending rental acknowledgement and private endpoints remain protected', async () => {
  const tool = entities('tools').find(t => t.published && t.price !== null && t.quantity !== 0);
  const start = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
  const body = { items: [{ toolId: tool.id, start, end: start, quantity: 1 }], name: 'Test najmoprimac', phone: '+381609991828', email: 'renter@example.com', consent: true, locale: 'sr', delivery: 'pickup', idempotency: randomUUID() };
  const sent = await request('/api/commerce/order', body);
  assert.equal(sent.status, 201, JSON.stringify(sent.data));
  assert.equal((await request('/api/commerce/order', body)).data.id, sent.data.id);
  const messages = entities('emails').filter(m => m.content.kind === 'rental-received');
  assert.equal(messages.length, 1);
  assert.ok(!JSON.stringify(messages).includes(sent.data.token));
  assert.equal((await request('/api/admin/emails')).status, 403);
  assert.equal((await request('/api/jobs/email', undefined, '', 'GET')).status, 401);
  const cron = await fetch(base + '/api/jobs/email', { headers: { Authorization: 'Bearer email-test-job-secret' } });
  assert.equal(cron.status, 200);
  assert.equal((await cron.json()).setupRequired, true);
  const adminData = await request('/api/commerce/admin', undefined, admin, 'GET');
  assert.equal(adminData.data.email.messages.length, 3);
  assert.equal(adminData.data.email.ready, false);
  assert.equal(entities('emails').filter(m => m.status === 'sent').length, 0);
});
