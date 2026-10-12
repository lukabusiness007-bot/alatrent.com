"""Build a deduplicated catalog of equipment types, never brands or power variants."""
import json,re,unicodedata
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
seed=json.loads((ROOT/'lib/seed.json').read_text())
original=[t for t in seed['tools'] if int(t['id'].split('-')[1])<=72]
enrichment=json.loads((ROOT/'lib/catalog-enrichment.json').read_text())
source=json.loads((ROOT/'research/dajnadan/source-listings.json').read_text())
def norm(s):
 return ''.join(c for c in unicodedata.normalize('NFKD',s.lower().replace('đ','dj')) if not unicodedata.combining(c))
def slug(s):return re.sub('[^a-z0-9]+','-',norm(s)).strip('-')
# Distinct functions only. Power source, brand, wattage, size and bundled tools
# never create a second screwdriver, grinder, pressure washer, pump or mower.
rows=[
 ('Mašina za skidanje parketa',5,'Floor stripping machine','Машина для снятия напольных покрытий','Zemin sökme makinesi','地板铲除机',r'skidanje parketa','mašine za skidanje parketa',['skidač parketa','floor stripper'],'Mašina odvaja stari parket i zalepljene podne obloge od podloge tokom renoviranja. Izbor noža i postupka zavisi od vrste obloge i lepka.','Navedi vrstu poda, površinu, način lepljenja i pristup prostoru. Pre najma proveravamo odgovarajući nož, stanje podloge i uslove transporta.'),
 ('Lančana testera',3,'Chainsaw','Цепная пила','Zincirli testere','链锯',r'(motorna|lancana|teleskopska) testera','lančane testere',['motorna testera','testera za grane'],'Lančana testera služi za sečenje drveta i grana. U ovom unosu objedinjene su motorne, električne i teleskopske varijante; model se bira prema poslu.','Navedi prečnik i položaj drveta, potreban dohvat i uslove na lokaciji. Proveravamo prikladnost lanca, dužinu vodilice i način preuzimanja.'),
 ('Vibro ploča',4,'Plate compactor','Виброплита','Titreşimli kompaktör','平板夯',r'vibro (ploc|masin)|reverzibilna vibro','vibro ploče',['vibro ploča','mašina za sabijanje'],'Vibro ploča sabija odgovarajuće slojeve nasutog materijala pri pripremi staza, prilaza i podloga. Jednosmerni i reverzibilni modeli ostaju jedna vrsta alata.','Navedi materijal, debljinu sloja, površinu i pristup gradilištu. Za rad na behatonu proveravamo zaštitnu podlogu, a model potvrđujemo prema zadatku.'),
 ('Uređaj za zamrzavanje cevi',7,'Pipe freezing machine','Аппарат для замораживания труб','Boru dondurma cihazı','管道冷冻机',r'zamrzavanje cevi','uređaja za zamrzavanje cevi',['zamrzivač cevi','pipe freezer'],'Uređaj lokalno zamrzava vodu u odgovarajućoj cevi kako bi se omogućila određena intervencija na instalaciji. Prikladnost se proverava za konkretan sistem.','Navedi materijal i prečnik cevi, vrstu tečnosti i uslove instalacije. Pre najma potvrđujemo odgovarajuće nastavke i zahteve za zaustavljanje protoka.'),
 ('Pištolj za eksere',4,'Nail gun','Гвоздезабивной пистолет','Çivi tabancası','射钉枪',r'zabijac za eksere|pistolj za (eksere|gipsare)','pištolja za eksere',['zabijač eksera','nailer','pištolj za gipsare'],'Pištolj za eksere pričvršćuje elemente odgovarajućim ekserima tokom montaže. Akumulatorski, gasni i drugi modeli objedinjeni su u ovu vrstu alata.','Navedi podlogu, element koji pričvršćuješ i potrebnu dužinu eksera. Model, kompatibilan potrošni materijal i način pričvršćivanja potvrđujemo pre najma.'),
 ('Bušilica',4,'Drill','Дрель','Matkap','电钻',r'busilica elektricna|dvobrzinska busilica|iznajmljivanje busilica$','bušilice',['električna bušilica','dvobrzinska bušilica'],'Bušilica je namenjena bušenju odgovarajućih rupa u drvetu, metalu i drugim podlogama prema izabranom modelu. Marka i snaga ne stvaraju dodatne unose.','Navedi materijal, prečnik i dubinu rupe, broj rupa i raspoloživo napajanje. Burgiju i prikladan režim rada proveravamo prema konkretnoj podlozi.'),
 ('Ekscentrična brusilica',5,'Random orbital sander','Эксцентриковая шлифмашина','Eksantrik zımpara','偏心砂光机',r'ekscent(ar|ric)','ekscentrične brusilice',['ekscentar brusilica','orbitalna brusilica'],'Ekscentrična brusilica obrađuje ravne i blago zakrivljene površine uz odgovarajući abraziv. Koristi se za pripremu i završnu obradu drveta i premaza.','Navedi površinu, materijal i sloj koji obrađuješ. Pre najma dogovaramo granulaciju, veličinu abraziva i mogućnost priključivanja usisivača.'),
 ('Set gedora',6,'Socket wrench set','Набор торцевых ключей','Lokma anahtar seti','套筒扳手组',r'^gedore$','seta gedora',['nasadni ključevi','set gedora'],'Set gedora služi za odvrtanje i zatezanje odgovarajućih šrafova i matica. Sadržaj kompleta, prihvati i dimenzije ključeva potvrđuju se prema poslu.','Navedi dimenzije šrafova, pristup spoju i potreban prihvat. Proveravamo koje gedore, produžeci i čegrtaljka odgovaraju intervenciji.'),
 ('Glodalica za gips',4,'Drywall cut-out tool','Фрезер для гипсокартона','Alçıpan kesme frezesi','石膏板开孔机',r'gips rotacija','glodalice za gips',['gips rotacija','rezač gips ploča'],'Rotaciona glodalica pravi otvore i obrađuje ivice gipsanih ploča odgovarajućim nastavkom. Namenjena je preciznim izrezima tokom suvomontažnih radova.','Navedi debljinu i tip ploče, dimenzije otvora i broj izreza. Pre najma proveravamo nastavak, podešavanje dubine i odvođenje prašine.'),
 ('Helikopter za beton',4,'Concrete power trowel','Затирочная машина по бетону','Beton perdah makinesi','混凝土抹光机',r'helikopter za (beton|ravnjanje)','helikoptera za beton',['perdaška za beton','mašina za ravnanje betona'],'Helikopter služi za obradu i ravnanje odgovarajuće betonske površine u fazi završne obrade. Konfiguracija se bira prema pristupu i stanju betona.','Navedi površinu, oblik prostora, pristup i planirani termin betoniranja. Pre najma potvrđujemo disk ili lopatice i zahteve konkretnog modela.'),
 ('Trakasta brusilica',5,'Belt sander','Ленточная шлифмашина','Bant zımpara','带式砂光机',r'trakasta brusilica','trakaste brusilice',['tračna brusilica','belt sander'],'Trakasta brusilica skida materijal i obrađuje odgovarajuće drvene površine pomoću brusne trake. Koristi se kada je potrebno ravnomerno uklanjanje sloja.','Navedi dimenzije površine, vrstu drveta i željenu obradu. Proveravamo odgovarajuću traku, granulaciju i mogućnost odvođenja prašine.'),
 ('Ručni cirkular',5,'Handheld circular saw','Ручная циркулярная пила','El tipi daire testere','手持圆锯',r'rucna testera / cirkular|testera/cirkular','ručnog cirkulara',['ručna kružna testera','cirkular za drvo'],'Ručni cirkular pravi pravolinijske rezove u odgovarajućem drvetu i pločastim materijalima. Izbor lista, oslonca i dubine reza prilagođava se poslu.','Navedi materijal, debljinu, dužinu i broj rezova. Pre najma proveravamo list, vođicu i uslove stabilnog postavljanja radnog komada.'),
 ('Ventilator',2,'Ventilation fan','Вентилятор','Havalandırma fanı','通风风扇',r'ventilator','ventilatora',['industrijski ventilator','ventilator sa raspršivačem'],'Ventilator pokreće vazduh u prostoru ili na radnoj površini. Industrijski i modeli sa raspršivačem objedinjeni su, a odgovarajući tip se potvrđuje prema nameni.','Navedi zapreminu prostora, temperaturu, napajanje i cilj korišćenja. Proveravamo potrebni protok, položaj uređaja i da li je raspršivanje vode prikladno.'),
 ('Vibro letva',4,'Vibrating concrete screed','Виброрейка','Beton vibrasyon mastarı','混凝土振动尺',r'vibro letva','vibro letve',['vibraciona letva','letva za beton'],'Vibro letva raspoređuje i poravnava odgovarajući sveži beton tokom izrade ploča i drugih površina. Radna širina i konfiguracija biraju se prema zadatku.','Navedi širinu i površinu betoniranja, oslonce i uslove pristupa. Pre najma potvrđujemo prikladnu letvu i potrebnu opremu za konkretan model.'),
 ('Pištolj za vezivanje armature',4,'Rebar tying gun','Пистолет для вязки арматуры','Demir bağlama tabancası','钢筋绑扎枪',r'pistolj za vezanje armature','pištolja za vezivanje armature',['vezač armature','pištolj za vezanje armature'],'Pištolj vezuje ukrštanja odgovarajuće armature žicom tokom pripreme konstrukcije. Pre najma proverava se kompatibilnost žice i dimenzija spojeva.','Navedi prečnike šipki, broj vezova i uslove gradilišta. Proveravamo podržani opseg vezivanja, potrošni materijal i raspoloživo napajanje.'),
 ('Sušilica za košuljicu',2,'Screed drying system','Система сушки стяжки','Şap kurutma sistemi','地坪干燥系统',r'susilica za kosuljicu','sušilice za košuljicu',['sistem za sušenje podova','sušenje košuljice'],'Sistem usmerava vazduh u odgovarajuće podne slojeve tokom isušivanja. Primenjuje se prema strukturi poda i ne zamenjuje proveru izvora vlage.','Navedi slojeve poda, površinu, stanje vlage i pristup priključcima. Pre najma dogovaramo creva, nastavke i zahteve za napajanje konkretnog uređaja.'),
 ('Vibro žaba',4,'Tamping rammer','Вибротрамбовка','Zıplamalı kompaktör','冲击夯',r'vibro zaba|sabijanje/skakavac|stampfer atr','vibro žabe',['vibro skakavac','nabijač zemlje'],'Vibro žaba sabija odgovarajući materijal na manjim površinama i u rovovima. Razlikuje se po načinu rada od vibro ploče, a veličina i marka ne stvaraju nove unose.','Navedi vrstu nasipa, dubinu i širinu rova, debljinu sloja i pristup. Model i način transporta potvrđujemo prema uslovima na gradilištu.'),
 ('Motokultivator',3,'Rotary tiller','Мотокультиватор','Motorlu çapa makinesi','旋耕机',r'motokultivator','motokultivatora',['freza za zemlju','motorna freza'],'Motokultivator usitnjava i priprema odgovarajuće zemljište za baštenske radove. Radni zahvat i dodaci biraju se prema parceli i stanju podloge.','Navedi površinu, vrstu zemljišta, nagib i pristup parceli. Pre najma proveravamo nastavke i da li postoje kamenje, korenje ili instalacije u zoni rada.'),
 ('Malčer',3,'Brush mulcher','Мульчер','Ot parçalama makinesi','碎草机',r'malcer za krcenje','malcera',['malčer za krčenje','usitnjivač rastinja'],'Malčer usitnjava odgovarajuću travu i nisko rastinje pri održavanju parcela. Objedinjene su varijante ove vrste mašine, a konkretan model se potvrđuje prema zadatku.','Navedi površinu, gustinu i vrstu rastinja, nagib i pristup. Pre najma potvrđujemo radni opseg uređaja i da li posao zahteva poseban način rukovanja.'),
 ('Prozračivač travnjaka',3,'Lawn scarifier','Скарификатор газона','Çim havalandırma makinesi','草坪梳草机',r'vertikuler|provetrivac za travu','prozračivača travnjaka',['vertikuler','provetrivač travnjaka'],'Prozračivač obrađuje površinski sloj travnjaka i uklanja odgovarajuće naslage pomoću namenskih nastavaka. Izbor postupka zavisi od stanja trave i podloge.','Navedi površinu, stanje travnjaka i željeni rezultat. Pre najma dogovaramo nastavak i podešavanje radne dubine za konkretnu površinu.'),
 ('Set ručnog baštenskog alata',3,'Hand garden tool set','Набор ручного садового инструмента','El bahçe aletleri seti','手动园艺工具组',r'wolf garthen grabulja','seta ručnog baštenskog alata',['grabulje','ručni kultivator'],'Set ručnog baštenskog alata namenjen je skupljanju lišća i manjim radovima na zemljištu. Sadržaj kompleta, drške i nastavke biramo prema planiranom poslu.','Navedi površinu i da li skupljaš lišće, obrađuješ zemlju ili održavaš travnjak. Pre najma potvrđujemo koji ručni nastavci i drške čine komplet.'),
 ('Mašina za odgušenje cevi',7,'Drain cleaning machine','Машина для прочистки труб','Boru açma makinesi','管道疏通机',r'ciscenje cevi rems cobra','mašine za odgušenje cevi',['sajla za odgušenje','mašina za čišćenje kanalizacije'],'Mašina pokreće odgovarajuću sajlu i nastavak za čišćenje dostupnih odvodnih cevi. Opremu biramo prema prečniku, dužini i poznatom uzroku začepljenja.','Navedi materijal, prečnik i trasu cevi, pristup reviziji i znakove začepljenja. Pre najma proveravamo sajlu i nastavke primerene instalaciji.'),
 ('Mašina za pranje podova',1,'Floor scrubber dryer','Поломоечная машина','Zemin yıkama makinesi','洗地机',r'masina za pranje podova','mašine za pranje podova',['podna mašina','scrubber dryer'],'Mašina za pranje podova čisti odgovarajuće tvrde podloge i sakuplja vodu prema konfiguraciji modela. Razlikuje se od ekstrakcijske mašine za tekstil.','Navedi tip poda, površinu, prepreke i pristup vodi i napajanju. Pre najma dogovaramo četku ili pad i proveravamo sredstvo prikladno za podlogu.'),
 ('Mešalica za beton',4,'Concrete mixer','Бетономешалка','Beton mikseri','混凝土搅拌机',r'mesalic(a|e|u) (za beton|za malter|\d)|scheppach mix','mešalice za beton',['betonska mešalica','mešalica za malter'],'Mešalica u bubnju priprema odgovarajuće količine betona ili maltera na gradilištu. Zapremina i napajanje potvrđuju se prema planiranom tempu rada.','Navedi materijal, potrebnu količinu po turi, ukupni obim i priključak na lokaciji. Pre najma proveravamo transport, oslonac i zahteve konkretnog modela.'),
 ('Merdevine',9,'Ladder','Лестница','Merdiven','梯子',r'merdevine','merdevina',['trodelne merdevine','radne merdevine'],'Merdevine omogućavaju pristup odgovarajućoj radnoj visini. Drvene, aluminijumske i višedelne varijante ostaju jedan unos; model se bira prema poslu.','Navedi potrebnu visinu, vrstu podloge i prostor za postavljanje. Pre najma potvrđujemo konfiguraciju, dimenzije pri transportu i odgovarajuće oslonce.'),
 ('Vakuumski nosač za staklo i ploče',9,'Vacuum glass lifter','Вакуумный держатель для стекла','Vakumlu cam taşıma aparatı','玻璃真空吸盘搬运器',r'vakum pumpa veribor','vakuumskog nosača za staklo',['vakuumski podizač','vakum pumpa za staklo'],'Vakuumski nosač hvata odgovarajuću glatku površinu radi pozicioniranja ili prenošenja stakla i ploča. Ovo je ručni nosač sa pumpom, a ne pumpa za vodu.','Navedi materijal, masu i dimenzije elementa i stanje površine. Pre najma proveravamo nosivost, prikladnost zaptivanja i plan transporta.'),
]
new=[]
for offset,row in enumerate(rows,73):
 sr,cat,en,ru,tr,zh,pattern,term,aliases,use,selection=row
 names=dict(zip(['sr','en','ru','tr','zh'],[sr,en,ru,tr,zh]))
 descriptions={'sr':use,'en':f'{en} for rental in Belgrade. Tell us about the job and dates to confirm the suitable equipment, accessories, price and availability.','ru':f'{ru} в аренду в Белграде. Сообщите задачу и даты, чтобы подтвердить оборудование, принадлежности, цену и наличие.','tr':f'Belgrad’da kiralık: {tr}. Ekipmanı, aksesuarları, fiyatı ve uygunluğu teyit etmek için işi ve tarihleri belirtin.','zh':f'{zh}可在贝尔格莱德租赁。请告知工作内容和日期，以便确认设备、配件、价格及可用情况。'}
 new.append({'id':f'tool-{offset:03}','slug':slug(sr),'name':names,'description':descriptions,'categoryId':f'cat-{cat}','price':enrichment.get(f'tool-{offset:03}',{}).get('price'),'deposit':0,'quantity':None,'image':'','published':True,'featured':False,'updatedAt':source['retrieved_at']})
