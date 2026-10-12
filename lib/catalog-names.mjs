// Presentation only: keep model identifiers and measurements, move long
// supplier references out of customer-facing names.
export const catalogBrands = ['Bosch','Einhell','Makita','DeWalt','Milwaukee','Ryobi','Villager','Scheppach','Stihl','Karcher','Gardena','Stiga','Castelgarden','Honda','Farm','Ingco','Wurth','Graphite','Rothenberger','Wolfcraft','Unior','Neo','Nakayama','Nexsas','Michelin','Lavor','Sprintus','Mirka','Metabo','Kress','Mammotion','Worx','AL-KO','Stanley','Magnum','Stella','Blade','Conmetall','Telwin','Gude','Güde','Kasei','AR Blue Clean','AGM','AGT','MS','MTG','ABAC','ESAB','Commel','Jasic','Bihui','Cagsan','Rem Power','Dolomite','Echo','Dremel','Yato','Žaže','Walmer','Crafter','Pedrollo','Hugong','Krause','Loncin','Varstroj','Dabel','Muta','Wagner','Tele Safe','Praxis','Black+Decker','Macher','Lynx','Bigz','Digitech','Zilan','Workshopr','Gedore','Vari','Curver','Wilo','Union','Fox','Prosto','Tesy','Ecomex','Liv','Collomix','Eurotis','Ledvance','Hisense','Midea','Tesla','Vivax','Vox','Pubert','Hardy','Insize','DES'];
const nounEnd = value => {
  const nouns = [...value.toLowerCase().matchAll(/(?<!\p{L})(rende|makaze|bušilica|šrafilica|brusilica|testera|kosilica|kosačica|pumpa|glodalica|heftalica|mazalica|polirka|lampa|sejalica|račna|bušač|odvijač|odvrtač|zavrtač|kompresor|čekić|hamer|ključ|reflektor|pištolj|fen|duvač|trimer|uređaj|set|alat|tresač|raspršivač|aerator)(?!\p{L})/gu)];
  const n=nouns[0]?.[0];
  return n==='rende'?'o':n==='makaze'?'e':n?.endsWith('a')?'a':'i';
};

