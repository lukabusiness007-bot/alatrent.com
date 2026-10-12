import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cleanCatalogName} from '../lib/catalog-names.mjs';
import {catalogFamily,catalogSpecs} from '../scripts/catalog-similarity.mjs';
const seed=JSON.parse(fs.readFileSync(new URL('../lib/seed.json',import.meta.url)));
test('Clean names preserve model codes and measurements while separating supplier references and contact text',()=>{
 const bosch=cleanCatalogName('Bosch GWS 750-125 mala ugaona brusilica 125mm 750W (0601394001)');
 assert.equal(bosch.name,'Bosch GWS 750-125 mala ugaona brusilica 125 mm 750 W');
 assert.deepEqual(bosch.references,['0601394001']);
 assert.equal(cleanCatalogName('INGCO benzinski trimer GBC5624411').name,'INGCO benzinski trimer GBC5624411');
 assert.equal(cleanCatalogName('Bosch GLT 18V-5000 Solo 18V').name,'Bosch GLT 18V-5000 Solo 18 V');
 assert.equal(cleanCatalogName('Perač 1500W — tel: 064/123-4567').name,'Perač 1500 W');
 assert.equal(cleanCatalogName('Bušilica +381 64 123 4567').name,'Bušilica');
 for(const name of ['Akumulatorska šrafilica','Akustični detektor curenja vode','Akustična kamera'])assert.equal(cleanCatalogName(name).name,name);
 assert.equal(cleanCatalogName('Einhell aku vazdušna pumpa').name,'Einhell akumulatorska vazdušna pumpa');
 assert.equal(cleanCatalogName('Einhell aku univerzalna sejalica').name,'Einhell akumulatorska univerzalna sejalica');
});
test('Every shipped localized name is idempotent, bounded and free of standalone long reference numbers',()=>{
 for(const tool of seed.tools)for(const [locale,name]of Object.entries(tool.name)){
  assert.equal(cleanCatalogName(name,locale).name,name,tool.id+':'+locale);
  assert.ok(name.length>0&&name.length<=200,tool.id);
  assert.ok(!/(?<![\p{L}\p{N}])\d{7,}(?![\p{L}\p{N}])/u.test(name),tool.id);
 }
});
test('Comparison groups distinguish pressure washers, compressors, drilling and demolition',()=>{
 const group=(name,category='')=>catalogFamily({id:'sample',name:{sr:name}},category).id;
 assert.equal(group('Karcher kompresorski čistač HD 5/15 C Plus','Perači pod pritiskom'),'peraci-pritisak');
 assert.equal(group('Kompresor 50 l 2 kW'),'kompresori');
 assert.equal(group('Bosch GBH 185-Li akumulatorski hamer'),'busilice-cekici');
 assert.equal(group('Bosch GSH čekić za rušenje SDS Max'),'rusenje');
 assert.equal(group('Karcher OC 3 mobilni akumulatorski perač','Perači pod pritiskom'),'mobilni-peraci');
 assert.equal(group('Hidraulični agregat sa čekićem'),'hidraulicni-agregati');
});
test('Specs convert explicit units and retain unknown or ranged power without guessing from model codes',()=>{
 const s=catalogSpecs('Bosch UniversalAquatak 125 1500 W 125 bar max 360 l/h');
 assert.equal(s.kw,1.5);assert.equal(s.pressure,'125 bar max');assert.equal(s.flow,360);
 assert.equal(catalogSpecs('Model GWS 750-125').kw,null);
 assert.equal(catalogSpecs('Agregat ECT7500 4/7 kW').kw,null);
 assert.equal(catalogSpecs('Agregat ECT7500 4/7 kW').powerText,'4/7 kW');
 assert.equal(catalogSpecs('Bosch GLT 18V-5000').voltage,'');
 assert.equal(catalogSpecs('Pumpa 25 l/min').flow,1500);
});
