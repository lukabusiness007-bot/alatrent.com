import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {spawnSync} from 'node:child_process';import {tmpdir} from 'node:os';import path from 'node:path';import {DatabaseSync} from 'node:sqlite';
import {rentalPurpose} from '../scripts/catalog-purpose.mjs';import {applyCatalogReduction} from '../lib/catalog-reduction-apply.mjs';
const seed=JSON.parse(fs.readFileSync('lib/seed.json')),manifest=JSON.parse(fs.readFileSync('lib/catalog-reduction.json'));
const tool=(name,id='new-model')=>({id,name:{sr:name},catalogModel:{productId:'new'}});
test('Rental purposes distinguish operations and reject ordinary accessories',()=>{
 assert.equal(rentalPurpose(tool('Pneumatski čekić za kompresor')).key,'pneumatski-cekic');
 assert.equal(rentalPurpose(tool('Bosch GSH 11 E elektro-pneumatski čekić')).key,'pikamer');
 assert.equal(rentalPurpose(tool('Makita DHR202Z akumulatorski pneumatski čekić bušilica')).key,'busilica-sds-plus');
 assert.equal(rentalPurpose(tool('Honda Mio čeona grebenasta kosačica')).key,'ceona-kosilica');
 assert.equal(rentalPurpose(tool('Honda samohodna motorna kosilica 46 cm')).key,'kosilica');
 assert.equal(rentalPurpose(tool('Makita GA9020 velika ugaona brusilica 230 mm')).key,'brusilica-velika');
 assert.equal(rentalPurpose(tool('Makita mala ugaona brusilica 125 mm')).key,'brusilica-mala');
 assert.equal(rentalPurpose(tool('Tračna testera za metal')).key,'tracna-metal');
 assert.equal(rentalPurpose(tool('Stihl duvač SHA 56 AK sistem')).key,'duvac');
 assert.equal(rentalPurpose(tool('Шрафилица Бош 18V')).key,'busilica-srafilica');
 assert.equal(rentalPurpose(tool('Set točkova za skelu')).excluded,true);
 assert.equal(rentalPurpose(tool('Set burgija za beton')).excluded,true);
 for(const [name,key]of [['INGCO kosačica GLM141182 3 kW samohodna','kosilica'],['Makita HM1812 pneumatski čekić za rušenje','podni-pikamer'],['Villager VLN 385 rotaciona brusilica 150 mm','ekscentricne-brusilice'],['Podna brusilica za beton','podna-brusilica-beton'],['Ivična hoblerka za parket Bosch','hoblerica-ivicna'],['Farm potapajuća pumpa za nečistu vodu','pumpa-prljava'],['Farm potapajuća pumpa za čistu vodu','pumpa-cista'],['Villager VLN 1943 udarni zavijač','udarni-kljuc'],['Bosch GEX 12V-150-3 ekscentar brusilica','ekscentricne-brusilice'],['Einhell TE-SM 36/210 potezna testera','ger-testere'],['Einhell TE-AP 18/28 višenamenska testera','sabljasta-testera'],['Makita DCO180Z glodalica','glodalica-gips'],['Bosch PFS5000E mašina za krečenje','pistolj-farbanje']])assert.equal(rentalPurpose(tool(name)).key,key,name);
});
test('All 1997 records have one decision and every purpose exactly one published choice',()=>{
 assert.equal(manifest.entries.length,seed.tools.length);assert.equal(new Set(manifest.entries.map(e=>e.id)).size,seed.tools.length);
 assert.equal(new Set(manifest.groups.map(g=>g.key)).size,manifest.groups.length);
 assert.ok(manifest.groups.length<220);
 const byId=new Map(seed.tools.map(t=>[t.id,t]));const winners=new Set(manifest.groups.map(g=>g.selectedId));
 assert.equal(winners.size,manifest.groups.length);
 for(const t of seed.tools)assert.equal(t.published,winners.has(t.id),t.id);
 for(const e of manifest.entries){assert.ok(e.reason);if(e.action==='replace'){assert.ok(winners.has(e.replacementId));assert.notEqual(e.id,e.replacementId);assert.notEqual(e.slug,byId.get(e.replacementId).slug);assert.equal(manifest.entries.find(t=>t.id===e.replacementId).purposeKey,e.purposeKey);}if(e.action==='exclude')assert.equal(e.replacementId,null);}
 assert.ok(!seed.tools.filter(t=>t.published).some(t=>t.catalogModel?.incompleteKit));
});
test('Reduction preserves rates, photos, unknown stock, old rental snapshots, and is idempotent',()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE entities(kind TEXT,id TEXT,value TEXT,PRIMARY KEY(kind,id))');
 const put=(kind,id,v)=>db.prepare('INSERT INTO entities VALUES(?,?,?)').run(kind,id,JSON.stringify(v));
 const get=(kind,id)=>JSON.parse(db.prepare('SELECT value FROM entities WHERE kind=? AND id=?').get(kind,id).value);
 for(const t of seed.tools)put('tools',t.id,{...t,published:true,price:t.id==='crafter-936'?8765:t.id==='crafter-63082'?null:t.price,categoryId:manifest.categoryCorrections.find(c=>c.id===t.id)?.before||t.categoryId,quantity:null});
 const old=manifest.entries.find(e=>e.action==='replace'), survivor=old.replacementId;
 put('orders','old-rental',{id:'old-rental',items:[{toolId:old.id,price:4321,quantity:1}],status:'active'});
 put('bundles','test-bundle',{id:'test-bundle',toolIds:[old.id,survivor,'tool-006'],discount:5,published:true});
 put('promotions','combo',{id:'combo',kind:'combination',toolIds:[old.id,survivor],enabled:true});
 put('toolOptions',old.id,{instructions:'Manual instructions preserved',relatedIds:[old.id,'tool-006'],alternativeIds:[],recommendations:[{toolId:old.id,kind:'upgrade',rank:1},{toolId:'tool-006',kind:'complement',rank:2}]});
 const orders=get('orders','old-rental');const before=seed.tools.map(t=>get('tools',t.id));
 assert.equal(applyCatalogReduction(db,manifest),true);
 assert.equal(get('tools','crafter-936').price,8765);assert.deepEqual(get('orders','old-rental'),orders);
 for(const t of before){const after=get('tools',t.id);for(const field of ['id','slug','name','description','categoryId','image','price','quantity','deposit','catalogModel'])assert.deepEqual(after[field],field==='categoryId'?(manifest.categoryCorrections.find(c=>c.id===t.id)?.after||t[field]):field==='price'&&t.id==='crafter-63082'?seed.tools.find(x=>x.id===t.id).price:t[field],t.id+' '+field);}
 assert.deepEqual(get('bundles','test-bundle').toolIds,[survivor]);assert.equal(get('bundles','test-bundle').published,false);
 assert.deepEqual(get('toolOptions',survivor).recommendations,[]);assert.equal(get('promotions','combo').enabled,false);
 assert.equal(get('toolOptions',survivor).instructions,'Manual instructions preserved');
 const snapshot=db.prepare('SELECT * FROM entities ORDER BY kind,id').all();assert.equal(applyCatalogReduction(db,manifest),false);assert.deepEqual(db.prepare('SELECT * FROM entities ORDER BY kind,id').all(),snapshot);db.close();
});

