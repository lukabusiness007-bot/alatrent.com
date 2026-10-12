import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {randomBytes}from'node:crypto';import{DatabaseSync}from'node:sqlite';
import{applyCatalogReduction}from'../lib/catalog-reduction-apply.mjs';
import{applyCatalogAdminCleanup,catalogAdminCleanupMigration}from'../lib/catalog-admin-cleanup.mjs';
test('PostgreSQL commits and reloads the reduction once, preserving historical entities',{skip:!process.env.TEST_POSTGRES_URL},async()=>{
 const schema='alat_rent_test_'+randomBytes(6).toString('hex');const old={POSTGRES_URL:process.env.POSTGRES_URL,POSTGRES_SCHEMA:process.env.POSTGRES_SCHEMA};process.env.POSTGRES_URL=process.env.TEST_POSTGRES_URL;process.env.POSTGRES_SCHEMA=schema;
 const pg=await import('../lib/postgres.mjs?reduction='+schema);const fallback=new DatabaseSync(':memory:');const seed=JSON.parse(fs.readFileSync('lib/seed.json')),m=JSON.parse(fs.readFileSync('lib/catalog-reduction.json'));
 const db=()=>pg.requestDatabase(fallback);const insert=(kind,id,value)=>db().prepare('INSERT INTO entities(kind,id,value) VALUES(?,?,?)').run(kind,id,JSON.stringify(value));
 try{
  await pg.withPersistentDatabase(()=>{for(const t of seed.tools)insert('tools',t.id,{...t,published:true});insert('orders','existing',{id:'existing',status:'active',items:[{toolId:'crafter-423',price:4321}]});insert('meta','seeded',true);},()=>{},false,{meta:['seeded']});
  await pg.withPersistentDatabase(()=>{},()=>assert.equal(applyCatalogReduction(db(),m),true),true,{meta:['seeded']});
  await pg.withPersistentDatabase(()=>assert.fail('Completed migration must skip initialization'),()=>{let tools=db().prepare("SELECT value FROM entities WHERE kind='tools'").all().map(r=>JSON.parse(r.value));assert.equal(tools.length,1997);assert.equal(tools.filter(t=>t.published).length,m.groups.length);assert.deepEqual(JSON.parse(db().prepare("SELECT value FROM entities WHERE kind='orders' AND id='existing'").get().value),{id:'existing',status:'active',items:[{toolId:'crafter-423',price:4321}]});},false,{meta:['seeded',m.migration]});
  await pg.withPersistentDatabase(()=>{},()=>assert.equal(applyCatalogReduction(db(),m),false),true,{meta:['seeded',m.migration]});
  await pg.withPersistentDatabase(()=>{},()=>assert.equal(applyCatalogAdminCleanup(db(),m),true),true,{meta:['seeded',m.migration]});
  await pg.withPersistentDatabase(()=>assert.fail('Completed cleanup must skip initialization'),()=>{
   assert.equal(db().prepare("SELECT count(*) AS n FROM entities WHERE kind='tools'").get().n,188);
   assert.equal(db().prepare("SELECT count(*) AS n FROM entities WHERE kind='archivedTools'").get().n,1809);
   assert.equal(JSON.parse(db().prepare("SELECT value FROM entities WHERE kind='orders' AND id='existing'").get().value).items[0].price,4321);
   assert.equal(JSON.parse(db().prepare("SELECT value FROM entities WHERE kind='archivedTools' AND id='crafter-423'").get().value).id,'crafter-423');
   assert.equal(applyCatalogAdminCleanup(db(),m),false);
  },false,{meta:['seeded',m.migration,catalogAdminCleanupMigration]});
 }finally{assert.match(schema,/^alat_rent_test_[a-f0-9]+$/);await pg.postgresPool().query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await pg.postgresPool().end();fallback.close();for(const [k,v]of Object.entries(old))v===undefined?delete process.env[k]:process.env[k]=v;}
});
