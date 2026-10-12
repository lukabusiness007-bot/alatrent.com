import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import pg from 'pg';
import { readFileSync } from 'node:fs';

const enabled = !!process.env.TEST_POSTGRES_URL;
const seed = JSON.parse(readFileSync(new URL('../lib/seed.json', import.meta.url)));
const name = 'alat_rent_test_' + randomBytes(6).toString('hex');
const dir = mkdtempSync(join(tmpdir(), 'alat-rent-pg-'));
const password = 'postgres-test-admin-password';
const bases = ['http://127.0.0.1:3021','http://127.0.0.1:3022'];
let clients = [], cookies = [], connection, uploaded;
const headers = i => ({ Origin: bases[i], Cookie: cookies[i] || '', 'Content-Type': 'application/json' });
async function start(i) {
 const child = spawn(process.execPath,['scripts/start-production.mjs'],{
  env:{...process.env,VERCEL:'1',POSTGRES_URL:process.env.TEST_POSTGRES_URL,DATABASE_URL:'',POSTGRES_PRISMA_URL:'',POSTGRES_SCHEMA:name,ADMIN_PASSWORD:password,DATA_DIR:join(dir,'blocked','data'),PORT:String(3021+i),APP_HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe'],
 });
 clients[i]=child;let logs='';child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
 for(let n=0;n<100;n++){
  try{if((await fetch(bases[i]+'/sr')).ok)return;}catch{}
  if(child.exitCode!==null)break;
  await new Promise(r=>setTimeout(r,250));
 }
 throw new Error(logs);
}
async function stop(i){const c=clients[i];if(c&&c.exitCode===null){const exited=new Promise(r=>c.once('exit',r));c.kill('SIGTERM');await exited;}}
async function post(i,path,body){return fetch(bases[i]+path,{method:'POST',headers:headers(i),body:JSON.stringify(body)});}
before(async()=>{
 if(!enabled)return;
 writeFileSync(join(dir,'blocked'),'The app cannot write a SQLite file here.');
 const url=new URL(process.env.TEST_POSTGRES_URL);url.searchParams.delete('sslmode');
 connection=new pg.Client({connectionString:url.href,ssl:{rejectUnauthorized:true,ca:readFileSync('config/certs/supabase-ca.crt','utf8')},connectionTimeoutMillis:15000});
 await connection.connect();
 await start(0);await start(1);
 for(let i=0;i<2;i++){const response=await post(i,'/api/login',{password});assert.equal(response.status,200);cookies[i]=response.headers.get('set-cookie').split(';')[0];}
});
after(async()=>{
 await Promise.all([stop(0),stop(1)]);
 if(connection){assert.match(name,/^alat_rent_test_[a-f0-9]+$/);await connection.query(`DROP SCHEMA ${name} CASCADE`);await connection.end();}
 rmSync(dir,{recursive:true,force:true});
});

test('Supabase enables hosted admin with the full catalog and a read-only server filesystem',{skip:!enabled},async()=>{
 const response=await fetch(bases[0]+'/api/admin/all',{headers:headers(0)});assert.equal(response.status,200);
 const data=await response.json();assert.equal(data.tools.length,seed.tools.length);assert.ok(data.tools.every(t=>t.price===seed.tools.find(preset=>preset.id===t.id)?.price));
 assert.equal(data.categories.length,10);
 assert.ok(!(await(await fetch(bases[0]+'/sr')).text()).includes('catalog-notice'));
 assert.ok(!(await(await fetch(bases[0]+'/admin',{headers:headers(0)})).text()).includes('Administracija trenutno nije dostupna'));
});

test('Writes from two independent instances preserve both records and reject duplicates',{skip:!enabled},async()=>{
 const data=await(await fetch(bases[0]+'/api/admin/all',{headers:headers(0)})).json();
 const template=data.tools[0];
 const make=(id,title)=>({...template,id,slug:id,name:{sr:title,en:title,ru:title,tr:title,zh:title},featured:false});
 const responses=await Promise.all([post(0,'/api/admin/tools',make('pg-test-one','Postgres test inventory one')),post(1,'/api/admin/tools',make('pg-test-two','Postgres test inventory two'))]);
 assert.deepEqual(responses.map(r=>r.status),[200,200]);
 const list=await(await fetch(bases[1]+'/api/admin/all',{headers:headers(1)})).json();
 assert.ok(list.tools.some(t=>t.id==='pg-test-one'));assert.ok(list.tools.some(t=>t.id==='pg-test-two'));
 const duplicate=await post(1,'/api/admin/tools',make('pg-driver-duplicate','Šrafilica Bosch 18V'));assert.equal(duplicate.status,409);
});

test('Uploaded images and admin sessions remain available after server restart',{skip:!enabled},async()=>{
 const bytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMCkAAAAASUVORK5CYII=','base64');
 const body=new FormData();body.set('file',new File([bytes],'test.png',{type:'image/png'}));
 const response=await fetch(bases[0]+'/api/uploads',{method:'POST',headers:{Origin:bases[0],Cookie:cookies[0]},body});assert.equal(response.status,200);uploaded=(await response.json()).url;
 await stop(0);await start(0);
 const media=await fetch(bases[0]+uploaded);assert.equal(media.status,200);assert.equal(media.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await media.arrayBuffer()),bytes);
 const data=await(await fetch(bases[0]+'/api/admin/all',{headers:headers(0)})).json();assert.ok(data.tools.some(t=>t.id==='pg-test-one'));
});

test('Private app tables are inaccessible to anonymous and authenticated API roles',{skip:!enabled},async()=>{
 const result=await connection.query(`SELECT has_schema_privilege('anon',$1,'USAGE') AS anon,has_schema_privilege('authenticated',$1,'USAGE') AS authenticated`,[name]);
 assert.equal(result.rows[0].anon,false);assert.equal(result.rows[0].authenticated,false);
});