/** @param {string} value @param {string} [locale] */
export function cleanCatalogName(value, locale='sr') {
  const references=[],contacts=[];
  let name=value.normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g,'').replace(/[\t\r\n]+/g,' ');
  name=name.replace(/\brothnberger\b/gi,'Rothenberger').replace(/\bblack\s*(?:&|\+|and)\s*decker\b/gi,'Black+Decker');
  name=name.replace(/\b(?:telefon|phone|pozovi(?:te)?|call|kontakt|contact|tel|mob)\s*[:.]?\s*(?:\+?381|0)[\d\s()/.-]{6,}\d/giu,m=>{contacts.push(m.trim());return '';});
  name=name.replace(/\+381[\d\s()/.-]{7,}\d|\b0[1-6]\d\s*\/\s*\d[\d\s.-]{4,}\d/gu,m=>{contacts.push(m.trim());return '';});
  name=name.replace(/https?:\/\/\S+|www\.\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}/giu,m=>{contacts.push(m);return '';});
  name=name.replace(/(?<![\p{L}\p{N}])(\d{7,14})(?![\p{L}\p{N}])(?!\s*(?:W|kW|V|Ah|mm|cm|kg|bar|l\/h)\b)/gu,(_,code)=>{references.push(code);return '';});
  name=name.replace(/\(\s*\)|\[\s*\]/g,'').replace(/\bSUPER\s+(?=INGCO\b)/gi,'');
  if(locale==='sr') {
    name=name.replace(/\b(?:aku\b|akum\.|akumulat\.)\s*/gi,(m,offset,s)=>'akumulatorsk'+nounEnd(s.slice(offset+m.length))+' ');
    name=name.replace(/\b(?:el\.|elekt\.)\s*/gi,(m,offset,s)=>'električn'+nounEnd(s.slice(offset+m.length))+' ');
    name=name.replace(/\b(?:tel\.|telesk\.)\s*/gi,(m,offset,s)=>'teleskopsk'+nounEnd(s.slice(offset+m.length))+' ');
    for(const [pattern,replacement] of [[/\bprlj\.\s*/gi,'prljavu '],[/\bpot\.\s*/gi,'potapajuća '],[/\bvrt\.\s*/gi,'baštenska '],[/\bhor\.\s*/gi,'horizontalni '],[/\bstriž\.\s*/gi,'strižna '],[/\bvišenam\.\s*/gi,'višenamenski '],[/\bbrus\.\s*/gi,'brusilica '],[/\bživ(u|a)?\s+ogr\.\s*/gi,'živu ogradu '],[/\bkosacica\b/gi,'kosačica'],[/\bispumpsvanje\b/gi,'ispumpavanje'],[/\bstruju\b/gi,'struju']]) name=name.replace(pattern,replacement);
    name=name.replace(/ogradu(?=[a-z]+\d)/gi,'ogradu ');
    name=name.replace(/\bpod prit(?=\s|$)(?!isk)/gi,'pod pritiskom');
    name=name.replace(/\bset\s+akumulatorski\s+alata\b/gi,'set akumulatorskih alata');
    name=name.replace(/(?<!\p{L})(set|alata|izvlakač|dvokraki|trokraki)(?!\p{L})/giu,w=>w.toLowerCase());
  } else {
    const words={en:['electric','telescopic','submersible','garden','horizontal'],ru:['электрический','телескопический','погружной','садовый','горизонтальный'],tr:['elektrikli','teleskopik','dalgıç','bahçe','yatay'],zh:['电动','伸缩式','潜水','园艺','卧式']}[locale];
    if(words) for(const [i,pattern] of [/\b(?:el\.|elekt\.)\s*/gi,/\b(?:tel\.|telesk\.)\s*/gi,/\bpot\.\s*/gi,/\bvrt\.\s*/gi,/\bhor\.\s*/gi].entries())name=name.replace(pattern,words[i]+' ');
  }
  for(const brand of catalogBrands)name=name.replace(new RegExp('(?<![\\p{L}\\p{N}])'+brand.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![\\p{L}\\p{N}])','giu'),brand==='Ingco'?'INGCO':brand);
  for(const series of ['Power Control','Smart Control','Classic','UniversalAquatak','Professional','Highcut','Axxio'])name=name.replace(new RegExp('\\b'+series+'\\b','gi'),series);
  name=name.replace(/(?<!\d)(\d+(?:[.,]\d+)?)\s*bara\b/gi,'$1 bar');
  name=name.replace(/(?<![\p{L}\p{N}])(\d+(?:[.,]\d+)?)\s*(kw|kva|w|v|ah|nm|mm|cm|kg|bar|lm|hz|ks|j|t|l\/h|l\/min|o\/min)(?![\p{L}\p{N}]|[-/]\d)/giu,(_,n,u)=>n.replace('.',',')+' '+({kw:'kW',kva:'kVA',w:'W',v:'V',ah:'Ah',nm:'Nm',lm:'lm',hz:'Hz',j:'J'}[u.toLowerCase()]||u.toLowerCase()));
  name=name.replace(/\bsolo\b/gi,'Solo').replace(/\bled\b/gi,'LED').replace(/\blcd\b/gi,'LCD').replace(/\bsds\s*(plus|max)\b/gi,(_,t)=>'SDS '+(t.toLowerCase()==='plus'?'Plus':'Max'));
  // A unit has already been separated above. Remaining letter/digit tokens
  // are model codes; preserve every digit rather than stripping phone-like IDs.
  name=name.replace(/(?<![\p{L}\p{N}])([A-Za-z][A-Za-z\d-]*\d[A-Za-z\d-]*)(?![\p{L}\p{N}])/g,t=>t.toUpperCase());
  name=name.replace(/\s*([–—])\s*/g,' — ').replace(/\s*\+\s*/g,' + ').replace(/\s*,\s*(?!\d)/g,', ').replace(/\s+/g,' ').trim().replace(/^[,;:+—-]+\s*|\s*[,;:+—-]+$/g,'');
  name=name.replace(/\bBlack\s*\+\s*Decker\b/gi,'Black+Decker');
  if(name)name=name[0].toUpperCase()+name.slice(1);
  return {name,references:[...new Set(references)],contacts};
}