test('Future imports preserve the approved choice and archive new variants until curated',()=>{
 const dir=fs.mkdtempSync(path.join(tmpdir(),'catalog-freeze-'));try{fs.mkdirSync(path.join(dir,'lib'));fs.mkdirSync(path.join(dir,'research/crafter-2026-10-12'),{recursive:true});for(const name of ['seed.json','catalog-reduction.json','catalog-crafter-import.json','seo-catalog.json','catalog-reduction-evidence.json','catalog-reduction-corrections.json','catalog-reduction-primary.json'])fs.copyFileSync('lib/'+name,path.join(dir,'lib',name));fs.copyFileSync('research/crafter-2026-10-12/products-review.json',path.join(dir,'research/crafter-2026-10-12/products-review.json'));
 const expanded=JSON.parse(JSON.stringify(seed));const chosen=expanded.tools.find(t=>t.id==='crafter-936');expanded.tools.push({...chosen,id:'future-cheap-grinder',slug:'future-cheap-grinder',price:500,catalogModel:{...chosen.catalogModel,productId:'new',regularPurchasePrice:1000}});expanded.tools.push({id:'future-special-machine',slug:'future-special-machine',name:{sr:'Nova specijalizovana mašina'},published:true});fs.writeFileSync(path.join(dir,'lib/seed.json'),JSON.stringify(expanded));
 const result=spawnSync(process.execPath,[path.resolve('scripts/prepare-catalog-reduction.mjs')],{cwd:dir,encoding:'utf8'});assert.equal(result.status,0,result.stderr);const final=JSON.parse(fs.readFileSync(path.join(dir,'lib/catalog-reduction.json')));assert.deepEqual(final.groups.map(g=>g.selectedId),manifest.groups.map(g=>g.selectedId));assert.equal(final.entries.find(e=>e.id==='future-cheap-grinder').replacementId,'crafter-936');assert.equal(final.entries.find(e=>e.id==='future-special-machine').action,'exclude');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
