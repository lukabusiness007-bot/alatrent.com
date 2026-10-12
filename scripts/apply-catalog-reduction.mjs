/** Snapshot the configured PostgreSQL database, then apply only the approved manifest. */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { postgresPool, databaseSchema, withPersistentDatabase, requestDatabase, SQLITE_SCHEMA } from '../lib/postgres.mjs';
import { applyCatalogReduction } from '../lib/catalog-reduction-apply.mjs';
const manifest=JSON.parse(fs.readFileSync('lib/catalog-reduction.json','utf8'));
const pool=postgresPool(),fallback=new DatabaseSync(':memory:');
const destination=path.resolve('output/catalog-reduction');fs.mkdirSync(destination,{recursive:true});
const snapshot=path.join(destination,'database-before-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite');
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
try {
 const result=await withPersistentDatabase(()=>{},()=>{
  const db=requestDatabase(fallback);const changed=applyCatalogReduction(db,manifest);
  const tools=db.prepare("SELECT value FROM entities WHERE kind='tools'").all().map(r=>JSON.parse(r.value));
  const kept=tools.filter(t=>t.published);const expected=new Set(manifest.groups.map(g=>g.selectedId));
  if(kept.length!==expected.size||kept.some(t=>!expected.has(t.id)))throw new Error('Published catalog differs from the approved manifest; migration not committed.');
  return {changed,total:tools.length,published:kept.length,migration:manifest.migration};
 },true,{meta:['seeded']});
 console.log(result);
}finally{fallback.close();await pool.end();}
