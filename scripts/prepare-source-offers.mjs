// Normalize the captured facts without converting currencies or inventing prices.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { createHash } from 'node:crypto';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const types = read('lib/equipment-types.json');
const code = stripTypeScriptTypes(readFileSync('lib/equipment-type.ts', 'utf8')
  .replace("import types from './equipment-types.json';", `const types = ${JSON.stringify(types)};`));
const { equipmentType, normalizedEquipmentName: normalize } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const captured = read('output/catalog-scrape/scraped-offers.json');
const manual = [
  [/oleo mac g 53/,16], [/fs 450|trimer stihl/,18], [/benzinski duvac|sitnilica lisca/,21],
  [/shindaiwa|gta 26|^testera$|testera motorna/,74], [/sigma|stona testera.*sekacica/,49],
  [/ekcentar/,79], [/gsa 1300/,35], [/gcm 305|testera ugaona/,33], [/gco 14/,41],
  [/puzzi/,3], [/cobra 22|odgusenje/,94], [/cekic elektro pneumatski/,24],
  [/^busalica$/,20], [/freza bastenska|^freza hidraulicna$/,90], [/grejalica na plin/,72],
  [/pumpa za mulj/,13], [/^pumpa za vodu$/,15], [/laser hilti/,55], [/^mesalica/,96],
  [/vakumska dizalica/,98], [/set kljuceva/,80], [/brusalica (mala|velika)/,43],
  [/zavijac odvijac/,31], [/testera cirkular/,84], [/^fen$/,47], [/mikser profesionalni/,51],
  [/skakavac/,89], [/vibrator betona/,30], [/sekacica podna/,101],
  [/elektricno rende/,38],
  [/teleskopske kombinovane makaze/,127], [/pcs pro/,128], [/makaze za travu.*teleskop/,139],
];
const serviceMap = [
  [/termalna kamera.*mid/, [58]], [/termalna kamera.*flir/, [58]], [/termovizij/, [58]],
  [/endoskop/, [57]], [/akusticna kamera/, [163]], [/akusticna detekcija/, [59]],
  [/tracer gas/, [167]], [/gas sniffer/, [162]], [/dimnom/, [165]], [/uv boj/, [166]],
  [/testiranje pritiskom/, [104]], [/vlaznosti zida|map mapiranje/, [156]],
  [/kvaliteta vazduha|prisutnosti gasova/, [161]], [/pritiska/, [104]], [/jacine zvuka/, [170]],
  [/zamrzavanje/, [76]], [/potrosnje struje/, [160]], [/poplave/, [179]],
  [/dron.*termal/, [169]], [/dron/, [168]],
];
const amount = value => Number(value.includes(',') ? value.replaceAll('.', '').replace(',', '.') : /^\d{1,3}(\.\d{3})+$/.test(value) ? value.replaceAll('.', '') : value);
const makePrice = (label, value, currency, unit, vat = 'unspecified') => ({ label, amount: amount(value), currency, unit, vat });
const offers = [], excluded = [];
const occurrences = new Map();
for (const raw of captured.offers.sort((a,b) => `${a.source}|${a.url}|${a.name}|${a.detail}`.localeCompare(`${b.source}|${b.url}|${b.name}|${b.detail}`))) {
  const name = normalize(raw.name.replace(/najam\s*\/\s*iznajmljivanje/ig, ''));
  const key = createHash('sha256').update(raw.source + raw.url + raw.name + raw.detail).digest('hex').slice(0,16);
  const occurrence = occurrences.get(key) || 0;
  occurrences.set(key, occurrence + 1);
  const id = occurrence ? key + '-' + occurrence : key;
  const reason = /bager|utovarivac|bobcat|damper|tandem.*valjak|mini traktorsk|gradevinska dizalica|green machine/.test(name)
    ? 'Teška ili samohodna mehanizacija'
    : /kontejner|solarne panele/.test(name) ? 'Van asortimana alata' : /usisivac za putevi/.test(name) ? 'Mehanizacija za puteve' : '';
  if (reason) { excluded.push({ id, source: raw.source, url: raw.url, name: raw.name, reason }); continue; }
  const kind = raw.category === 'service' ? (/uredjaj za merenje|alarm uredjaj/.test(name) ? 'sale' : 'service') : raw.category === 'sale' ? 'sale' : 'rental';
  let toolIds = [];
  if (raw.source === 'beodetect.com') {
    toolIds = serviceMap.filter(([regex]) => regex.test(name)).flatMap(([,ids]) => ids.map(id => `tool-${String(id).padStart(3,'0')}`));
  } else {
    // A few source labels are model names rather than functional equipment names.
    const override = manual.find(([regex]) => regex.test(name));
    const matched = types.find(t => t.slug === equipmentType(name));
    if (override) toolIds = [`tool-${String(override[1]).padStart(3,'0')}`];
    else if (matched) toolIds = [matched.id];
    if (/komplet/.test(name)) {
      if (/podna/.test(name)) toolIds = ['tool-132', 'tool-004'];
      else if (/beton/.test(name)) toolIds = ['tool-027', 'tool-004'];
      else if (/zirafa/.test(name)) toolIds = ['tool-026', 'tool-004'];
    }
  }
  let priceText = '', notes = [], prices = [], depositText = '', discrepancy = '';
  if (raw.source === 'iznajmialat.rs') {
    priceText = 'Cena na upit';
    notes = ['Najam nema objavljen iznos. Dostava: I zona 1.000 RSD; II zona 2.000 RSD; III zona 3.000 RSD. Povratak se naplaćuje zasebno po istoj tarifi.'];
  } else if (raw.source === 'rentmasina.rs') {
    const lines = raw.detail.split('\n').map(s=>s.trim()).filter(Boolean);
    priceText = lines.flatMap((line, i) => /Cena/i.test(line) ? [line + (!/\d/.test(line) && lines[i+1] ? ' ' + lines[i+1] : '')] : []).join('; ');
    notes = raw.priceEvidence;
    const deposit = raw.detail.match(/Depozit[^\n]*:?\s*\n?\s*([\d.,]+\s*(?:€|eur|EUR)?)/i);
    depositText = deposit?.[0].replace(/\s+/g,' ') || '';
    for (const match of priceText.matchAll(/([\d.,]+)\s*€/g)) {
      const unit = kind === 'sale' ? 'sale' : /\/mes/.test(priceText) ? 'month/item' : /\/m\b/.test(priceText) ? 'day/meter' : 'day';
      prices.push(makePrice(priceText, match[1], 'EUR', unit));
    }
  } else if (raw.source === 'pozajmime.rs') {
    const prefix = raw.detail.split('Tenge Rent')[0];
    const lines = prefix.split('\n').map(s=>s.trim()).filter(Boolean);
    notes = lines.filter(line => /RSD|PDV|Depozit|popust|posebno|rezna|brusna|Cena najma/i.test(line));
    const headline = notes.find(line=>/^Najam (mašine|kompleta)/i.test(line));
    const gross = headline?.match(/=\s*([\d.,]+)\s*RSD\s*\/\s*dan/);
    const card = raw.cardText.match(/([\d.,]+)RSD\s*\/\s*dan/);
    if (gross) {
      priceText = headline;
      prices.push(makePrice('Najam sa PDV, 24h',gross[1],'RSD','day','included'));
      if (card && amount(card[1]) !== amount(gross[1])) discrepancy = `Kartica: ${card[1]} RSD/dan; opis: ${gross[1]} RSD/dan. Potrebna provera kod izvora.`;
    } else if (card && amount(card[1]) > 1) {
      priceText = card[1] + ' RSD / dan'; prices.push(makePrice('Kartica oglasa',card[1],'RSD','day'));
    } else priceText = 'Cena na upit';
    // Additional pack prices, wear charges and consumables stay in the original notes.
    const tierText = raw.detail.match(/Popusti za duže periode\n([\s\S]*?)Rezerviši/)?.[1]?.replace(/\s+/g,' ');
    if (tierText) {
      notes.push('Popusti za duže periode: ' + tierText);
      for (const match of tierText.matchAll(/(\d+)(\s*\+\s*dana|\s*-\s*\d+\s*dana)\s*:\s*([\d.,]+)\s*RSD\/dan/g)) {
        const label = (match[1] + match[2]).replace(/\s*([+-])\s*/g, '$1').replace(/dana$/, ' dana').replace(/\s+/g, ' ');
        prices.push(makePrice(label,match[3],'RSD','day'));
      }
    }
    depositText = notes.find(line=>/^Depozit:/i.test(line)) || '';
  } else {
    priceText = raw.priceEvidence[0];
    notes = ['Cena usluge ili uređaja, nije dnevni najam.'];
    const values = [...priceText.matchAll(/\d+(?:[.,]\d+)?/g)];
    if (values.length === 1) prices.push(makePrice(priceText, values[0][0], 'EUR', /Uređaj|Alarm/i.test(raw.name) ? 'device' : 'service'));
  }
  offers.push({ id, source: raw.source, url: raw.url, name: raw.name, category: raw.category, kind,
    toolIds: [...new Set(toolIds)], priceText, prices, priceNotes: notes, depositText, discrepancy,
    observedAt: captured.observedAt });
}
// Additional published prices in the specifically supplied article differ from the current price list.
offers.push(...[
  ['Termovizijska detekcija — navedeni članak',75,['tool-058']],
  ['Detekcija specijalnim instrumentima — navedeni članak',120,['tool-059']],
].map(([name,value,toolIds],i)=>({id:'beodetect-article-'+i,source:'beodetect.com',url:captured.beodetectArticle.url,name,category:'service',kind:'service',toolIds,
  priceText:`od ${value} € / izlazak`,prices:[makePrice('Od',String(value),'EUR','service')],priceNotes:['Članak navodi početnu cenu; aktuelni cenovnik je sačuvan kao zaseban izvor. Nije cena dnevnog najma.'],depositText:'',discrepancy:'',observedAt:captured.observedAt})));
const result = {observedAt:captured.observedAt, offers};
mkdirSync('research/catalog-2026-10-12', {recursive:true});
writeFileSync('lib/catalog-source-offers.json',JSON.stringify(result,null,2)+'\n');
writeFileSync('research/catalog-2026-10-12/coverage.json',JSON.stringify({observedAt:captured.observedAt,pages:captured.pages,errors:captured.errors,profileCount:captured.profileCount,excluded,
  equipmentPages:captured.equipmentPages.map(({url,title})=>({url,title})),
  sourceCounts:Object.fromEntries([...new Set(captured.offers.map(o=>o.source))].map(source=>[source,{captured:captured.offers.filter(o=>o.source===source).length,included:offers.filter(o=>o.source===source).length}]))},null,2)+'\n');
console.log(`Saved ${offers.length} offers; excluded ${excluded.length}; new inventory remains inquiry-priced where daily rent is unavailable.`);
console.log('Unmapped:',offers.filter(o=>!o.toolIds.length&&o.kind==='rental').map(o=>o.name));
console.log('Conflicting source prices:',offers.filter(o=>o.discrepancy).map(o=>({name:o.name,discrepancy:o.discrepancy})));
