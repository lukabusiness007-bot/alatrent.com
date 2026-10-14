/** Audit by default. --apply backs up and prunes unused retired records atomically. */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID, scryptSync } from 'node:crypto';
import assert from 'node:assert/strict';
import { postgresPool, databaseSchema, SQLITE_SCHEMA } from '../lib/postgres.mjs';
import { planArchiveCleanup, planExpiredCleanup } from '../lib/database-cleanup.mjs';

const apply = process.argv.includes('--apply');
const testSchema = process.argv.find(arg => arg.startsWith('--test-schema='))?.slice('--test-schema='.length);
if (testSchema && !/^alat_rent_test_[a-f0-9]{12}$/.test(testSchema)) throw new Error('Invalid test schema.');
const manifest = JSON.parse(fs.readFileSync('lib/catalog-reduction.json', 'utf8'));
const appSchema = databaseSchema();
const pool = postgresPool();
const tableOrder = { entities: 'position', auth: 'id', sessions: 'token', limits: 'key', media: 'name' };
const client = await pool.connect();
let committed = false;

async function readSchema(schema) {
  const data = {};
  for (const [table, order] of Object.entries(tableOrder)) data[table] = (await client.query(`SELECT * FROM ${schema}.${table} ORDER BY ${order}`)).rows;
  return data;
}
function backupSchema(schema, data) {
  const destination = path.resolve('data/backups/database-cleanup');
  fs.mkdirSync(destination, { recursive: true, mode: 0o700 });
  fs.chmodSync(destination, 0o700);
  const file = path.join(destination, `${schema}-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0,8)}.sqlite`);
  fs.writeFileSync(file, '', { mode: 0o600, flag: 'wx' });
  const db = new DatabaseSync(file);
  try {
    db.exec(SQLITE_SCHEMA + 'CREATE TABLE media(name TEXT PRIMARY KEY,mime TEXT NOT NULL,data BLOB NOT NULL);BEGIN');
    for (const [table, rows] of Object.entries(data)) {
      for (const row of rows) {
        const columns = Object.keys(row).filter(key => key !== 'position');
        const statement = db.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`);
        statement.run(...columns.map(key => key === 'value' ? JSON.stringify(row[key]) : key === 'expires' ? Number(row[key]) : row[key]));
      }
      assert.equal(db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n, rows.length);
    }
    db.exec('COMMIT');
    assert.equal(db.prepare('PRAGMA quick_check').get().quick_check, 'ok');
  } finally { db.close(); }
  return { file, bytes: fs.statSync(file).size, sha256: createHash('sha256').update(fs.readFileSync(file)).digest('hex') };
}
async function verifiedTestSchema(schema) {
  const objects = (await client.query('SELECT table_name FROM information_schema.tables WHERE table_schema=$1 ORDER BY table_name', [schema])).rows.map(r => r.table_name);
  assert.deepEqual(objects, Object.keys(tableOrder).sort(), 'Unexpected test schema objects; aborting.');
  const extras = (await client.query(`SELECT count(*)::int AS n FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=$1`, [schema])).rows[0].n;
  assert.equal(extras, 0, 'Test schema contains unexpected functions.');
  const running = (await client.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE pid<>pg_backend_pid() AND state IN ('active','idle in transaction') AND position($1 in query)>0", [schema])).rows[0].n;
  assert.equal(running, 0, 'Test schema is still in use.');
  const data = await readSchema(schema);
  assert.equal(data.auth.length, 1, 'Expected a known test authentication fixture.');
  const auth = data.auth[0];
  assert.equal(scryptSync('postgres-test-admin-password', auth.salt, 64).toString('hex'), auth.hash, 'Schema does not belong to the known test fixture.');
  assert.equal(data.entities.filter(r => ['orders', 'requests', 'customers', 'customerSessions', 'outbox'].includes(r.kind)).length, 0, 'Schema contains business data.');
  assert.equal(data.sessions.length + data.limits.length + data.media.length, 0, 'Schema contains data outside the failed startup fixture.');
  return data;
}
async function removeEntities(rows) {
  for (const kind of new Set(rows.map(row => row.kind))) {
    const ids = rows.filter(row => row.kind === kind).map(row => row.id);
    const result = await client.query(`DELETE FROM ${appSchema}.entities WHERE kind=$1 AND id=ANY($2::text[])`, [kind, ids]);
    assert.equal(result.rowCount, ids.length);
  }
}
try {
  await client.query('BEGIN');
  await client.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='30s'");
  await client.query('SELECT pg_advisory_xact_lock(1836016740, hashtext($1))', [appSchema]);
  const data = await readSchema(appSchema);
  const expiredPlan = planExpiredCleanup(data);
  const archivePlan = planArchiveCleanup(data.entities.filter(r => !expiredPlan.entities.some(d => d.kind === r.kind && d.id === r.id)), manifest);
  const testing = testSchema ? await verifiedTestSchema(testSchema) : undefined;
  const beforeBytes = Number((await client.query(`SELECT pg_total_relation_size($1)::bigint AS bytes`, [appSchema + '.entities'])).rows[0].bytes);
  const report = {
    apply, schema: appSchema,
    publicTools: data.entities.filter(r => r.kind === 'tools' && r.value.published).length,
    databaseBytesBefore: Number((await client.query('SELECT pg_database_size(current_database())::bigint AS bytes')).rows[0].bytes),
    entityTableBytesBefore: beforeBytes,
    archivedRecordsToRemove: archivePlan.remove.length,
    archivedModelsToRemove: archivePlan.remove.filter(r => r.kind === 'archivedTools').length,
    retainedHistoricalModels: archivePlan.retainedIds.length,
    archiveLogicalBytesToRemove: archivePlan.removedBytes,
    expiredSessions: expiredPlan.sessions.length,
    expiredLimits: expiredPlan.limits.length,
    expiredEntities: expiredPlan.entities.length,
    verifiedUnusedTestSchema: testSchema || null,
  };
  if (apply) {
    report.backups = [backupSchema(appSchema, data), ...(testing ? [backupSchema(testSchema, testing)] : [])];
    const remove = [...archivePlan.remove, ...expiredPlan.entities];
    await removeEntities(remove);
    for (const [table, key, ids] of [['sessions', 'token', expiredPlan.sessions], ['limits', 'key', expiredPlan.limits]]) {
      if (ids.length) assert.equal((await client.query(`DELETE FROM ${appSchema}.${table} WHERE ${key}=ANY($1::text[])`, [ids])).rowCount, ids.length);
    }
    const after = await readSchema(appSchema);
    const expected = {
      ...data,
      entities: data.entities.filter(r => !remove.some(d => d.kind === r.kind && d.id === r.id)),
      sessions: data.sessions.filter(r => !expiredPlan.sessions.includes(r.token)),
      limits: data.limits.filter(r => !expiredPlan.limits.includes(r.key)),
    };
    assert.deepEqual(after, expected, 'Protected records changed; rolling back all cleanup.');
    if (testing) await client.query(`DROP SCHEMA ${testSchema} CASCADE`);
    report.publicToolsAfter = after.entities.filter(r => r.kind === 'tools' && r.value.published).length;
    report.entityLogicalBytesAfter = after.entities.reduce((sum, r) => sum + Buffer.byteLength(JSON.stringify(r.value)), 0);
    report.protectedRecordsPreserved = true;
    const reportFile = path.join(path.dirname(report.backups[0].file), path.basename(report.backups[0].file, '.sqlite') + '-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    await client.query('COMMIT');
    committed = true;
  } else { await client.query('ROLLBACK'); }
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  if (!committed) await client.query('ROLLBACK');
  console.error('Database cleanup aborted:', error.code || error.message);
  process.exitCode = 1;
} finally { client.release(); await pool.end(); }
