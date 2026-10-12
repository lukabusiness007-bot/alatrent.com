import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
const dir=mkdtempSync(join(tmpdir(),'rent-referrals-test-'));
const base='http://127.0.0.1:3015';
const password='referral-tests-password-2026';
let child,admin='',cfg,tool,ref,buyer,order,logs='';
let serial=100;
const date=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
async function request(path,body,cookie=admin,method='POST') {
  const response=await fetch(base+path,{method,headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
}
const api=(action,body,cookie='')=>request('/api/commerce/'+action,body,cookie);
const manage=body=>request('/api/commerce/admin',body);
const data=()=>request('/api/commerce/admin',undefined,admin,'GET');
async function member(referral='') {
  const phone='+38160788'+String(++serial).padStart(4,'0');
  const r=await api('register',{phone,name:'Test member '+serial,password:'referral-password-long',consent:true,referral});
  assert.equal(r.status,201,JSON.stringify(r.body));
  return { ...r.body.customer, cookie:r.cookie };
}
const items=(priceDays=1,start=10)=>[{toolId:tool.id,quantity:1,start:date(start),end:date(start+priceDays-1)}];
const booking=(c,extra={})=>({items:items(),phone:c.phone,name:c.name,locale:'sr',delivery:'pickup',consent:true,idempotency:randomUUID(),referralCode:ref.referralCode,...extra});
const opts=(day=1000,prep=1000)=>({instructions:'Model instructions',manualUrl:'',videoUrl:'',model:'Test model',relatedIds:[],alternativeIds:[],costPerDay:day,preparationCost:prep});
async function finish(id) {
  for(const status of ['confirmed','active','completed']) {
    const r=await manage({action:'order',id,status,paid:status==='completed',referralVerified:true});
    assert.equal(r.status,200,JSON.stringify(r.body));
  }
}
function fixture(kind,id,mutate) {
  const db=new DatabaseSync(join(dir,'rent-tools.sqlite'));
  const row=db.prepare('SELECT value FROM entities WHERE kind=? AND id=?').get(kind,id);
  db.prepare('INSERT INTO entities(kind,id,value) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET value=excluded.value').run(kind,id,JSON.stringify(mutate(row?JSON.parse(row.value):undefined)));
  db.close();
}
before(async()=>{
  const env={...process.env, POSTGRES_URL: '', DATABASE_URL: '', POSTGRES_PRISMA_URL: '',DATA_DIR:dir,ADMIN_PASSWORD:password};
  assert.equal(spawnSync(process.execPath,['scripts/reset-admin.mjs'],{env}).status,0);
  child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3015'],{env,stdio:['ignore','pipe','pipe']});
  child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
  for(let i=0;i<80;i++){try{if((await fetch(base+'/sr')).ok)break;}catch{}await new Promise(r=>setTimeout(r,250));}
  const login=await request('/api/login',{password},'');assert.equal(login.status,200,logs);admin=login.cookie;
});
after(async()=>{if(child){child.kill();await new Promise(r=>child.once('exit',r));}rmSync(dir,{recursive:true,force:true});});

test('Activation requires costs; defaults preserve old settings and do not invent profitability',async()=>{
  let d=(await data()).body;cfg=d.config;
  assert.equal(cfg.referralProgram.enabled,false);
  assert.equal(d.referrals.costedTools,0);
  cfg={...cfg,referralProgram:{...cfg.referralProgram,enabled:true}};
  const blocked=await manage({action:'config',config:cfg});assert.equal(blocked.status,400);assert.match(blocked.body.error,/trošak/);
  for(const t of d.tools) fixture('toolOptions',t.id,o=>({...opts(100,100),...o,costPerDay:100,preparationCost:100}));
  const t=d.tools[0];
  const result=await request('/api/admin/tools',{...t,id:undefined,slug:'referral-test-tool',price:5000,quantity:50,name:{sr:'Referral tool',en:'Referral tool',ru:'Referral tool',tr:'Referral tool',zh:'Referral tool'}});
  assert.equal(result.status,200);tool=result.body;
  assert.equal((await manage({action:'tool',id:tool.id,options:opts()})).status,200);
  assert.equal((await manage({action:'config',config:cfg})).status,200);
  ref=await member();buyer=await member(ref.referralCode.toLowerCase());
});
test('First rental gets 10%, delivery excluded, account required, code normalized',async()=>{
  const r=await api('quote',{items:items(),delivery:'standard',referralCode:' '+ref.referralCode.toLowerCase()+' '},buyer.cookie);
  assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.rentalTotal,4500);assert.equal(r.body.referral.discount,500);assert.equal(r.body.total,6000);
  assert.equal(r.body.referral.referrerId,'');assert.deepEqual(r.body.referral.policy.memberIds,[]);
  assert.equal(r.body.items[0].instructions.costPerDay,undefined);
  assert.equal((await api('quote',{items:items(),delivery:'pickup',referralCode:ref.referralCode})).status,400);
  assert.equal((await api('quote',{items:items(),delivery:'pickup',referralCode:ref.referralCode},ref.cookie)).status,400);
  assert.equal((await api('quote',{items:items(),delivery:'pickup',referralCode:'INVALID'},buyer.cookie)).status,400);
});
test('Cap is 1000 per order; duration and referral discounts do not stack',async()=>{
  const capped=await api('quote',{items:[{...items()[0],quantity:4}],delivery:'pickup',referralCode:ref.referralCode},buyer.cookie);
  assert.equal(capped.body.rentalTotal,19000);assert.equal(capped.body.referral.discount,1000);
  const duration=await api('quote',{items:items(5),delivery:'pickup',referralCode:ref.referralCode},buyer.cookie);
  assert.equal(duration.body.rentalTotal,22000);assert.equal(duration.body.referral.discount,0);
  assert.equal(duration.body.items[0].reason,'duration');
});
test('Concurrent requests reserve first-rental eligibility; replay is idempotent, cancellation releases it',async()=>{
  const b=booking(buyer);
  const results=await Promise.all([api('order',b,buyer.cookie),api('order',{...b,idempotency:randomUUID()},buyer.cookie)]);
  assert.deepEqual(results.map(r=>r.status).sort(),[201,400]);
  const winner=results.find(r=>r.status===201);
  const retry=await api('order',b,buyer.cookie);
  if(results[0].status===201) assert.equal(retry.body.id,winner.body.id);
  assert.equal((await manage({action:'order',id:winner.body.id,status:'cancelled'})).status,200);
  const fresh=await api('order',booking(buyer),buyer.cookie);assert.equal(fresh.status,201);order=fresh.body.id;
});
test('Identity confirmation and actual contribution are required; price tampering cannot bypass them',async()=>{
  assert.equal((await manage({action:'order',id:order,status:'confirmed'})).status,400);
  await manage({action:'tool',id:tool.id,options:opts(null,null)});
  assert.equal((await manage({action:'order',id:order,status:'confirmed',referralVerified:true})).status,400);
  await manage({action:'tool',id:tool.id,options:opts(2000,1500)});
  const loss=await manage({action:'order',id:order,status:'confirmed',referralVerified:true});
  assert.equal(loss.status,400);assert.match(loss.body.error,/3100/);
  await manage({action:'tool',id:tool.id,options:opts()});
  assert.equal((await manage({action:'order',id:order,status:'confirmed',referralVerified:true,rentalTotal:1000})).status,400);
  const accepted=await manage({action:'order',id:order,status:'confirmed',referralVerified:true});assert.equal(accepted.status,200);
  assert.equal(accepted.body.rentalTotal,4500,'failed transaction must not persist price change');
});
test('Reward only after paid completion, once, only to referrer; extension preserves cap and terms',async()=>{
  const ext=await api('extend',{id:order,end:date(11)},buyer.cookie);assert.equal(ext.status,200);assert.equal(ext.body.extra,4500);
  const approved=await manage({action:'extension',id:order,approve:true});assert.equal(approved.status,200);assert.equal(approved.body.rentalTotal,9000);assert.equal(approved.body.referral.discount,1000);
  assert.equal((await manage({action:'order',id:order,status:'active'})).status,200);
  assert.equal((await manage({action:'order',id:order,status:'completed'})).status,400);
  assert.equal((await manage({action:'order',id:order,status:'completed',paid:true})).status,200);
  assert.equal((await manage({action:'order',id:order,status:'completed',paid:true})).status,400);
  const d=(await data()).body;
  assert.equal(d.customers.find(c=>c.id===buyer.id).credit,0);
  assert.equal(d.customers.find(c=>c.id===ref.id).credit,500);
  assert.equal(d.referrals.rewards.length,1);
  assert.equal((await api('quote',{items:items(),delivery:'pickup',referralCode:ref.referralCode},buyer.cookie)).status,400);
  const me=await request('/api/commerce/me',undefined,ref.cookie,'GET');
  assert.equal(me.body.referrals.successful,1);assert.equal(me.body.referrals.remaining,2);
  assert.ok(!JSON.stringify(me.body.referrals).includes(buyer.phone));
});
test('Monthly cap includes reversals, code pause, pilot scope and expiry are enforced',async()=>{
  for(let i=0;i<3;i++){
    const c=await member();const r=await api('order',booking(c),c.cookie);assert.equal(r.status,201);await finish(r.body.id);
  }
  let d=(await data()).body;assert.equal(d.referrals.rewards.length,3);assert.equal(d.customers.find(c=>c.id===ref.id).credit,1500);
  assert.equal(d.referrals.orders.filter(o=>o.referralStatus==='limit').length,1);
  const c=await member();
  await manage({action:'referral-pause',id:ref.id,paused:true});
  assert.equal((await api('quote',{items:items(),delivery:'pickup',referralCode:ref.referralCode},c.cookie)).status,400);
  await manage({action:'referral-pause',id:ref.id,paused:false});
  const scoped={...cfg,referralProgram:{...cfg.referralProgram,memberIds:[buyer.id]}};
  assert.equal((await manage({action:'config',config:scoped})).status,200);
  assert.equal((await api('quote',{items:items(),delivery:'pickup',referralCode:ref.referralCode},c.cookie)).status,400);
  fixture('commerce','config',o=>({...o,referralProgram:{...o.referralProgram,memberIds:[],pilotEndsAt:'2020-01-01T00:00:00Z'}}));
  assert.equal((await api('quote',{items:items(),delivery:'pickup',referralCode:ref.referralCode},c.cookie)).status,400);
  assert.equal((await manage({action:'config',config:cfg})).status,200);
});
test('Refund reversal is audited and idempotent; spent rewards create debt without negative redemption',async()=>{
  fixture('customers',ref.id,c=>({...c,credit:0}));
  assert.equal((await manage({action:'referral-reverse',id:order,reason:'Refund confirmed'})).status,200);
  assert.equal((await manage({action:'referral-reverse',id:order,reason:'Refund confirmed'})).status,200);
  const d=(await data()).body;assert.equal(d.customers.find(c=>c.id===ref.id).credit,-500);
  assert.ok(d.referrals.rewards.find(r=>r.orderId===order).reversedAt);
  const q=await api('quote',{items:items(),delivery:'pickup',useCredit:true,referralCode:''},ref.cookie);
  assert.equal(q.status,200);assert.equal(q.body.credit,0);assert.equal(q.body.total,5000);
  const me=await request('/api/commerce/me',undefined,ref.cookie,'GET');assert.equal(me.body.referrals.remaining,0);
});
test('Old guest rentals, mismatched phones, company rentals and short orders cannot claim first-rental offer',async()=>{
  const c=await member();
  fixture('requests','old-request',()=>({id:'old-request',phone:c.phone,status:'completed'}));
  assert.equal((await api('quote',{items:items(),delivery:'pickup',referralCode:ref.referralCode},c.cookie)).status,400);
  const fresh=await member();
  assert.equal((await api('order',booking(fresh,{phone:buyer.phone}),fresh.cookie)).status,400);
  const team=await manage({action:'team',team:{name:'Test company',customerIds:[fresh.id],discount:5}});
  assert.equal((await api('quote',{items:items(),delivery:'pickup',referralCode:ref.referralCode,teamId:team.body.id},fresh.cookie)).status,400);
  await request('/api/admin/tools',{...tool,price:4000});
  assert.equal((await api('quote',{items:items(),delivery:'pickup',referralCode:ref.referralCode},fresh.cookie)).status,400);
  await request('/api/admin/tools',tool);
});
test('Registration attribution expires, explicit clearing works, legacy codes and balances survive',async()=>{
  const c=await member(ref.referralCode);
  fixture('customers',c.id,o=>({...o,referredAt:'2020-01-01T00:00:00Z'}));
  let q=await api('quote',{items:items(),delivery:'pickup'},c.cookie);assert.equal(q.body.referral,undefined);
  q=await api('quote',{items:items(),delivery:'pickup',referralCode:ref.referralCode},c.cookie);assert.equal(q.body.rentalTotal,4500);
  q=await api('quote',{items:items(),delivery:'pickup',referralCode:''},c.cookie);assert.equal(q.body.rentalTotal,5000);
  fixture('customers',ref.id,o=>({...o,referralCode:'ABCDEF123456',credit:150}));
  q=await api('quote',{items:items(),delivery:'pickup',referralCode:'abcdef123456'},c.cookie);assert.equal(q.body.rentalTotal,4500);
  assert.equal((await data()).body.customers.find(x=>x.id===ref.id).credit,150);
});
test('Combined referral and existing credit are limited and must still cover the contribution target',async()=>{
  const c=await member();fixture('customers',c.id,o=>({...o,credit:1500}));
  const b=booking(c,{referralCode:'ABCDEF123456',useCredit:true});
  const q=await api('quote',b,c.cookie);assert.equal(q.body.rentalTotal,4500);assert.equal(q.body.credit,900);assert.equal(q.body.total,3600);
  const r=await api('order',b,c.cookie);assert.equal(r.status,201);
  await manage({action:'tool',id:tool.id,options:opts(1500,1000)});
  const denied=await manage({action:'order',id:r.body.id,status:'confirmed',referralVerified:true});assert.equal(denied.status,400);assert.match(denied.body.error,/2380/);
  await manage({action:'tool',id:tool.id,options:opts()});
  assert.equal((await manage({action:'order',id:r.body.id,status:'confirmed',referralVerified:true})).status,200);
  await manage({action:'order',id:r.body.id,status:'cancelled'});
  assert.equal((await request('/api/commerce/me',undefined,c.cookie,'GET')).body.customer.credit,1500);
});
test('Reward redemption on a later rental also has a cost guard; missing costs cannot mean free operation',async()=>{
  const c=await member();fixture('customers',c.id,o=>({...o,credit:1500}));
  const r=await api('order',booking(c,{referralCode:'',useCredit:true}),c.cookie);assert.equal(r.status,201);
  await manage({action:'tool',id:tool.id,options:opts(null,null)});
  assert.equal((await manage({action:'order',id:r.body.id,status:'confirmed'})).status,400);
  await manage({action:'tool',id:tool.id,options:opts(2000,1500)});
  const denied=await manage({action:'order',id:r.body.id,status:'confirmed'});assert.equal(denied.status,400);assert.match(denied.body.error,/3200/);
  await manage({action:'tool',id:tool.id,options:opts()});
  assert.equal((await manage({action:'order',id:r.body.id,status:'confirmed'})).status,200);
  await manage({action:'order',id:r.body.id,status:'cancelled'});
});
