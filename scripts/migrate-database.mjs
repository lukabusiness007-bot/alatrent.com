import { importLocalDatabase, postgresPool, databaseSchema } from '../lib/postgres.mjs';
import path from 'node:path';
const file = path.join(process.env.DATA_DIR || path.join(process.cwd(), 'data'), 'rent-tools.sqlite');
try {
  await importLocalDatabase(file);
  const result = await postgresPool().query(`SELECT kind,count(*)::int AS count FROM ${databaseSchema()}.entities GROUP BY kind ORDER BY kind`);
  console.log('Local inventory and admin password hash transferred to Supabase. Existing remote records preserved.');
  console.log(result.rows.map(row => `${row.kind}: ${row.count}`).join('\n'));
} catch (error) { console.error('Database migration failed:', error.code || error.message); process.exitCode = 1; }
finally { await postgresPool().end(); }
