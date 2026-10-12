import fs from 'node:fs';
import {rentalPurpose} from './catalog-purpose.mjs';
import {normalize} from './catalog-similarity.mjs';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const seed=read('lib/seed.json'), sources=read('research/crafter-2026-10-12/products-review.json').products;
const bySource=new Map(sources.map(s=>[String(s.productId),s]));
const reselect=process.argv.includes('--reselect');
const primary=read('lib/catalog-reduction-primary.json');
const evidence=fs.existsSync('lib/catalog-reduction-evidence.json')?read('lib/catalog-reduction-evidence.json'):{};
const existing=fs.existsSync('lib/catalog-reduction.json')?read('lib/catalog-reduction.json'):null;
const overrides={
 'brusilica-mala':'crafter-936','brusilica-velika':'crafter-632','perac-elektricni':'crafter-31501',
 'kosilica':'crafter-22401','makaze-ograda':'crafter-32639','duvac':'crafter-35684','mini-alati':'crafter-461','agregat-monofazni':'crafter-21990','parocistaci':'crafter-33379','dubinsko-pranje':'crafter-35551',
 'pikamer':'crafter-63590','busilica-srafilica':'crafter-63082','busilica-sds-plus':'crafter-30354',
 'kompresor':'crafter-63295','glodalice':'crafter-60919','laser':'tool-055',
 'merdevine':'crafter-20586','lancana-testera':'crafter-35687','trimeri':'crafter-32934','laser':'tool-055','stubne-busilice':'crafter-476','pumpa-cista':'crafter-21755','odgusenje-cevi':'tool-094','pranje-podova':'tool-110',
 'busilica-sds-max':'crafter-535','ekscentricne-brusilice':'crafter-562','sekac-plocica-elektricni':'crafter-30788', 'pistolj-farbanje':'crafter-584','vakuumski-nosac':'tool-098', 'metalne-testere':'crafter-537', 'ubodne-testere':'crafter-491','ger-testere':'crafter-563','daljinomeri':'crafter-29677','drobilice':'crafter-21574','debljaca':'crafter-62767','udarni-odvijac':'tool-032','teleskopska-testera':'tool-121','heftalica':'tool-129','glodalica-gips':'tool-081','makaze-trava':'tool-139','busaci-zemlja':'tool-020','aeratori':'tool-092',

};
const professional=/puzzi|echo|dremel|karcher|abac|bosch.*(?:gws|gbh|gsh|gsr|gsb|gst|gks|gkt|gsa|gss|gex|gts|gof|gkf|gop|gpl|gcl|gll|glm|gds|gdr|gco|gms|gdh|gmc|gvt|grl|pro pruner)|makita|dewalt|milwaukee|metabo|mirka|karcher.*(?:hd |puzzi|nt |bds)|rothenberger|abac.*pro|pedrollo|esab|telwin|honda|stihl|stiga|mammotion|wagner|krause|cagsan|loncin|walmer|bihui|varstroj/i;
const groups=new Map(), entries=[];
for(const tool of seed.tools){
 const source=bySource.get(tool.catalogModel?.productId)||{};
 const purpose=rentalPurpose(tool,source);
 const name=normalize(tool.name.sr);
 // Bare-tool manufacturer suffixes must be checked even when the source title
 // does not say Solo (e.g. Makita DLM462Z).
 const cordless=/akumu|\baku\b|baterij|(?:gs[rb]|gds|gdr|gco|gms|gdh|gmc|gvt|grl|pro pruner) ?18v|\b(?:dtr|dum|duh|dga|dtw)\d/i.test(name);
 const verified=evidence[tool.id];
 const incomplete=!!tool.catalogModel && (!!tool.catalogModel?.incompleteKit || (cordless&&!/\d\s*(?:x|×)\s*\d.*ah|\d.*ah|set.*baterij|\bkit\b|(?:baterij.*punjac|punjac.*baterij)|dum.*battery/i.test(name)) || /\bsolo\b|\b(?:d[a-z]{2}\d+[a-z]*z[a-z]*|[a-z]+\d+dz)\b/i.test(name) || !!verified?.incomplete || (cordless && tool.catalogModel && !verified?.completeBatteryKit)) || /\bsolo\b/.test(name);
 const candidate={tool,source,purpose,incomplete,confirmedComplete:!!tool.catalogModel&&!!verified?.description&&!incomplete&&(!cordless||!!verified?.completeBatteryKit)};
 if(!purpose.excluded){const g=groups.get(purpose.key)||{key:purpose.key,name:purpose.name,candidates:[]};g.candidates.push(candidate);groups.set(g.key,g);}
 entries.push(candidate);
}
const choices=[];
for(const g of groups.values()){
 const complete=g.candidates.filter(x=>!x.incomplete);
 const models=complete.filter(x=>x.tool.catalogModel);
 const available=models.filter(x=>x.source.availability!=='Nema na stanju');
 const eligible=available.length?available:complete.filter(x=>!x.tool.catalogModel);
 const score=x=>[
  x.tool.catalogModel?1:0,
  /(?:puzzi|karcher.*(?:hd |nt )|honda|bosch.*(?:gws|gbh|gsh|gsr|gsb|gst|gks|gkt|gsa|gss|gex|gts|gof|gkf|gop|gpl|gcl|gll|glm|gds|gdr|gco|gms|gdh|gmc|gvt|grl|pro pruner)|makita|milwaukee|dewalt|metabo|stihl|mirka)/.test(normalize(x.tool.name.sr))?3:professional.test(normalize(x.tool.name.sr))?2:/professional|profi|pro comp|industrial/i.test(x.tool.name.sr)?1:0,
  /samohod/.test(normalize(x.tool.name.sr))?1:0,
  x.source.availability==='Dostupno odmah'?1:0,
  -(x.tool.catalogModel?.regularPurchasePrice||0),
 ];
 eligible.sort((a,b)=>{const sa=score(a),sb=score(b);for(let i=0;i<sa.length;i++)if(sa[i]!==sb[i])return sb[i]-sa[i];return String(a.tool.catalogModel?.sku||a.tool.id).localeCompare(String(b.tool.catalogModel?.sku||b.tool.id));});
 const forced=overrides[g.key]&&complete.find(x=>x.tool.id===overrides[g.key]&&x.source.availability!=='Nema na stanju');
 const frozen=existing?.groups.find(x=>x.key===g.key);
 const chosen=existing&&!reselect?complete.find(x=>x.tool.id===frozen?.selectedId):forced||eligible[0];
 if(chosen)choices.push({key:g.key,name:g.name,selectedId:chosen.tool.id,selectedSlug:chosen.tool.slug,
  confirmedComplete:chosen.confirmedComplete,sourceUrl:chosen.tool.catalogModel?.url||'',availability:chosen.source.availability||'Nije potvrđeno',
  reason:chosen.tool.catalogModel?(professional.test(normalize(chosen.tool.name.sr))?'Prednost ima profesionalna ili viša serija, odgovarajući kapacitet i kompletno napajanje; ostale izvedbe iste namene su arhivirane.':'Zadržan jedini odgovarajući kompletan model za ovu namenu; profesionalna klasa nije potvrđena i nabavku treba dodatno proveriti.'):'Jedinstvena namena bez potvrđenog konkretnog modela; sačuvan postojeći oglas.',
  verification:chosen.tool.catalogModel?'supplier-detail':'existing-specialized', evidence:chosen.tool.catalogModel&&evidence[chosen.tool.id]?{url:evidence[chosen.tool.id].url,observedAt:evidence[chosen.tool.id].observedAt,completeBatteryKit:evidence[chosen.tool.id].completeBatteryKit,incomplete:evidence[chosen.tool.id].incomplete,availability:evidence[chosen.tool.id].availability,...(primary.models[chosen.tool.id]?{manufacturer:primary.models[chosen.tool.id]}:{})}:null,
 });
}
const chosenByKey=new Map(choices.map(g=>[g.key,g]));
const migrationEntries=entries.map(({tool,source,purpose,incomplete})=>{
 const g=chosenByKey.get(purpose.key);
 const action=g?.selectedId===tool.id?'keep':g?'replace':'exclude';
 return {id:tool.id,slug:tool.slug,name:tool.name.sr,purposeKey:purpose.key,action,replacementId:action==='replace'?g.selectedId:null,
  reason:action==='keep'?g.reason:action==='replace'?(incomplete?'Solo ili nepotvrđen sadržaj baterijskog kompleta; zamena izabranim oglasom iste namene.':'Ista namena; zadržan jedan reprezentativan model više klase.'):purpose.reason||'Nema potvrđenog kompletnog odgovarajućeg modela za samostalnu rentu.',
  sourceUrl:tool.catalogModel?.url||'',
 };
});
const corrections=fs.existsSync('lib/catalog-reduction-corrections.json')?read('lib/catalog-reduction-corrections.json'):[];
const categoryPurposes={
 'cat-1':'perac-elektricni perac-benzinski parocistaci dubinsko-pranje usisivaci polirke cetka-behaton pranje-podova ultrazvucna-kada usisivaci-pepeo',
 'cat-2':'pumpa-prljava pumpa-cista pumpa-nulti-nivo pumpa-benzinska pumpa-povrsinska odvlazivac-isusivac-vazduha ozon-generator ventilator susilica-za-kosuljicu',
 'cat-3':'kosilica ceona-kosilica trimeri makaze-ograda makaze-teleskopske busaci-zemlja duvac drobilice freze-zemlja malcer aeratori lancana-testera cepaci freza-za-panjeve teleskopska-testera valjak-za-travnjak separaciona-freza sejalica-trava prskalice traktorska-kosilica sneg makaze-orezivanje',
 'cat-4':'busilica-sds-plus busilica-sds-max busilica-srafilica udarni-odvijac pikamer podni-pikamer slicerica-za-kanale-u-zidu zidne-brusilice betonske-brusilice pistolji-farbanje pistolj-farbanje motorni-sekac-betona vibratori-beton glodalica-gips helikopter-za-beton vibro-letva vezivanje-armature vibro-zabe vibro-ploce mesalice-beton dijamantske-busilice freza-za-beton podni-sekac-betona-i-asfalta masina-za-skidanje-tapeta podna-brusilica-beton hidraulicni-cekic pneumatski-cekic cetka-renoviranje',
 'cat-5':'ger-testere multialati sabljasta-testera glodalice hoblerice-parket rucno-rende ubodne-testere stoni-cirkular ekscentricne-brusilice tracna-brusilica rucni-cirkular masina-za-skidanje-parketa hoblerica-ivicna uranjajuca-testera debljaca heftalice heftalica vibracione-brusilice kekserice strug-drvo modelarska-testera',
 'cat-6':'metalne-testere rel-varenje mig-varenje tig-varenje brusilica-mala brusilica-velika tocilo indukcioni-grejac-za-srafove nitne fenovi magnetne-busilice plazma-sekac tracna-metal udarni-kljuc makaze-za-armaturu peskara skidac-rdje pneumatska-racna mini-alati ceone-brusilice stubne-busilice',
 'cat-7':'sekac-plocica-elektricni sekac-plocica-rucni vibracioni-pistolj-za-keramiku mesaci varilica-cevi zamrzavanje-cevi odgusenje-cevi pres-cevi pumpa-ispitivanje nareznica-cevi kamera-za-kanalizaciju obrada-ivica-plocica',
 'cat-9':'dizalice auto-dizalice kolica rucno-vitlo podizac-gips merdevine vakuumski-nosac skela radna-platforma paletari kolica-ploce gradjevinska-kolica levak-za-sut gradjevinski-podupiraci',
 'cat-10':'agregat-monofazni agregat-trofazni agregat-inverter kompresor reflektor grejanje-elektricno grejanje-plinsko rasvetni-toranj vakuum-pumpa manometarski-set-za-klime presa-za-kablovske-papucice uredjaj-za-provlacenje-kablova klime',
 'cat-11':'muljace',
};
const categoryCorrections=existing?.categoryCorrections||[];
for(const group of choices){const target=Object.entries(categoryPurposes).find(([,names])=>names.split(' ').includes(group.key))?.[0];const tool=seed.tools.find(t=>t.id===group.selectedId);if(target&&tool.categoryId!==target){if(!categoryCorrections.some(c=>c.id===tool.id))categoryCorrections.push({id:tool.id,before:tool.categoryId,after:target});tool.categoryId=target;}}
const data={corrections,categoryCorrections,migration:'catalog-reduction-high-class-2026-10-12-v1',createdAt:existing?.createdAt||new Date().toISOString(),groups:choices,entries:migrationEntries};
fs.writeFileSync('lib/catalog-reduction.json',JSON.stringify(data,null,2)+'\n');
// Seed publication follows the same manifest; all 1,997 records remain stored.
const kept=new Set(choices.map(g=>g.selectedId));
for(const tool of seed.tools)tool.published=kept.has(tool.id);
// Search preserves the functional names and aliases of the replaced generic tools.
const seo=read('lib/seo-catalog.json');
for(const group of choices){const target=seo[group.selectedSlug];if(!target)continue;const retired=entries.filter(x=>x.purpose.key===group.key&&!x.tool.catalogModel).map(x=>x.tool);target.aliases=[...new Set([...target.aliases,group.name,...retired.flatMap(t=>[t.name.sr,...(seo[t.slug]?.aliases||[])])])];}
fs.writeFileSync('lib/seo-catalog.json',JSON.stringify(seo,null,2)+'\n');
fs.writeFileSync('lib/seed.json',JSON.stringify(seed,null,2)+'\n');
const imported=read('lib/catalog-crafter-import.json');for(const tool of imported.tools){tool.published=kept.has(tool.id);tool.categoryId=seed.tools.find(t=>t.id===tool.id).categoryId;}
fs.writeFileSync('lib/catalog-crafter-import.json',JSON.stringify(imported,null,2)+'\n');
fs.mkdirSync('output/catalog-reduction',{recursive:true});
fs.writeFileSync('output/catalog-reduction/selected-models.json',JSON.stringify(choices.map(g=>({...g,tool:seed.tools.find(t=>t.id===g.selectedId)})),null,2)+'\n');
console.log({total:data.entries.length,keep:data.groups.length,replace:data.entries.filter(e=>e.action==='replace').length,exclude:data.entries.filter(e=>e.action==='exclude').length,specific:choices.filter(g=>g.sourceUrl).length});
console.log(choices.map(g=>g.key+' | '+seed.tools.find(t=>t.id===g.selectedId).name.sr).join('\n'));
