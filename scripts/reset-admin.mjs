import { postgresConfigured, postgresPool, databaseSchema } from '../lib/postgres.mjs';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync } from 'node:crypto';
import { mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import path from 'node:path';
const dir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
mkdirSync(dir, { recursive: true });
const password = process.env.ADMIN_PASSWORD || randomBytes(18).toString('base64url');
if (password.length < 12) throw new Error('Lozinka mora imati najmanje 12 znakova.');
const salt = randomBytes(32).toString('hex');
const hash = scryptSync(password, salt, 64).toString('hex');
if (postgresConfigured()) {
  const client = await postgresPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(1836016740,hashtext($1))', [databaseSchema()]);
    await client.query(`INSERT INTO ${databaseSchema()}.auth(id,salt,hash) VALUES(1,$1,$2) ON CONFLICT(id) DO UPDATE SET salt=EXCLUDED.salt,hash=EXCLUDED.hash`, [salt,hash]);
    await client.query(`DELETE FROM ${databaseSchema()}.sessions`);
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); await postgresPool().end(); }
} else {
  const db = new DatabaseSync(path.join(dir, 'rent-tools.sqlite'));
  db.exec('CREATE TABLE IF NOT EXISTS auth (id INTEGER PRIMARY KEY CHECK(id=1),salt TEXT NOT NULL,hash TEXT NOT NULL); CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY,expires INTEGER NOT NULL);');
  db.prepare('INSERT OR REPLACE INTO auth VALUES(1,?,?)').run(salt,hash);
  db.exec('DELETE FROM sessions');
  db.close();
}
const file = path.join(dir, 'admin-access.txt');
writeFileSync(
  file,
  'Alat Rent — admin pristup\n\nURL: http://localhost:3010/admin\nLozinka: ' +
    password +
    '\n\nReset: npm run admin:reset\nOvaj fajl nije deo Git repozitorijuma. Ne objavljivati.\n',
  { mode: 0o600 },
);
chmodSync(file, 0o600);
console.log('Admin lozinka je sačuvana u data/admin-access.txt.');