patterns={
 'tool-001':r'perac|peranje pod pritiskom|puromat', 'tool-002':r'parocistac', 'tool-003':r'dubinsko|^karcer$', 'tool-004':r'usisivac|usisavanje',
 'tool-007':r'polirk|poliranje', 'tool-011':r'vlage|vlagu|vlazivac|susac vazduha', 'tool-013':r'drenazna pumpa|muljna pumpa|wacker pt|pumpa za vodu -',
 'tool-014':r'pumpa za nisku vodu', 'tool-015':r'wacker pg', 'tool-016':r'kosilica|kosacica', 'tool-018':r'trimer.*(trav|fs |demon|4 u 1)|benzinski trimer',
 'tool-019':r'zivu ogradu|makaze za rezanje', 'tool-020':r'busac.*rup|busac/busilica za zemlju|busilica za zemlju', 'tool-021':r'duvac.*lisc', 'tool-022':r'drobilica.*grane',
 'tool-024':r'pikamer|stemaric|hilti te (700|800|1000|1500|2000|3000)|gsh|udarni elektro.pneumatski|hidraulicni agregat sa',
 'tool-023':r'udarna busilica|busilica/cekic|cekic.busilica|cekic/busilica|elektro.pneumatski cekic.*gbh|udarni cekic hilti|wurth bmh',
 'tool-025':r'slicerica', 'tool-026':r'zirafa|flex wst', 'tool-027':r'brusilica za beton|podna brusilica za beton', 'tool-028':r'farbanje|airless',
 'tool-029':r'(sekac|rezac|testera|secenje).*beton|husqvarna k970|motorni sekac|benzinski sekac|stona testera / sekacica', 'tool-030':r'vibro igla|vibrator za beton',
 'tool-031':r'srafilic|sauberic|zavrtac', 'tool-032':r'udarni odvijac|udarn(i|ih) zavijac', 'tool-033':r'secenje pod uglom|ugaona testera|cirkular / gere',
 'tool-035':r'povratna testera|testera makita djr', 'tool-036':r'frezer/glodalica', 'tool-037':r'hobleric.*parket|hoblaric.*parket',
 'tool-038':r'rende/hoblerica', 'tool-039':r'ubodna testera', 'tool-040':r'^cirkular einhell|stona testera za drvo',
 'tool-041':r'cirkular za metal', 'tool-042':r'zavarivanj', 'tool-043':r'ugaona brusilica|^brusilica bosch|baterijska ugaona',
 'tool-044':r'ostrilica', 'tool-047':r'toplotni pistolj|vruc vazduh', 'tool-051':r'mikser za boju', 'tool-052':r'pegla.varilica',
 'tool-055':r'^laser bosch|hilti pm', 'tool-067':r'agregat', 'tool-068':r'kompresor', 'tool-069':r'motalica|produzni kabl', 'tool-070':r'led.*lamp|rasvetni toranj',
 'tool-071':r'kalorifer',
}
# Specialists precede broad terms, e.g. nail gun for drywall is not a screwdriver.
types=[{'id':t['id'],'slug':t['slug'],'name':t['name']['sr'],'pattern':rows[i][6]} for i,t in enumerate(new)]
# Rammer precedes the broader vibro-machine rule.
types.sort(key=lambda t:0 if t['slug']=='vibro-zaba' else 1)
for t in original:types.append({'id':t['id'],'slug':t['slug'],'name':t['name']['sr'],'pattern':patterns.get(t['id'],'')})
# More specific matching before pressure/drill/aggregate and other broad words.
priority=['tool-032','tool-031','tool-019','tool-020','tool-023','tool-024','tool-025','tool-029','tool-014','tool-015','tool-013','tool-033','tool-041','tool-037','tool-038','tool-004','tool-011','tool-068']
new_types=[t for t in types if t['id'] not in {x['id'] for x in original}]
old_types=sorted([t for t in types if t['id'] in {x['id'] for x in original}], key=lambda t:priority.index(t['id']) if t['id'] in priority else 100)
types=new_types+old_types
excluded=re.compile(r'^(usluzno |tenge rent -)|bager|utovarivac|damper|kiper|kontejner|kamion|platform|makazast|skel|podupirac|sprajcev|oplata|levak za sut|cevi za spustanje|viljuskar|dizalic|ormana|valjak|masine za rad na visini',re.I)
classified=[]
for item in source['items']:
 title=norm(item['title'])
 if title=='iznajmljivanje aku i kablastih alata':
  classified.append({**item,'status':'existing_types_bundle','toolIds':['tool-031','tool-032','tool-023','tool-024','tool-043']});continue
 # Ladders are portable work equipment; scaffold-only listings stay out.
 if excluded.search(title) and 'merdevine' not in title:
  classified.append({**item,'status':'excluded','reason':'Usluga, oglas firme, vozilo ili gradjevinska mehanizacija/oprema van alata.'});continue
 matched=next((t for t in types if t['pattern'] and re.search(t['pattern'],title)),None)
 if matched:
  classified.append({**item,'status':'existing_type' if matched['id'] in {t['id'] for t in original} else 'new_type','toolId':matched['id'],'canonicalName':matched['name']})
 else:classified.append({**item,'status':'needs_review'})
