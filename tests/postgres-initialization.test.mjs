import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const enabled = !!process.env.TEST_POSTGRES_URL;

test('Completed cold starts read while a writer holds the initialization lock; missing flags and auth still bootstrap', { skip: !enabled }, async () => {
  const schema = 'alat_rent_test_' + randomBytes(6).toString('hex');
  const old = { POSTGRES_URL: process.env.POSTGRES_URL, POSTGRES_SCHEMA: process.env.POSTGRES_SCHEMA };
  process.env.POSTGRES_URL = process.env.TEST_POSTGRES_URL;
  process.env.POSTGRES_SCHEMA = schema;
  const modules = [], fallback = new DatabaseSync(':memory:');
  const fresh = async () => {
    const module = await import('../lib/postgres.mjs?initialization=' + randomBytes(6).toString('hex'));
    modules.push(module); return module;
  };
  let holder;
  try {
    const setup = await fresh();
    const write = (module, id) => module.requestDatabase(fallback).prepare("INSERT INTO entities(kind,id,value) VALUES('meta',?,'true')").run(id);
    await setup.withPersistentDatabase(() => write(setup, 'ready'), () => {}, false, { meta: ['ready'] });
    holder = await setup.postgresPool().connect();
    await holder.query('BEGIN');
    await holder.query('SELECT pg_advisory_xact_lock(1836016740, hashtext($1))', [schema]);

    const cold = await fresh();
    let timeout;
    try {
      const result = await Promise.race([
        cold.withPersistentDatabase(() => assert.fail('Completed bootstrap must not rerun'),
          () => cold.requestDatabase(fallback).prepare("SELECT value FROM entities WHERE id='ready'").get().value,
          false, { meta: ['ready'] }),
        new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Cold read waited for the writer lock')), 8000); }),
      ]);
      assert.equal(result, 'true');
    } finally {
      clearTimeout(timeout); await holder.query('ROLLBACK'); holder.release(); holder = undefined;
    }

    const missing = await fresh();
    let migrations = 0;
    await missing.withPersistentDatabase(() => { migrations++; write(missing, 'new-migration'); }, () => {},
      false, { meta: ['ready', 'new-migration'] });
    assert.equal(migrations, 1, 'A newly added migration still runs');

    const auth = await fresh();
    let bootstraps = 0;
    await auth.withPersistentDatabase(() => {
      bootstraps++;
      auth.requestDatabase(fallback).prepare('INSERT INTO auth(id,salt,hash) VALUES(1,?,?)').run('test-salt', 'test-hash');
    }, () => {}, false, { meta: ['ready', 'new-migration'], requireAuth: true });
    assert.equal(bootstraps, 1, 'Missing first-time admin credentials still bootstrap');

    const readyAuth = await fresh();
    await readyAuth.withPersistentDatabase(() => assert.fail('Existing credentials must not be overwritten'),
      () => assert.equal(readyAuth.requestDatabase(fallback).prepare('SELECT hash FROM auth WHERE id=1').get().hash, 'test-hash'),
      false, { meta: ['ready', 'new-migration'], requireAuth: true });
  } finally {
    if (holder) { await holder.query('ROLLBACK'); holder.release(); }
    if (modules.length) {
      assert.match(schema, /^alat_rent_test_[a-f0-9]+$/);
      await modules[0].postgresPool().query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await Promise.all(modules.map(module => module.postgresPool().end()));
    }
    fallback.close();
    for (const [key, value] of Object.entries(old)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
