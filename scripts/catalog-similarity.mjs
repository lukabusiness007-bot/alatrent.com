import types from '../lib/equipment-types.json' with { type: 'json' };
const cyrillic=Object.fromEntries([...'абвгдђежзијклљмнњопрстћуфхцчџш'].map((letter,i)=>[letter,['a','b','v','g','d','dj','e','z','z','i','j','k','l','lj','m','n','nj','o','p','r','s','t','c','u','f','h','c','c','dz','s'][i]]));
export const normalize=value=>value.toLowerCase().replace(/[а-яђјљњћџ]/g,letter=>cyrillic[letter]||letter).replace(/đ/g,'dj').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const definitions=[
 ['mobilni-peraci','Mobilni akumulatorski perači','mobiln.*perac|\boc 3\b','Pritisak, način dopune vode, baterija i prenosivost.'],
 ['peraci-stakla','Perači i usisivači za stakla','glassvac|perac.*stakl','Namena za staklo, širina usisavanja, baterija i komplet.'],
 ['peraci-pritisak','Perači pod pritiskom','visokopritis|perac.*pod prit|aquatak','Pritisak (radni/maksimalni), protok, snaga, zagrevanje vode i tip napajanja.'],
 ['dubinsko-pranje','Mašine za dubinsko pranje','dubinsk|ekstrakcij','Kapacitet, mokro usisavanje, pranje tekstila i nastavci.'],
 ['usisivaci-pepeo','Usisivači za pepeo','usisivac.*pepeo','Namena, rezervoar, filtracija i temperatura dozvoljenog pepela.'],
 ['duvaci-usisivaci','Duvači i usisivači lišća','duvac.*usisivac|usisivac.*(?:duvac|lisc)|venturro|gardentidy','Duvač/usisivač, usitnjavanje, protok vazduha, baterija ili motor.'],
 ['duvaci','Duvači lišća','duvac|duval','Protok i brzina vazduha, baterija ili benzinski motor.'],
 ['usisivaci','Usisivači','usisivac','Suvo/mokro usisavanje, rezervoar, klasa prašine, filter i napajanje.'],
 ['parocistaci','Paročistači','parocistac','Pritisak pare, rezervoar, grejanje i nastavci.'],
 ['polirke','Polirke','polirk|poliranje|poliranj','Prečnik, obrtaji, način kretanja i napajanje.'],
 ['zidne-brusilice','Žirafe i brusilice za zidove','ziraf|brusilic.*(?:zid|glet)','Prečnik, dohvat, odvođenje prašine i napajanje.'],
 ['betonske-brusilice','Brusilice za beton','brusilic.*beton','Podna/ručna izvedba, prečnik i odvođenje prašine.'],
 ['ugaone-brusilice','Ugaone brusilice','ugaon.*brus|gws|\btc-ag\b|\beag\b','Prečnik diska, snaga, obrtaji, žično/akumulatorsko napajanje i komplet.'],
 ['ekscentricne-brusilice','Ekscentrične brusilice','ekscent|deros|kruzn.*vibracion.*brus','Prečnik, hod, obrtaji, odvođenje prašine i baterija.'],
 ['tracne-brusilice','Tračne brusilice','tracn.*brus','Dimenzije trake, snaga, obrtaji i stacionarna/ručna izvedba.'],
 ['vibracione-brusilice','Vibracione brusilice','vibracion.*brus|te-os|tc-os','Dimenzije ploče, snaga i žično/akumulatorsko napajanje.'],
 ['ceone-brusilice','Čeone brusilice i bijaksi','ceon.*brus|bijaks','Prihvat, obrtaji, snaga i nastavci.'],
 ['mini-alati','Mini rotacioni alati','dremel|mini.*(?:alat|brus)','Prihvat, obrtaji, snaga i sadržaj kompleta.'],
 ['robot-kosilice','Robotske kosilice','robotsk.*kos|robot.*kos|sileno|yuka|luba','Površina, navigacija, nagib, baterija i oprema za instalaciju.'],
 ['traktorske-kosilice','Traktorske kosilice','traktorsk.*kos|traktor.*kos|\brider\b','Širina zahvata, motor, prenos, nagib i sakupljanje trave.'],
 ['rucne-kosilice','Ručne kosilice','rucn.*kos','Širina zahvata i tip reza.'],
 ['strizne-kosilice','Strižne kosilice','striz.*kos','Širina zahvata, motor i teren.'],
 ['kosilice','Rotacione kosilice','kosilic|kosacic','Širina košenja, snaga, samohodnost, način sakupljanja i napajanje.'],
 ['makaze-trava','Makaze za travu','makaz.*trav','Dohvat, širina reza, baterija i dodatak za živu ogradu.'],
 ['makaze-orezivanje','Makaze za orezivanje','makaz.*orez|bc-prs|rezac.*highcut|highcut','Prečnik grane, dohvat i napajanje.'],
 ['makaze-ograda','Makaze i trimeri za živu ogradu','(?:makaz|trimer).*ziv|(?:makaz|trimer).*ograd','Dužina noža, razmak zuba, teleskop i napajanje.'],
 ['trimeri','Trimeri za travu','trimer','Snaga, zapremina motora, širina zahvata i dozvoljena rezna oprema.'],
 ['aeratori','Aeratori i vertikulatori','aerator|vertikulator|prozrac','Širina, radna dubina, noževi/valjak i napajanje.'],
 ['cepaci','Cepači drva','cepac(?!.*stalak)|cepac za drva(?!.*stalak)','Sila cepanja, položaj, dužina trupca i napajanje.'],
 ['drobilice','Drobilice i seckalice grana','(?:drobilic|seckalic).*gran','Prečnik grana, nož/valjak, kapacitet i napajanje.'],
 ['freze-zemlja','Freze i motokultivatori','motokult|kopacic|frez.*(?:zeml|bast)|separacion.*frez','Širina i dubina, prenos, priključci, masa i napajanje.'],
 ['sneg','Čistači snega','cistac.*sneg','Širina, visina zahvata, pogon i napajanje.'],
 ['busaci-zemlja','Bušači zemlje','busac.*zemlj|busilica.*zemlj','Prihvat, prečnik burgije, snaga i broj operatera.'],
 ['atomizeri','Atomizeri','atomizer','Rezervoar, protok, domet, masa i motor.'],
 ['prskalice','Prskalice','prskal|rasprsivac','Rezervoar, protok, pritisak i napajanje.'],
 ['teleskopske-testere','Teleskopske lančane testere','teleskopsk.*(?:lanc|tester)|(?:lanc|tester).*teleskopsk|chainpole','Dohvat, dužina mača, baterija/motor i komplet.'],
 ['lancane-testere','Lančane i motorne testere','lancan.*tester|motorn.*tester|tester.*lanc','Dužina mača, motor, korak lanca i baterija/mreža/benzin.'],
 ['stubne-busilice','Stubne bušilice','stubn.*bus|stacionarn.*bus','Kapacitet bušenja, konus, obrtaji, snaga i sto.'],
 ['magnetne-busilice','Magnetne bušilice','magnet.*bus','Prihvat, prečnik bušenja metala, magnet, obrtaji i snaga.'],
 ['dijamantske-busilice','Dijamantske bušilice','dijamantsk.*bus|karot','Prečnik bušenja, podloga, mokro/suvo bušenje i stalak.'],
 ['pneumatske-busilice','Pneumatske bušilice','pneumatsk.*bus(?!.*cek)|bus.*pneumatsk(?!.*cek)','Potreban pritisak i protok vazduha, prihvat i obrtaji.'],
 ['busilice-cekici','SDS bušilice i čekići za bušenje','(?:cek|hamer).*bus|bus.*(?:cek|hamer)|hamer|elektro.?pneumat|\bgbh\b|\bsds (?:plus|max)\b','SDS Plus/Max, energija udarca, prečnik bušenja i napajanje.'],
 ['rusenje','Čekići za rušenje i pikameri','pikamer|stemar|stemer|cekic.*(?:stem|rus)|gsh','Energija udarca, prihvat, masa i napajanje.'],
 ['udarni-kljucevi','Udarni ključevi','udarn.*kljuc|ciwli|\bgds\b|\bdtw','Obrtni moment, veličina četvrtastog prihvata, napajanje i komplet.'],
 ['udarni-odvijaci','Udarni odvijači','udarn.*(?:odvij|odvrt|zavrt)','Obrtni moment, prihvat (proveriti odvijač/ključ), baterija i komplet.'],
 ['racne','Račne sa pogonom','racna|cegrtaljk','Obrtni moment, prihvat, napajanje i oprema kompleta.'],
 ['vezivanje-armature','Alat za vezivanje armature','vezivanj.*armatur','Prečnik armature, žica, brzina rada i baterija.'],
 ['odvijaci-gips','Odvijači za gips','(?:odvij|odvrt).*gips|\bdcf620','Prihvat, obrtaji, magacin šrafova i komplet.'],
 ['busilice-odvijaci','Bušilice i šrafilice','busilic|srafilic|busil|busal','Udarna/bez udara, prihvat, moment, snaga i baterija/napajanje.'],
 ['elektricni-odvijaci','Električni odvijači','odvijac|odvrtac|zavrtac','Prihvat, obrtni moment, napajanje i komplet.'],
 ['ubodne-testere','Ubodne testere','ubodn.*tester','Hod, kapacitet reza, prihvat lista i napajanje.'],
 ['metalne-testere','Testere za metal','tester.*metal|metal.*tester','Tip testere, kapacitet, ugao reza i napajanje.'],
 ['ger-testere','Ger testere za drvo','ger.*tester|ger masin|stona.*tester|ston.*tester','Prečnik lista, klizanje, ugao i kapacitet reza.'],
 ['tracne-testere','Tračne testere','tracn.*tester','Dimenzije lista, kapacitet reza, sto i napajanje.'],
 ['kruzne-testere','Kružne testere i cirkulari','kruzn.*tester|cirkular','Prečnik lista, dubina reza, vodilica i napajanje.'],
 ['kekserice','Kekserice','kekser','Prečnik, dubina reza, vođenje i napajanje.'],
 ['glodalice','Glodalice','glodalic|\bruter\b','Prihvat glodala, hod, snaga i napajanje.'],
 ['rende','Električna i stacionarna renda','rende|hobler','Širina, dubina obrade, ručna/stacionarna izvedba i napajanje.'],
 ['multialati','Višenamenski alati','visenam|multifunkcional.*alat|renovator|varrito','Vrsta kretanja, prihvat, nastavci i napajanje.'],
 ['heftalice','Heftalice i pištolji za eksere','heftalic|zabijac.*ekser|pistolj.*ekser','Spajalice/ekseri, dimenzije, prihvat i napajanje/vazduh.'],
 ['rel-varenje','REL aparati za zavarivanje','\brel\b.*(?:var|zav)|(?:var|zav).*\brel\b','Postupak, struja, radni ciklus i napajanje.'],
 ['tig-varenje','TIG aparati za zavarivanje','\btig\b|\bwig\b','AC/DC, struja, radni ciklus, oprema i napajanje.'],
 ['mig-varenje','MIG/MAG aparati za zavarivanje','\bmig\b|\bmag\b','Struja, radni ciklus, žica, gas i napajanje.'],
 ['varenje','Ostali aparati za zavarivanje','zavar|aparat.*varen','Proveriti postupak, struju, radni ciklus i napajanje.'],
 ['lemilice','Lemilice','lemilic','Snaga, regulacija temperature, vrhovi i primena.'],
 ['gorionici','Gasni gorionici za lemljenje','gorionik.*lemlj|brener','Gas, prihvat boce, plamen, materijal i sadržaj kompleta.'],
 ['fenovi','Fenovi i pištolji za vruć vazduh','fen|pistolj.*(?:vruc|vreo|vrel).*vazd','Temperatura, protok, podešavanja i napajanje.'],
 ['pistolji-farbanje','Pištolji i uređaji za farbanje','pistolj.*(?:farb|boj)|masina.*krec','Električni/pneumatski sistem, pritisak, viskoznost i napajanje.'],
 ['pistolji-silikon','Pištolji za silikon i lepljenje','pistolj.*(?:silikon|popunj|leplj)','Vrsta patrone, sila, materijal i napajanje.'],
 ['nitne','Pištolji za zakivanje','nitn|zakiv','Prečnik zakovice, materijal, napajanje i komplet.'],
 ['mazalice','Mazalice','mazalic|podmaziv','Pritisak, protok, patrona i napajanje.'],
 ['plocice','Sekači pločica i kamena','(?:sekac|rezac|secenj).*?(?:ploc|keramik|kamen)','Ručni/električni rez, dužina, dubina, ugao i materijal.'],
 ['mesaci','Mešači boje i maltera','mesac|mikser(?!.*nastavak)','Zapremina po turi, snaga, prihvat i nastavak.'],
 ['mesalice-beton','Mešalice za beton','mesalic.*beton|mesalica(?!.*boju)','Zapremina, kapacitet mešanja, motor i napajanje.'],
 ['vibro-ploce','Vibro ploče','vibro ploc','Masa, sila sabijanja, širina ploče i motor.'],
 ['vibro-zabe','Vibro nabijači','vibro (?:zab|nabij)','Masa, sila sabijanja i motor.'],
 ['vibratori-beton','Vibratori za beton','vibrator.*beton|vibro.?igl','Prečnik i dužina igle, napajanje i pogonska jedinica.'],
 ['pumpe-potapajuce','Potapajuće pumpe','potapaj|potopn|muljn','Čista/prljava voda, protok, visina dizanja i dozvoljene čestice.'],
 ['pumpe-benzinske','Benzinske pumpe','(?:benzinsk|motorn).*pump|pump.*(?:benzinsk|motorn)','Protok, visina, prečnik priključka i motor.'],
 ['pumpe-voda','Površinske i ostale vodene pumpe','pump.*(?:vod|pretak)|hidrofor|hidropak|bastensk.*pump','Proveriti izvedbu, namenu vode, protok i visinu dizanja.'],
 ['kompresori','Kompresori','kompresor','Protok, radni pritisak, rezervoar, pogon i napajanje.'],
 ['agregati','Agregati za struju','agregat|generator.*struj','Nazivna/startna snaga, faze, motor, izlazi i inverter.'],
 ['grejalice','Grejalice i kaloriferi','grejalic|kalorifer','Električna/gasna izvedba, snaga, prostor i uslovi ventilacije.'],
 ['klime','Pokretne klime','pokretn.*klim|klima.*pokretn','Kapacitet, odvod vazduha, napajanje i prostor.'],
 ['merdevine','Merdevine','merdevin','Konstrukcija, visina, materijal i nosivost.'],
 ['skele','Skele','skel','Visina, platforma, stabilizatori i nosivost.'],
 ['paletari','Paletari','paletar','Nosivost, dimenzije viljuški i način pogona.'],
 ['gradjevinska-kolica','Građevinska kolica','gradjevinsk.*kolic','Nosivost, zapremina korita, točkovi i konstrukcija.'],
 ['kolica','Transportna kolica','kolic','Namena, nosivost, dimenzije, točkovi i konstrukcija.'],
 ['dizalice','Dizalice i vitla','dizalic|vitl|podizac','Namena, nosivost, visina dizanja i način pogona.'],
 ['laser','Laseri i nivelatori','laser|nivelator','Vrsta linija, domet, tačnost i pribor.'],
 ['daljinomeri','Daljinomeri','daljinomer','Domet, tačnost, funkcije i napajanje.'],
 ['multimetri','Multimetri','multimet|unimer','Merene veličine, opseg i kategorija instrumenta.'],
 ['rasveta','Radne lampe i reflektori','reflektor|lampa|rasvetn|osvetlj','Lumeni, snaga, napajanje i nosač.'],
 ['motalice','Motalice i produžni kablovi','motalic|produzn.*kabl','Dužina, presek provodnika, opterećenje i zaštita.'],
 ['radapcigeri','Izvlakači i radapcigeri','izvlakac|radapciger','Dimenzije, broj krakova i izvedba.'],
 ['tocila','Tocila i oštrači','tocilo|ostrac','Namena, prečnik, prihvat i obrtaji.'],
 ['kazani','Kazani','kazan','Zapremina, grejanje i sadržaj kompleta.'],
 ['muljace','Muljače i oprema za voće','muljac|seck.*voc','Kapacitet, odvajanje peteljke i napajanje.'],
];

