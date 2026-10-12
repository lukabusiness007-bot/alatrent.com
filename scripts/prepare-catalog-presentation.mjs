import fs from 'node:fs';
import {cleanCatalogName} from '../lib/catalog-names.mjs';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const seed=read('lib/seed.json'),imported=read('lib/catalog-crafter-import.json'),seo=read('lib/seo-catalog.json'),offers=read('lib/catalog-source-offers.json');
const previous=fs.existsSync('lib/catalog-name-cleanup.json')?read('lib/catalog-name-cleanup.json'):null;
const now=previous?.createdAt || new Date().toISOString();
const overrides={
  'crafter-62816':{sr:'Scheppach akumulatorski duvač lišća BC-BLV720-X IXES',en:'Scheppach cordless leaf blower BC-BLV720-X IXES',ru:'Scheppach аккумуляторная воздуходувка BC-BLV720-X IXES',tr:'Scheppach akülü yaprak üfleme makinesi BC-BLV720-X IXES',zh:'Scheppach 无绳吹叶机 BC-BLV720-X IXES'},
};
const entries=[];
for(const tool of seed.tools){
 const before={...tool.name},after={},references=new Set();
 for(const [locale,name] of Object.entries(before)){
  const cleaned=cleanCatalogName(name,locale);after[locale]=cleaned.name;
  cleaned.references.forEach(r=>references.add(r));
 }
 if(overrides[tool.id]){
  const source='bc-blv720-xixes5912105900';
  for(const locale of Object.keys(after)) after[locale]=after[locale].replace(new RegExp(source,'gi'),'BC-BLV720-X IXES').replace(/lišća(?=BC)/g,'lišća ');
  Object.assign(after,overrides[tool.id]);references.add('5912105900');
 }
 const changed=Object.keys(before).some(l=>before[l]!==after[l]);
 if(!changed)continue;
 const codes=[...references];
 entries.push({id:tool.id,before,after,references:codes});
 for(const locale of Object.keys(after))tool.description[locale]=tool.description[locale].replace(before[locale],after[locale]);
 tool.name=after;
 if(tool.catalogModel && codes.length)tool.catalogModel.supplierReferences=[...new Set([...(tool.catalogModel.supplierReferences||[]),...codes])];
 const entry=seo[tool.slug];
 if(entry){entry.term=entry.term.replace(before.sr,after.sr);entry.use=entry.use.replace(before.sr,after.sr);entry.selection=entry.selection.replace(before.sr,after.sr);entry.aliases=entry.aliases.map(a=>cleanCatalogName(a,'sr').name);}
}
// Keep the original migration expectations on reruns; a clean seed should
// never erase the patch that existing databases still need to receive.
const patch=new Map((previous?.entries||[]).map(e=>[e.id,e]));
for(const entry of entries){const earlier=patch.get(entry.id);patch.set(entry.id,earlier?{...entry,before:earlier.before,references:[...new Set([...earlier.references,...entry.references])]}:entry);}
const byId=new Map(seed.tools.map(t=>[t.id,t]));
imported.tools=imported.tools.map(t=>byId.get(t.id));
for(const offer of offers.offers){
 const override=offer.toolIds?.map(id=>overrides[id]).find(Boolean);
 offer.name=override?.sr || cleanCatalogName(offer.name,'sr').name;
}
write('lib/catalog-name-cleanup.json',{migration:'catalog-presentation-2026-10-12-v1',createdAt:now,entries:[...patch.values()]});
write('lib/seed.json',seed);write('lib/catalog-crafter-import.json',imported);write('lib/seo-catalog.json',seo);write('lib/catalog-source-offers.json',offers);
console.log({changedThisRun:entries.length,migrationEntries:patch.size,withReferences:[...patch.values()].filter(e=>e.references.length).length});
