import {catalogFamily, normalize} from './catalog-similarity.mjs';
const key=n=>normalize(n).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const equivalent={
 'pneumatske-busilice':['busilica-srafilica','Bušilica i šrafilica'],
 'pneumatski-kljuc':['udarni-kljuc','Udarni ključ za odvrtanje'],
 'pneumatske-brusilice':['ceone-brusilice','Čeona brusilica i bijaks'],
 'heftalica-pneumatska':['heftalica','Električna heftalica'],
};
const result=(id,name)=>({key:equivalent[id]?.[0]||id,name:equivalent[id]?.[1]||name,excluded:false});
const excluded=reason=>({key:null,name:null,excluded:true,reason});
export function rentalPurpose(tool,source={}) {
 const n=normalize(tool.name.sr).replace(/[\u00ad\u200b-\u200d]/g,''),c=source.category||'';
 const legacy={
 'tool-027':['betonske-brusilice','Ručna brusilica za beton'],'tool-065':['rucno-vitlo','Ručno vitlo'],'tool-066':['podizac-gips','Podizač gips ploča'],'tool-114':['kolica-ploce','Kolica za ploče'],'tool-115':['magnetne-busilice','Magnetna bušilica'],'tool-117':['tracna-metal','Tračna testera za metal'],'tool-127':['makaze-teleskopske','Teleskopske makaze za živu ogradu'],'tool-129':['heftalica','Električna heftalica'],'tool-138':['separaciona-freza','Separaciona freza za zemljište'],'tool-009':['cetka-behaton','Mašina za čišćenje behatona'],'tool-147':['pistolj-farbanje','Pištolj za farbanje kompresorom'],
 'tool-023':['busilica-sds-plus','SDS Plus bušilica za beton'],'tool-042':['rel-varenje','REL aparat za zavarivanje'],
 'tool-043':['brusilica-mala','Mala ugaona brusilica 125 mm'],'tool-068':['kompresor','Vazdušni kompresor'],
 'tool-074':['lancana-testera','Motorna lančana testera'],'tool-078':['busilica-srafilica','Bušilica i šrafilica'],
 'tool-083':['tracna-brusilica','Tračna brusilica'],'tool-099':['dijamantske-busilice','Dijamantska bušilica'],
 'tool-107':['hoblerica-ivicna','Ivična hoblerka za parket'],'tool-109':['debljaca','Stacionarna debljača i abrihter'],
 'tool-118':['udarni-kljuc','Udarni ključ za odvrtanje'],'tool-120':['freza-za-panjeve','Freza za panjeve'],
 'tool-135':['rasvetni-toranj','Rasvetni toranj'],
 'tool-140':['sejalica-trava','Sejalica za travu'],'tool-156':['merac-vlage-u-materijalu','Merač vlage u materijalu'],'tool-159':['multimetri','Multimetar i strujna klešta'],'tool-182':['multimetri','Multimetar i strujna klešta'],
 'tool-166':['uv-curenje','UV set za detekciju curenja'],'tool-180':['robotska-kamera','Robotska kamera za inspekciju'],
 };
 if(!tool.catalogModel&&legacy[tool.id])return result(...legacy[tool.id]);
 if(/stihl pr \d|pistolj.*lepljen|pistolj.*leplj|pistolj.*vruce|set tock|sklopiv.*tester|tester.*sklopiv|conmetall.*testera|conmetall.*kruzni rezac|vakuum.*pumpicom|vakuumski nosac.*pump|pistolj.*vruce leplj|stihl hsa 26|bosch easyprune|gardena assistcut|rucna kosacic|rucna kosilic|vln 382|tc-mt/.test(n))return excluded('Sitan ručni alat, pribor ili kućni uređaj; nije samostalna renta.');
 if(/ivic.*hobler|hobler.*ivic/.test(n))return result('hoblerica-ivicna','Ivična hoblerka za parket');
 if(/podna.*brus.*beton/.test(n))return result('podna-brusilica-beton','Podna brusilica za beton');
 if(/top multi/.test(n))return result('pumpa-cista','Potapajuća pumpa za čistu vodu');
 if(/teleskop.*makaz.*travu/.test(n))return excluded('Sitni ručni baštenski alat; dodatak uz mašinu za održavanje travnjaka.');
 if(/ekscent|\bgex\b|\bdbo\d|cro[s]?li|\bbo50/.test(n))return result('ekscentricne-brusilice','Ekscentrična brusilica');
 if(/\bgwg\b|\bggs\b/.test(n))return result('ceone-brusilice','Čeona brusilica i bijaks');
 if(/te-ap|tc-ap/.test(n))return result('sabljasta-testera','Sabljasta testera');
 if(/te-sm|tc-sm|\bgcm\b/.test(n))return result('ger-testere','Ger testera');
 if(/dco180|dco181/.test(n))return result('glodalica-gips','Glodalica za gips i otvore');
 if(/tp-co/.test(n))return result('brusilica-mala','Mala ugaona brusilica i odsecanje');
 if(/\bpfs\s?\d/.test(n))return result('pistolj-farbanje','Pištolj za farbanje i HVLP raspršivanje');
 if(/rotacioni laser|grl 400/.test(n))return result('laser-rotacioni','Rotacioni laser za nivelaciju terena');
 if(/robotsk|robot.*kos|sileno|yuka|luba/.test(n))return excluded('Robot zahteva instalaciju, mapiranje i podešavanje na lokaciji; nije samostalna kratkoročna renta.');
 if(/gardena.*(?:makaze.*trav|classiccut)|gc-cg|ge-cg/.test(n))return excluded('Sitan kućni alat za ivice trave; nije samostalna renta.');
 if(/kuka za|set stopa|stabilizator za|tockovi za|platforma za.*merdevin|nastavak za|pribor za/.test(n))return excluded('Pribor uz mašinu ili merdevine; nije samostalni oglas.');
 if(/set.*alat|busilica.* i .*brusil|busilica.* i .*ubodn|udarni.*\+.*busilica|elektricni setovi|kombinovani setovi|aku setovi/.test(n+' '+normalize(c)))return excluded('Komplet više alata; dodatak paketu pojedinačnih izabranih mašina.');
 if(/hm1812|hm1802|gsh 16/.test(n))return result('podni-pikamer','Teški električni čekić za podove i beton');
 if(/\bgbh\b/.test(n))return /gbh (?:5|8|12)/.test(n)?result('busilica-sds-max','SDS Max bušilica za beton'):result('busilica-sds-plus','SDS Plus bušilica za beton');
 if(/\bgco\b|mt150/.test(n))return result('metalne-testere','Stacionarna odsečna testera za metal');
 if(/dcs380|povratna testera/.test(n))return result('sabljasta-testera','Sabljasta testera');
 if(/modelarska testera|ssv 7050/.test(n))return result('modelarska-testera','Modelarska testera');
 if(/vgs \d|vet \d|bvs 8/.test(n))return result('lancana-testera','Motorna lančana testera');
 if(/pneumatsk.*slajferic.*150/.test(n))return result('ekscentricne-brusilice','Ekscentrična brusilica');
 if(/rotacion.*brus/.test(n))return result('ekscentricne-brusilice','Ekscentrična brusilica');
 if(/vln 1943|dcf899|tp-cw|te-cw|impaxxo 18\/400|bc-iw350|nasadni odvij/.test(n))return result('udarni-kljuc','Udarni ključ za odvrtanje');
 if(/dhp485/.test(n))return result('busilica-srafilica','Bušilica i šrafilica');
 if(/pneumatsk.*(?:odvij|odvrt|kljuc)|tc-pw/.test(n))return result('pneumatski-kljuc','Pneumatski udarni ključ');
 if(/pneumatsk.*heft/.test(n))return result('heftalica-pneumatska','Pneumatska heftalica');
 if(/brusilica za renovir|motorna cetka/.test(n))return result('cetka-renoviranje','Motorna četka za renoviranje površina');
 if(/honda.*(?:wb\d|wx\d|wt\d)|(?:wb\d|wx\d|wt\d).*honda/.test(n))return result('pumpa-benzinska','Benzinska pumpa za vodu');
 if(/detektor struje|gms120/.test(n))return result('detektor-kablova-i-instalacija','Detektor kablova i instalacija');
 if(/termometar/.test(n)&&!/higro/.test(n))return result('infracrveni-termometar','Infracrveni termometar');
 if(/kompresor.*farbanje|airless|ma[sš]ina za krecenj/.test(n))return result('pistolji-farbanje','Mašina za krečenje');
 if(/slicer|gnf|glodalica.*(?:zid|kanal)|glodalice.*kanal|te-ma|tc-ma/.test(n))return result('slicerica-za-kanale-u-zidu','Šlicerica za kanale u zidu');
 if(/pj7000/.test(n))return result('kekserice','Kekserica');
 if(/testera.*tracna|tracna.*testera/.test(n))return result('tracna-metal','Tračna testera za metal');
 if(/busilica.*stub|stubna.*busilica/.test(n))return result('stubne-busilice','Stubna bušilica');
 if(/dijamantsk.*(?:bus|krun)|dbm 131/.test(n))return result('dijamantske-busilice','Dijamantska bušilica');
 if(/suva.*gradnj/.test(n))return result('odvijac-gips','Odvijač za gips ploče');
 if(/hr4501/.test(n))return result('busilica-sds-max','SDS Max bušilica za beton');
 if(/laserski merac daljin/.test(n))return result('daljinomeri','Daljinomer');
 if(/orezivanje|oreziv|pro pruner/.test(n)&&!/testera/.test(n))return result('makaze-orezivanje','Motorne makaze za orezivanje');
 if(/aparat.*zavar|varmig|varin|varenj|ararat.*zavar/.test(n)){
  if(/mig|mag/.test(n))return result('mig-varenje','MIG/MAG aparat za zavarivanje');
  if(/tig|rogue et/.test(n))return result('tig-varenje','TIG aparat za zavarivanje');
  return result('rel-varenje','REL aparat za zavarivanje');
 }
 if(/atomizer|motorna.*prskalic|benzinsk.*prskalic|sr 200|sr 450/.test(n))return result('prskalice','Motorna prskalica i atomizer');
 if(/spirala za otpus|ropump|cistac cevi/.test(n))return excluded('Ručni odgušivač ili spirala; pribor uz mašinu za odgušenje.');
 if(/makaze.*(?:papuc|lima)|pistolj.*silikon/.test(n))return excluded('Sitan alat za sečenje ili nanošenje; nije samostalna renta.');
 if(/bosch.*ptc|conmetall.*(?:masina.*(?:keramik|ploc))|wolfcraft.*tc /.test(n))return result('sekac-plocica-rucni','Ručni sekač pločica');
 if(/vakuum.*nosac|vakuumski nosac/.test(n))return result('vakuumski-nosac','Vakuumski nosač za ploče');
 if(/sistem/.test(n)&&/duvac/.test(n))return result('duvac','Duvač lišća');
 if(/merac vlage|universal humid/.test(n))return result('merac-vlage-u-materijalu','Merač vlage u materijalu');
 if(/tester napona/.test(n))return result('tester-napona','Tester napona');
 if(/tracna testera.*metal|tracna testera za metal/.test(n))return result('tracna-metal','Tračna testera za metal');
 if(/(?:odvrtac|odvijac|kljuc).*gds|\btw\d|\bdtw\d/.test(n))return result('udarni-kljuc','Udarni ključ za odvrtanje');
 if(/gsh|elektricni.*pneumatski.*cekic/.test(n))return result('pikamer','Pikamer za rušenje');
 if(/makaze.*travu.*dum|dum604/.test(n))return result('makaze-trava','Makaze za travu');
 if(/pertlov|savijanj.*cev|rucna nareznica|supercut|vodilica.*krun|vulkanizerski pistolj|pistolj.*mast|digitalna lemna stanica|set za lemljenj|gorionik.*mapp/.test(n))return excluded('Ručni alat ili sitan pribor uz cevne, servisne ili radioničke poslove.');
 if(/jump starter/.test(n))return result('starter','Uređaj za startovanje vozila');
 if(/brusilic.*beton/.test(n))return result('betonske-brusilice','Ručna brusilica za beton');
 if(/magnet.*bus|bus.*magnet/.test(n))return result('magnetne-busilice','Magnetna bušilica');
 if(/heftalic/.test(n))return result('heftalica','Električna heftalica');
 if(/pistolj.*(?:farb|boj)/.test(n))return result('pistolj-farbanje','Pištolj za farbanje kompresorom');
 if(/set cetki/.test(n))return excluded('Pribor uz šrafilicu.');
 if(/pneumatsk.*(?:skidac rdje|iglic)/.test(n))return result('skidac-rdje','Pneumatski skidač rđe');
 if(/pneumatsk.*rac|pneumatske racne/.test(n+' '+normalize(c)))return result('pneumatska-racna','Pneumatska rač­na');
 if(/pneumatsk.*(?:bus|brus|slajf)/.test(n)&&!/elektr|elektro|gbh|sds/.test(n))return /bus/.test(n)?result('pneumatske-busilice','Pneumatska bušilica'):result('pneumatske-brusilice','Pneumatska brusilica');
 if(/pneumatsk.*pistolj.*nm/.test(n))return result('pneumatski-kljuc','Pneumatski udarni ključ');
 if(/pumpa dmp|vazdusna pumpa/.test(n))return result('kompresor','Vazdušni kompresor');
 if(/sekac za visestruku/.test(n))return result('elektricne-makaze','Električne makaze za materijal');
 if(/zidna brus|brusilice za zidove/.test(n+' '+normalize(c)))return result('zidne-brusilice','Žirafa za zidove');
 if(/ravna.*brus|brusilica ravna/.test(n))return result('ceone-brusilice','Čeona brusilica i bijaks');
 if(/uredjaj za gravir/.test(n))return result('mini-alati','Mini rotacioni alat');
 
 if(/makaz.*(?:zbunj|ziv|ograd)|gc-ch|ge-ch|gh-ch|gc-eh|ge-eh|gh-eh/.test(n))return result('makaze-ograda','Makaze za živu ogradu');
 if(/easyprune|assistcut|(?:set.*oreziv|makaz.*(?:bast|gran))/.test(n))return result('makaze-orezivanje','Motorne makaze za orezivanje');
 if(/gc-cg|ge-cg/.test(n))return result('makaze-trava','Makaze za travu');
 if(/testera.*potkres/.test(n))return result('teleskopska-testera','Teleskopska motorna testera');
 if(/rezac kanala/.test(n))return result('slicerica-za-kanale-u-zidu','Šlicerica za kanale u zidu');
 if(/podupirac.*okvir/.test(n))return excluded('Pomoćni držač uz ugradnju; pribor.');
 if(/vibracioni.*vakuum/.test(n))return result('vibracioni-pistolj-za-keramiku','Vibracioni pištolj za keramiku');
 if(/testera.*(?:rucna.*kruz|kruz)|kruzna testera/.test(n))return result('rucni-cirkular','Ručni cirkular');
 if(/preklopna testera/.test(n))return result('ger-testere','Ger testera');
 if(/akumulatorska brusilica|tp-ag/.test(n))return result('brusilica-mala','Mala ugaona brusilica 125 mm');
 if(/akumulatorski cekic/.test(n))return result('busilica-sds-plus','SDS Plus bušilica za beton');
 if(/tresac voca/.test(n))return result('tresac-voca','Tresač voća');
 if(/sejalica/.test(n))return result('sejalica-trava','Sejalica za travu');
 if(/mop na paru/.test(n))return result('parocistaci','Paročistač');
 if(/pokrena klima/.test(n))return result('klime','Pokretna klima');
 if(/brusilica.*(?:dvostrana|dvostruka)|stona.*brus/.test(n))return result('tocilo','Tocilo i oštrač');
 if(/strug za drvo/.test(n))return result('strug-drvo','Strug za drvo');
 if(/testera ubodna/.test(n))return result('ubodne-testere','Ubodna testera');
 if(/testera univerzalna|univerzalna testera/.test(n))return result('sabljasta-testera','Sabljasta testera');
 if(/jolly edge/.test(n))return result('obrada-ivica-plocica','Mašina za obradu ivica pločica');

 if(/set cetki|nastavak mikser|burgij|dijamantsk.*ploc|rezn.*ploc|lanac za tester|maska za var|zastitne slusal|produzn.*kabl|motalic|ciklonski separator|razvodna tabla|alarm za.*poplav/.test(n)) return excluded('Pribor, zaštita ili potrošni materijal; dodatak odgovarajućoj mašini.');
 if(/baterije i punjaci|delovi i ulja|auto pumpe i meraci|setovi nasadnika|radapcigeri|specijalni kljucevi|rucne prskalice|pribor za krecenje|pribor za pneumatske/.test(normalize(c))) return excluded('Sitan pribor ili običan ručni alat; nije samostalna renta.');
 if(/set gedor|set.*rucn.*alat|vodoinstalaterska klesta|stega za cevi|rucn.*busac|rucna teleskopska testera|makaz.*(?:cevi|papuc|lima)|set.*nasad|izvlakac|radapciger|ruski kljuc|pistolj za izduv|pneumatski pistolj za ciscenje|pneumatski pistolj.*(?:pump|pritis)|lemilic|letlampa|gorionik.*lemlj|kleme za akumulator|drzac|hvatac(?!.*vaku)|rucn.*prskalic/.test(n)) return excluded('Običan ručni alat ili sitna oprema; nema opravdanja za zaseban oglas rente.');
 if(/set.*alat|busilica.* i .*brusil|busilica.* i .*ubodn|elektricni setovi|kombinovani setovi|aku setovi/.test(n+' '+normalize(c)))return excluded('Paket više alata; pojedinačne namene imaju svoje izabrane modele.');
 if(/hms1080/.test(n))return result('debljaca','Stacionarna debljača i abrihter');
 if(/trakast.*brus/.test(n))return result('tracna-brusilica','Tračna brusilica');
 if(/udarni.*zavij/.test(n))return result('udarni-odvijac','Udarni odvijač');
 if(/busac.*(?:zemlj|rupa)/.test(n))return result('busaci-zemlja','Motorni bušač zemlje');
 if(/rucne.*kosilice|rucna.*kosilica/.test(n+' '+normalize(c)))return excluded('Obična ručna kosilica; prednost ima izabrana motorna mašina.');
 if(/hidraulicn.*agregat/.test(n))return result('hidraulicni-cekic','Hidraulični agregat sa čekićem');
 if(/pneumatsk.*(?:cekic|hamer)|(?:cekic|hamer).*kompresor/.test(n)&&!/elektro/.test(n))return result('pneumatski-cekic','Pneumatski čekić za rušenje');
 if(/traktorsk|traktor|rider|tornado special/.test(n)&&/kos|traktor|rider|tornado/.test(n))return result('traktorska-kosilica','Traktorska kosilica');
 if(/robot.*kos|robotsk|sileno|yuka|luba/.test(n))return result('robotska-kosilica','Robotska kosilica');
 if(/(?:ceona|grebenast|strizna|mio standard ceona).*kos|(?:kos|kosa).*?(?:grebenast|striz)/.test(n))return result('ceona-kosilica','Čeona kosačica za visoku travu');
 if(/sds.*max|gbh (?:5|8|12)|(?:dh40|dh52|hr40|hr52)/.test(n)&&!/gsh|stem|rusenj/.test(n))return result('busilica-sds-max','SDS Max bušilica za beton');
 if(/sds|gbh|elektro.?pneumat|aku elektro pneumatski|elektro pneumatske busilice/.test(n+' '+normalize(c))&&!/stem|rusenj|gsh/.test(n))return result('busilica-sds-plus','SDS Plus bušilica za beton');
 if(/pikamer|stemov|stemer|stemar|cekic.*rusenj|gsh/.test(n))return result('pikamer','Pikamer za rušenje');
 if(/udarni kljuc|ciwli|\bgds\b|\bdtw|(?:udarn.*odvijac.*(?:1\/2|3\/4|1\/4 inch))/.test(n))return result('udarni-kljuc','Udarni ključ za odvrtanje');
 if(/udarn.*odvij|udarni.*zavrt|udarni.*odvrt/.test(n))return result('udarni-odvijac','Udarni odvijač');
 if(/odvij.*gips|odvrt.*gips|dcf620/.test(n))return result('odvijac-gips','Odvijač za gips ploče');
 if(/elektricne busilice|aku busilice|aku udarne busilice/.test(normalize(c))||/srafilic|busilica(?!.*(?:stub|magnet|dijamant|zemlj|pneumat))/.test(n))return result('busilica-srafilica','Bušilica i šrafilica');
 if(/pneumatsk.*(?:odvij|odvrt|kljuc)|pneumatski odvijaci/.test(n+' '+normalize(c)))return result('pneumatski-kljuc','Pneumatski udarni ključ');
 if(/ugaon.*brus|gws|gwx|\bga\d|ugaone brusilice/.test(n+' '+normalize(c)))return /(?:180|230)\s*mm|velik/.test(n)?result('brusilica-velika','Velika ugaona brusilica 230 mm'):result('brusilica-mala','Mala ugaona brusilica 125 mm');
 if(/scal|uranj|sp6000|gkt |ts 55|cs55/.test(n))return result('uranjajuca-testera','Uranjajuća testera sa šinom');
 if(/stoni cirkular|stona kruzna|stona testera|gts |hs100|ts 254|tc-ts|te-ts|sto.*tester.*(?:drvo|kruz)/.test(n))return result('stoni-cirkular','Stoni cirkular');
 if(/sablj|lisicar|reciproc|gsa |\bdjr|crsli|rsl18/.test(n))return result('sabljasta-testera','Sabljasta testera');
 if(/teleskop.*(?:tester|lanc)|(?:tester|lanc).*teleskop|chainpole|teleskopska testera/.test(n))return result('teleskopska-testera','Teleskopska motorna testera');
 if(/podna.*brus.*beton/.test(n))return result('podna-brusilica-beton','Podna brusilica za beton');
 if(/glodalic.*gips|gips.*glodalic|rotacioni sekac|reza[cč]ica/.test(n))return result('glodalica-gips','Glodalica za gips i otvore');
 if(/teleskop.*(?:makaz|ograd)|(?:makaz|ograd).*teleskop|highcut|rezac.*ogradu/.test(n))return result('makaze-teleskopske','Teleskopske makaze za živu ogradu');
 if(/teleskopsk.*trav|makaze.*trav/.test(n))return result('makaze-trava','Makaze za travu');
 if(/pres.*(?:cev|celjust)|romax/.test(n))return result('pres-cevi','Pres mašina za cevi');
 if(/zamrzavanj.*cev|rofreeze/.test(n))return result('zamrzavanje-cevi','Uređaj za zamrzavanje cevi');
 if(/ispitivanj.*prit|test.*pump|rp (?:30|50)|rp30|rp50/.test(n))return result('pumpa-ispitivanje','Pumpa za ispitivanje instalacija');
 if(/narez.*navoj|supertronic|navoj.*cev/.test(n))return result('nareznica-cevi','Mašina za narezivanje navoja na cevima');
 if(/otpus|odgusenj|cistac.*(?:odvod|cevi)|ropump|rospi|rospeed|rodrum/.test(n))return result('odgusenje-cevi','Mašina za odgušenje cevi');
 if(/varilica.*(?:cev|plast)|pegla.*cev|polifuz/.test(n))return result('varilica-cevi','Varilica za plastične cevi');
 if(/vakuum.*pump|vakum.*pump/.test(n))return result('vakuum-pumpa','Vakuum pumpa za klime');
 if(/vakuum.*(?:nosac|hvata|drzac|podiz)|vakuumski|vacuum.*lif/.test(n))return result('vakuumski-nosac','Vakuumski nosač za ploče i staklo');
 if(/motorna cetka|ciscenj.*behaton|picobella|multibrush/.test(n))return result('cetka-behaton','Mašina za čišćenje behatona');
 if(/jednodisk|cistac podova|cleanexxo|ciscenje podova|masina za pranje podova/.test(n))return result('pranje-podova','Mašina za pranje i poliranje podova');
 if(/uredjaj za ciscenje|uredjaj.*ciscenj.*|te-sw|masina.*metenj/.test(n))return result('metenje','Mašina za metenje');
 if(/potapaj|potopn|muljn/.test(n))return /(?:^|\s)cist.*vod/.test(n)?result('pumpa-cista','Potapajuća pumpa za čistu vodu'):result('pumpa-prljava','Potapajuća pumpa za prljavu vodu');
 if(/nult.*nivo/.test(n))return result('pumpa-nulti-nivo','Pumpa za vodu do nultog nivoa');
 if(/grejalic|kalorifer|plinski top/.test(n))return /pecurk/.test(n)?result('grejanje-spoljno','Spoljna plinska grejalica'): /gas|plinsk|pe[cć]|pecurk/.test(n)?result('grejanje-plinsko','Plinsko grejanje'):result('grejanje-elektricno','Električna grejalica');
 if(/agregat|generator.*struj/.test(n)&&!/ozon/.test(n))return /(?:1-3|3[- ]?faz|trofaz)/.test(n)?result('agregat-trofazni','Trofazni agregat'): /inverter|\beu\d/.test(n)?result('agregat-inverter','Inverterski agregat'):result('agregat-monofazni','Monofazni agregat');
 if(/merdevin/.test(n))return result('merdevine','Višenamenske merdevine');
 if(/skel/.test(n))return result('skela','Pokretna skela');
 if(/sijal|reflektor|lampa/.test(n))return result('reflektor','Radni LED reflektor');
 if(/set za detekciju traser/.test(n))return result('traser-gas','Set za detekciju traser gasom');
 const f=catalogFamily(tool,c);
 const merge={
  'mobilni-peraci':['perac-mobilni','Mobilni perač za rad bez priključaka'], 'peraci-pritisak':['perac-elektricni','Profesionalni perač pod pritiskom'],
  'pumpe-voda':['pumpa-povrsinska','Površinska pumpa za vodu'], 'pumpe-benzinske':['pumpa-benzinska','Benzinska pumpa za vodu'],
  'kompresori':['kompresor','Vazdušni kompresor'], 'kosilice':['kosilica','Samohodna rotaciona kosilica'],
  'duvaci':['duvac','Duvač lišća'], 'duvaci-usisivaci':['duvac','Duvač lišća'], 'laser':['laser','Laserski nivelator'],
  'kruzne-testere':['rucni-cirkular','Ručni cirkular'], 'tracne-brusilice':['tracna-brusilica','Tračna brusilica'],
  'rende':['rucno-rende','Električno ručno rende'], 'tocila':['tocilo','Tocilo i oštrač'],
  'busilice-cekici':['busilica-sds-plus','SDS Plus bušilica za beton'], 'busilice-odvijaci':['busilica-srafilica','Bušilica i šrafilica'],
  'elektricni-odvijaci':['busilica-srafilica','Bušilica i šrafilica'], 'rusenje':['pikamer','Pikamer za rušenje'],
  'makaze-ograda':['makaze-ograda','Makaze za živu ogradu'], 'makaze-orezivanje':['makaze-orezivanje','Motorne makaze za orezivanje'],
  'lancane-testere':['lancana-testera','Motorna lančana testera'], 'gorionici':null,
 };
 if(f.id==='peraci-pritisak'&&/benzinsk|motorni/.test(n))return result('perac-benzinski','Benzinski perač pod pritiskom');
 if(f.id==='rende'&&/stacionarn|debljac|abriht|dh330|dh 330|hms/.test(n))return result('debljaca','Stacionarna debljača i abrihter');
 if(f.id==='usisivaci'&&/dubinsk|ekstrak|puzzi|se 400|se400|se 5|se 6/.test(n))return result('dubinsko-pranje','Mašina za dubinsko pranje');
 if(f.id==='plocice'&&/rucn/.test(n))return result('sekac-plocica-rucni','Ručni sekač pločica');
 if(f.id==='plocice')return result('sekac-plocica-elektricni','Električni sekač pločica i kamena');
 if(Object.hasOwn(merge,f.id)){const m=merge[f.id];return m?result(...m):excluded('Sitan ručni alat; pribor uz drugu mašinu.');}
 if(f.id.startsWith('posebno-')||f.id.startsWith('izvor-')){
  const aliases={'aku ugaone brusilice':['brusilica-mala','Mala ugaona brusilica 125 mm'],'aku vibracione brusilice':['vibracione-brusilice','Vibraciona brusilica'],'aku tracne brusilice':['tracna-brusilica','Tračna brusilica'],'unimeri':['multimetri','Digitalni multimetar'],'laserska merna tehinika':['laser','Laserski nivelator'],'tracne i vibracione brusilice':['vibracione-brusilice','Vibraciona brusilica'],'aku testere':['sabljasta-testera','Sabljasta testera'],'elektricne stone testere - ger masine':['ger-testere','Ger testera'],'freze | motokultivatori | kopacice':['freze-zemlja','Motokultivator'],'motorni busac rupa za zemlju':['busaci-zemlja','Motorni bušač zemlje']};
  const a=aliases[normalize(c)];if(a)return result(...a);
  if(!tool.catalogModel)return result('spec-'+key(tool.name.sr),tool.name.sr);
  return {key:'proveriti-'+tool.id,name:tool.name.sr,excluded:false,needsReview:true};
 }
 return result(f.id,f.name);
}
