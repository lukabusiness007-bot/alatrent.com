import fs from 'node:fs';
import {catalogFamily,catalogSpecs,normalize} from './catalog-similarity.mjs';
import {catalogBrands} from '../lib/catalog-names.mjs';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const seed=read('lib/seed.json'),source=read('research/crafter-2026-10-12/products-review.json').products;
const bySourceId=new Map(source.map(s=>[String(s.productId||s.id.replace('CR-','')),s]));
const previous=read('output/catalog-cleanup/live-tools-before.json');
const beforeById=new Map(previous.map(t=>[t.id,t]));
const patch=read('lib/catalog-name-cleanup.json');
const categories=new Map(read('output/catalog-cleanup/live-categories.json').map(c=>[c.id,c.name.sr]));
const brands=catalogBrands;
const rows=seed.tools.map(seedTool=>{
 const live=beforeById.get(seedTool.id)||seedTool;
 const change=patch.entries.find(e=>e.id===live.id);
 const name=change&&live.name.sr===change.before.sr?change.after.sr:live.name.sr;
 const tool={...live,name:{...live.name,sr:name}};
 const src=tool.catalogModel?bySourceId.get(tool.catalogModel.productId):null;
 const family=catalogFamily(tool,src?.category);
 const brand=brands.find(b=>new RegExp('(?<![a-z0-9])'+normalize(b).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![a-z0-9])').test(normalize(name)))||'';
 const specs=catalogSpecs(name);
 return {id:tool.id,groupId:normalize(family.name).replace(/[^a-z0-9]+/g,'-'),group:family.name,criteria:family.criteria,name,originalName:live.name.sr,brand,...specs,
  kit:tool.catalogModel?.incompleteKit?'Solo — baterija/punjač posebno':/set|baterij|punjac|kofer|kit/i.test(name)?'Komplet/oprema navedeni u nazivu':'Komplet nije naveden',
  price:tool.price,category:categories.get(tool.categoryId)||tool.categoryId,kind:tool.catalogModel?'Konkretan model':'Opšti unos',published:tool.published,
  references:change?.references?.join(', ')||tool.catalogModel?.supplierReferences?.join(', ')||'',
  url:'https://alatrent.rs/sr/alat/'+tool.slug,sourceUrl:tool.catalogModel?.url||'',decision:'',note:''};
});
const byName=new Map();
for(const row of rows){const k=normalize(row.name).replace(/[^a-z0-9]+/g,' ').trim();const list=byName.get(k)||[];list.push(row);byName.set(k,list);}
const sameNames=[...byName.values()].filter(list=>list.length>1);
for(const list of sameNames)for(const row of list)row.note='Naziv se ponavlja; proveriti šifru, komplet i fotografije pre spajanja.';
const groups=new Map();
for(const row of rows){const g=groups.get(row.groupId)||{id:row.groupId,name:row.group,criteria:row.criteria,rows:[]};g.rows.push(row);groups.set(g.id,g);}
const ordered=[...groups.values()].sort((a,b)=>b.rows.length-a.rows.length||a.name.localeCompare(b.name,'sr'));
for(const g of ordered){g.rows.sort((a,b)=>a.name.localeCompare(b.name,'sr'));g.count=g.rows.length;g.specific=g.rows.filter(r=>r.kind==='Konkretan model').length;g.generic=g.count-g.specific;g.powers=[...new Set(g.rows.map(r=>r.powerText).filter(Boolean))];g.pressures=[...new Set(g.rows.map(r=>r.pressure).filter(Boolean))];g.prices=g.rows.map(r=>r.price).filter(p=>p!==null);g.min=g.prices.length?Math.min(...g.prices):null;g.max=g.prices.length?Math.max(...g.prices):null;}
const changes=previous.flatMap(t=>{const p=patch.entries.find(e=>e.id===t.id);return p&&t.name.sr===p.before.sr&&p.before.sr!==p.after.sr?[{id:t.id,before:p.before.sr,after:p.after.sr,references:p.references.join(', '),url:'https://alatrent.rs/sr/alat/'+t.slug}]:[];});
const report={createdAt:new Date().toISOString(),total:rows.length,groups:ordered,similarGroups:ordered.filter(g=>g.count>1).length,groupedModels:ordered.filter(g=>g.count>1).reduce((sum,g)=>sum+g.count,0),sameNames:sameNames.map(list=>list.map(r=>r.id)),changes,localizedChanges:patch.entries.length};
fs.mkdirSync('output/catalog-cleanup',{recursive:true});fs.writeFileSync('output/catalog-cleanup/catalog-review.json',JSON.stringify(report,null,2)+'\n');
console.log({total:report.total,similarGroups:report.similarGroups,groupedModels:report.groupedModels,sameNameCandidates:report.sameNames,changedSrNames:changes.length,changedLocalizedRecords:report.localizedChanges});
console.log(ordered.filter(g=>g.count>1).slice(0,15).map(g=>[g.name,g.count,g.specific,g.generic]));
