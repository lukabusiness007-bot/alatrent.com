/** Back up the complete database before removing retired offers from administration. */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { postgresPool, databaseSchema, withPersistentDatabase, requestDatabase, SQLITE_SCHEMA } from '../lib/postgres.mjs';
import { applyCatalogAdminCleanup, catalogAdminCleanupMigration } from '../lib/catalog-admin-cleanup.mjs';
const manifest=JSON.parse(fs.readFileSync('lib/catalog-reduction.json','utf8'));
const pool=postgresPool(),fallback=new DatabaseSync(':memory:');
const destination=path.resolve('output/catalog-reduction');fs.mkdirSync(destination,{recursive:true});
const snapshot=path.join(destination,'database-before-admin-cleanup-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite');
const client=await pool.connect();let backup;
try {
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const data={};
 for(const table of ['entities','auth','sessions','limits','media'])data[table]=(await client.query(`SELECT * FROM ${databaseSchema()}.${table}`)).rows;
 backup=new DatabaseSync(snapshot);fs.chmodSync(snapshot,0o600);backup.exec(SQLITE_SCHEMA+'CREATE TABLE media(name TEXT PRIMARY KEY,mime TEXT NOT NULL,data BLOB NOT NULL);');
 for(const [table,rows]of Object.entries(data))for(const row of rows){const columns=Object.keys(row).filter(k=>k!=='position');backup.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(()=>'?').join(',')})`).run(...columns.map(k=>k==='value'?JSON.stringify(row[k]):k==='expires'?Number(row[k]):row[k]));}
 await client.query('COMMIT');backup.close();backup=undefined;
 console.log({snapshot,tools:data.entities.filter(e=>e.kind==='tools').length,publishedBefore:data.entities.filter(e=>e.kind==='tools'&&e.value.published).length});
} catch(e){await client.query('ROLLBACK');throw e;}finally{backup?.close();client.release();}
if (process.argv.includes('--backup-only')) {
 fallback.close(); await pool.end();
} else try {
 const result=await withPersistentDatabase(()=>{},()=>{
  const db=requestDatabase(fallback);
  const entitiesBefore=db.prepare('SELECT kind,id,value FROM entities ORDER BY kind,id').all();
  const authBefore=JSON.stringify(db.prepare('SELECT * FROM auth').all());
  const protectedRows=rows=>JSON.stringify(rows.filter(r=>!['tools','toolOptions','archivedTools','archivedToolOptions'].includes(r.kind)&&!(r.kind==='meta'&&r.id===catalogAdminCleanupMigration)));
  const changed=applyCatalogAdminCleanup(db,manifest);
  const after=db.prepare('SELECT kind,id,value FROM entities ORDER BY kind,id').all();
  if(protectedRows(entitiesBefore)!==protectedRows(after)||authBefore!==JSON.stringify(db.prepare('SELECT * FROM auth').all()))throw new Error('Historical or authentication records changed; cleanup not committed.');
  const tools=after.filter(r=>r.kind==='tools').map(r=>JSON.parse(r.value));
  const expected=new Set(manifest.groups.map(g=>g.selectedId));
  if(tools.length!==expected.size||tools.some(t=>!expected.has(t.id)||!t.published))throw new Error('Administration differs from the approved 188 offers; cleanup not committed.');
  const archive=after.filter(r=>r.kind==='archivedTools');
  for(const row of entitiesBefore.filter(r=>r.kind==='tools'&&!expected.has(r.id)))if(!archive.some(a=>a.id===row.id&&a.value===row.value))throw new Error('Archived rental data differs from its original; cleanup not committed.');
  return {changed,administration:tools.length,removedFromAdministration:entitiesBefore.filter(r=>r.kind==='tools').length-tools.length,internalHistoricalRecords:archive.length,historyAndAuthPreserved:true,migration:catalogAdminCleanupMigration};
 },true,{meta:['seeded']});
 console.log(result);
}finally{fallback.close();await pool.end();}