missing=[t for t in new if not any(i.get('toolId')==t['id'] for i in classified)]
if missing:raise ValueError('No source for '+str([t['name']['sr'] for t in missing]))
report={'source':source['source'],'retrieved_at':source['retrieved_at'],'rules':'Jedan unos po vrsti alata. Bez novih unosa za marku, snagu, zapreminu, dimenziju, napajanje ili komplet postojecih alata. Cene i kolicine novih vrsta nisu potvrdene.','new_types':len(new),'existing_catalog_types':len(original),'items':classified}
(ROOT/'research/dajnadan/import-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
(ROOT/'lib/equipment-types.json').write_text(json.dumps(types,ensure_ascii=False,indent=2)+'\n')
(ROOT/'lib/catalog-import.json').write_text(json.dumps({'migration':'dajnadan-tool-types-2026-10-12-v1','tools':new},ensure_ascii=False,indent=2)+'\n')
seed['tools']=original+new
(ROOT/'lib/seed.json').write_text(json.dumps(seed,ensure_ascii=False,indent=2)+'\n')
seo=json.loads((ROOT/'lib/seo-catalog.json').read_text())
for t,row in zip(new,rows):seo[t['slug']]={'term':row[7],'aliases':row[8],'use':row[9],'selection':row[10]}
(ROOT/'lib/seo-catalog.json').write_text(json.dumps(seo,ensure_ascii=False,indent=2)+'\n')
for i in classified:
 if i['status']=='needs_review':print('UNMATCHED',i['title'],i['url'])
print('NEW',len(new),'TOTAL',len(seed['tools']))
from collections import Counter
print(Counter(i['status'] for i in classified))