const genericCategories=new Set(['Mašine','Akumulatorski alat ostalo','Motorne mašine i alati','Auto alat ostalo','Ostala građevinska oprema','Pribor za pneumatske mašine','Merdevine i skele']);

/** Groups are comparison families, never a deletion or product-identity key. */
export function catalogFamily(tool,sourceCategory='') {
 const n=normalize(tool.name.sr);
 if(sourceCategory==='Perači pod pritiskom'&&!/mobiln.*perac|\boc 3\b/.test(n)){const [id,name,,criteria]=definitions.find(d=>d[0]==='peraci-pritisak');return {id,name,criteria};}
 const welding={'Aparati za REL elektrolučno zavarivanje':'rel-varenje','Aparati za WIG TIG zavarivanje':'tig-varenje','Aparati za MIG MAG zavarivanje':'mig-varenje'}[sourceCategory];
 if(welding&&!/\b(?:rel|mig|mag|tig|wig)\b/.test(n)){const [id,name,,criteria]=definitions.find(d=>d[0]===welding);return {id,name,criteria};}
 if(/set.*alat|busilica.* i .*brusil|busilica.* i .*ubodn/.test(n))return {id:'kompleti-alata',name:'Kompleti više alata',criteria:'Tačni alati u kompletu, baterije, punjači, nastavci i kofer.'};
 if(/hidraulicn.*agregat/.test(n))return {id:'hidraulicni-agregati',name:'Hidraulični agregati za alat',criteria:'Pritisak i protok hidraulike, kompatibilnost alata i pogon.'};
 if(sourceCategory==='Auto dizalice'||/auto.*dizal|krokodil.*dizal|dizal.*krokodil/.test(n))return {id:'auto-dizalice',name:'Auto dizalice',criteria:'Nosivost, minimalna/maksimalna visina i konstrukcija.'};
 if(/hobler.*parket|parket.*hobler/.test(n))return {id:'hoblerice-parket',name:'Hoblerice za parket',criteria:'Bubanj/ivice, širina, abrazivi i odvođenje prašine.'};
 for(const [id,name,pattern,criteria]of definitions){
  if(id==='pneumatske-busilice'&&/akumul|elektro.?pneumat|gbh|sds/.test(n))continue;
  if(id==='busilice-cekici'&&/(?:stem|rusenj|gsh)/.test(n)&&!/(?:busil|busenje)/.test(n))continue;
  if(id==='laser'&&/daljinomer/.test(n))continue;
  if(new RegExp(pattern.replace(/\u0008/g,'\\b')).test(n))return {id,name,criteria};
 }
 const hinted={'Perači pod pritiskom':'peraci-pritisak','Kosilice':'kosilice','Trimeri':'trimeri','Motorne testere':'lancane-testere','Pumpe za vodu':'pumpe-voda','Aparati za REL elektrolučno zavarivanje':'rel-varenje','Aparati za WIG TIG zavarivanje':'tig-varenje','Aparati za MIG MAG zavarivanje':'mig-varenje'}[sourceCategory];
 if(hinted){const [id,name,,criteria]=definitions.find(d=>d[0]===hinted);return {id,name,criteria};}
 const exact=types.find(t=>normalize(t.name)===n);
 const match=exact||types.find(t=>t.pattern&&new RegExp(t.pattern).test(n));
 if(match)return {id:match.slug,name:match.name,criteria:'Proveriti namenu, dimenzije, napajanje, prihvat i sadržaj kompleta.'};
 if(sourceCategory&&!genericCategories.has(sourceCategory))return {id:'izvor-'+normalize(sourceCategory).replace(/[^a-z0-9]+/g,'-'),name:sourceCategory,criteria:'Grupa prema kategoriji izvora; proveriti istu namenu i tehničke podatke pre spajanja.'};
 return {id:'posebno-'+tool.id,name:tool.name.sr,criteria:'Pojedinačna stavka; nema dovoljno podataka za pouzdano grupisanje.'};
}
const number=value=>Number(value.replace(',','.'));
export function catalogSpecs(name) {
 const specs=[...name.matchAll(/(?<![\p{L}\p{N}])((?:\d+\s*[x×]\s*)?\d+(?:[.,]\d+)?(?:\s*[/–-]\s*\d+(?:[.,]\d+)?)?)\s*(kW|kVA|W|V|Ah|Nm|mm|cm|bar(?:a)?|l\/h|l\/min|kg|lm|J|ks|t)(?![\p{L}\p{N}]|[-/]\d)/giu)].map(m=>({text:m[0],value:m[1],unit:m[2].toLowerCase()}));
 const values=unit=>specs.filter(s=>s.unit===unit).map(s=>s.value);
 const power=specs.filter(s=>['w','kw'].includes(s.unit));
 const kw=power.length===1&&/^\d+(?:[.,]\d+)?$/.test(power[0].value)?number(power[0].value)/(power[0].unit==='w'?1000:1):null;
 const flows=specs.filter(s=>['l/h','l/min'].includes(s.unit));
 const flow=flows.length===1&&/^\d+(?:[.,]\d+)?$/.test(flows[0].value)?number(flows[0].value)*(flows[0].unit==='l/min'?60:1):null;
 const pressure=specs.filter(s=>s.unit.startsWith('bar')).map(s=>s.value+' bar'+(/bar(?:a)?\s*max|max\.?\s*\d+\s*bar/i.test(name)?' max':'' )).join(' / ');
 return {kw,powerText:power.map(s=>s.text).join(' / '),pressure,flow,voltage:values('v').map(v=>v+' V').join(' / '),battery:values('ah').map(v=>v+' Ah').join(' / '),torque:values('nm').map(v=>v+' Nm').join(' / '),dimensions:specs.filter(s=>['mm','cm','kg','t','j'].includes(s.unit)).map(s=>s.text).join(' / '),text:specs.map(s=>s.text).join('; ')};
}
export const familyDefinitions=definitions;
