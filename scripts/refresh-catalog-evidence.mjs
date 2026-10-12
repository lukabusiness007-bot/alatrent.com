import fs from 'node:fs';
const audit=JSON.parse(fs.readFileSync('output/catalog-reduction/supplier-verification.json','utf8'));
const latest=new Map(audit.map(x=>[x.id,x]));const evidence={};
for(const [id,x]of latest){
 const description=(x.description||x.body?.split('Karakteristike\n')[1]?.split('Specifikacije\n')[0]||'').replace(/\s+/g,' ').trim();
 const kitText=description.replace(/(?:masa|tezina|težina|weight)\s+bez\s+(?:akumulatora|baterij[a-zčć]*)[^.;]{0,20}/gi,'');
 const incomplete=/bez\s+(?:baterij\w*|akumulator\w*|punja\w*)|(?:baterij\w*|punja\w*)[^.;]{0,35}(?:nisu uključ|nisu ukljuc|ne isporuč)/i.test(kitText);
 evidence[id]={url:x.url,observedAt:x.observedAt,description,completeBatteryKit:!incomplete&&/baterij|akumulator/i.test(description)&&/punja[cč]/i.test(description),incomplete,
 availability:x.purchaseControls?.includes('DODAJ U KORPU')?'Poručivanje omogućeno; sopstvena količina nije potvrđena':'Dostupnost prema izvornoj ponudi; potvrditi kod dobavljača'};
}
fs.writeFileSync('lib/catalog-reduction-evidence.json',JSON.stringify(evidence,null,2)+'\n');
console.log({verified:latest.size});
