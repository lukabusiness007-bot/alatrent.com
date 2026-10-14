import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planArchiveCleanup, planExpiredCleanup } from '../lib/database-cleanup.mjs';
const row = (kind, id, value = {}) => ({ kind, id, value });
const manifest = { entries: ['old', 'related', 'unused', 'options-only', 'published'].map(id => ({ id, action: 'replace' })).concat([{ id: 'current', action: 'keep' }]) };

test('Unused known archives are removed while history, dependent options, custom and published archives remain', () => {
  const rows = [row('tools', 'current'), row('orders', 'real', { items: [{ toolId: 'old', price: 1234 }] }),
    row('archivedTools', 'old', { slug: 'old-slug' }), row('archivedToolOptions', 'old', { relatedIds: ['related'] }),
    row('archivedTools', 'related'), row('archivedTools', 'unused'), row('archivedToolOptions', 'unused'),
    row('archivedToolOptions', 'options-only'), row('archivedTools', 'custom'), row('archivedTools', 'published', { published: true }),
    row('archivedTools', 'current')];
  const before = structuredClone(rows);
  const plan = planArchiveCleanup(rows, manifest);
  assert.deepEqual(plan.remove, [{ kind: 'archivedTools', id: 'unused' }, { kind: 'archivedToolOptions', id: 'unused' }, { kind: 'archivedToolOptions', id: 'options-only' }]);
  assert.deepEqual(plan.retainedIds, ['current', 'custom', 'old', 'published', 'related']);
  assert.ok(plan.removedBytes > 0);
  assert.deepEqual(rows, before);
  assert.equal(planArchiveCleanup(rows.filter(r => !plan.remove.some(d => d.kind === r.kind && d.id === r.id)), manifest).remove.length, 0);
});

test('Saved internal links and legacy requests preserve the original model', () => {
  const archives = [row('archivedTools', 'old', { slug: 'old-slug' })];
  for (const data of [{ toolId: 'old' }, { prices: { old: 200 } }, { note: 'Vidi https://example.rs/sr/alat/old-slug?ref=1' }, { manualUrl: '/sr/uputstvo/old%2Dslug' }]) {
    assert.equal(planArchiveCleanup([...archives, row('requests', 'legacy', data)], manifest).remove.length, 0);
  }
  assert.equal(planArchiveCleanup([...archives, row('toolOptions', 'old', { manualUrl: 'https://example.rs/manual' })], manifest).remove.length, 0);
});

test('Ephemeral cleanup removes only expired sessions, limits and telemetry outside existing 90-day retention', () => {
  const now = Date.parse('2026-10-14T12:00:00Z');
  const data = {
    sessions: [{ token: 'old', expires: now - 1 }, { token: 'valid', expires: now + 1 }],
    limits: [{ key: 'old', expires: now - 1 }, { key: 'valid', expires: now }, { key: 'invalid', expires: 'unknown' }],
    entities: [row('customerSessions', 'old', { expires: now - 1 }), row('customerSessions', 'valid', { expires: now + 1 }),
      row('funnelEvents', 'old', { at: new Date(now - 91 * 86400000).toISOString() }), row('funnelEvents', 'recent', { at: new Date(now - 89 * 86400000).toISOString() }),
      row('funnelEvents', 'invalid', { at: 'invalid' }), row('orders', 'historical', { expires: now - 1 }), row('customers', 'real', { expires: now - 1 })],
  };
  assert.deepEqual(planExpiredCleanup(data, now), { sessions: ['old'], limits: ['old'], entities: [{ kind: 'customerSessions', id: 'old' }, { kind: 'funnelEvents', id: 'old' }] });
});
