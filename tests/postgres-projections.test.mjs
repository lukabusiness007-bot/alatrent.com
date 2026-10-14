import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

test('Public snapshots omit archives and unnecessary auth tables; full history and writes stay authoritative', { skip: !process.env.TEST_POSTGRES_URL }, async () => {
  const schema = 'alat_rent_test_' + randomBytes(6).toString('hex');
  const old = { POSTGRES_URL: process.env.POSTGRES_URL, POSTGRES_SCHEMA: process.env.POSTGRES_SCHEMA };
  process.env.POSTGRES_URL = process.env.TEST_POSTGRES_URL;
  process.env.POSTGRES_SCHEMA = schema;
  const pg = await import('../lib/postgres.mjs?projection=' + schema);
  const fallback = new DatabaseSync(':memory:');
  const db = () => pg.requestDatabase(fallback);
  const completion = { meta: ['ready'] };
  const noBootstrap = () => assert.fail('Completed migrations must not rerun');
  try {
    await pg.withPersistentDatabase(() => {
      const insert = db().prepare('INSERT INTO entities(kind,id,value) VALUES(?,?,?)');
      for (const [kind, id, value] of [['meta', 'ready', true], ['settings', 'main', { brand: 'Test' }], ['tools', 'current', { price: 1234 }], ['archivedTools', 'old', { price: 900 }], ['orders', 'history', { toolId: 'old' }], ['customers', 'member', { discount: 5 }]]) insert.run(kind, id, JSON.stringify(value));
      db().prepare('INSERT INTO sessions(token,expires) VALUES(?,?)').run('session', 123456789);
    }, () => {}, false, completion);
    await pg.withPersistentDatabase(noBootstrap, () => {
      assert.deepEqual(db().prepare('SELECT kind FROM entities').all().map(r => r.kind), ['settings']);
      assert.equal(db().prepare('SELECT count(*) AS n FROM sessions').get().n, 0);
    }, false, completion, { entityKinds: ['settings'] });
    await pg.withPersistentDatabase(noBootstrap, () => {
      assert.equal(db().prepare("SELECT count(*) AS n FROM entities WHERE kind='archivedTools'").get().n, 0);
      assert.equal(db().prepare("SELECT count(*) AS n FROM entities WHERE kind='orders'").get().n, 1);
      assert.equal(db().prepare("SELECT count(*) AS n FROM entities WHERE kind='customers'").get().n, 1);
      assert.equal(db().prepare('SELECT count(*) AS n FROM sessions').get().n, 1);
      assert.throws(() => db().prepare("DELETE FROM entities WHERE kind='tools'").run(), /readonly|read.only/i);
    }, false, completion, { excludeArchived: true });
    await assert.rejects(pg.withPersistentDatabase(noBootstrap, () => {}, true, completion, { entityKinds: ['tools'] }), /complete database snapshot/);
    await pg.withPersistentDatabase(noBootstrap, () => {
      const historical = JSON.parse(db().prepare("SELECT value FROM entities WHERE kind='archivedTools' AND id='old'").get().value);
      assert.equal(historical.price, 900);
      db().prepare("UPDATE entities SET value=? WHERE kind='tools' AND id='current'").run(JSON.stringify({ price: 2345 }));
    }, true, completion);
    await pg.withPersistentDatabase(noBootstrap, () => {
      assert.equal(JSON.parse(db().prepare("SELECT value FROM entities WHERE kind='tools' AND id='current'").get().value).price, 2345);
      assert.equal(JSON.parse(db().prepare("SELECT value FROM entities WHERE kind='orders'").get().value).toolId, 'old');
    }, false, completion);
  } finally {
    assert.match(schema, /^alat_rent_test_[a-f0-9]+$/);
    await pg.postgresPool().query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await pg.postgresPool().end();
    fallback.close();
    for (const [key, value] of Object.entries(old)) value === undefined ? delete process.env[key] : process.env[key] = value;
  }
});
