"""Build the authorized Crafter model import, preserving legacy seed records."""
import json,re,math,unicodedata,subprocess
from pathlib import Path
from collections import Counter
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parent.parent
read=lambda p:json.loads((ROOT/p).read_text())
write=lambda p,v:(ROOT/p).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
source=read('research/crafter-2026-10-12/products-review.json')['products']
accepted=[x for x in source if x['status']=='included']
assert len(accepted)==1813
seed=read('lib/seed.json');seo=read('lib/seo-catalog.json');offers=read('lib/catalog-source-offers.json')
previous=ROOT/'lib/catalog-crafter-import.json'
created=read('lib/catalog-crafter-import.json')['createdAt'] if previous.exists() else datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z')
legacy=[x for x in seed['tools'] if not x.get('catalogModel')]
seed['tools']=legacy
seo={k:v for k,v in seo.items() if k in {x['slug'] for x in legacy}}
base_offers=[x for x in offers['offers'] if x['source']!='crafter.rs']
norm=lambda s:''.join(c for c in unicodedata.normalize('NFKD',s.lower().replace('đ','dj')) if not unicodedata.combining(c))
slug=lambda s:re.sub(r'[^a-z0-9]+','-',norm(s)).strip('-')
season={'id':'cat-11','slug':'sezonska-prerada-i-pretakanje','name':{'sr':'Sezonska prerada i pretakanje','en':'Seasonal processing and transfer','ru':'Сезонная переработка и перекачка','tr':'Mevsimlik işleme ve aktarma','zh':'季节加工与输送'},'icon':'2','published':True}
if not any(c['id']==season['id'] for c in seed['categories']):seed['categories'].append(season)
# Prioritize the actual function in the product name over supplier category labels.
def category(x):
 n=norm(x['name']);p=' '.join(x['categories'])
 if '/vino-i-rakija/' in p:return 'cat-11'
 if re.search(r'vibro ploc|vibro nabij|vibrator za beton|mesalica za beton|betona pts|rucni sekac.*keramik|se[cč]enje ploc|reza[cč].*ploc',n):return 'cat-7' if re.search(r'keramik|ploc',n) else 'cat-4'
 if re.search(r'laser|daljinomer|merac vlage|mera[cč].*vlage|termometar|termo.higrometar|multimetar|amper|detektor|tester napona|nivelator',n):return 'cat-8'
 if re.search(r'agregat|kompresor|grejalic|kalorifer|reflektor|radna lampa|led lampa|motalica|pokretna klima|klima.*pokretna',n):return 'cat-10'
 if re.search(r'pumpa|hidrofor|hidropak',n):return 'cat-2'
 if re.search(r'duvac|lisca|lisce',n):return 'cat-3'
 if re.search(r'perac|usisivac|dubinsko|parocistac|cistac podova|ciscenje|polirk|poliranje|cleanexxo|picobella',n):return 'cat-1'
 if re.search(r'otpusavanje|otp(u|us)savanje|cistac odvoda|cistac cevi|nareznic|pertlov|savijanje cevi|ropump|varilica.*cevi|pegla.*cevi|makaze.*cevi|vakuum|vakum',n):return 'cat-7'
 if re.search(r'merdevin|skel|dizalica|paletar|kolica|podizac|podupirac|izvlakac|izvlaka[cč]',n):return 'cat-9'
 if re.search(r'brusilic.*(?:beton|zid)|ziraf|cekic|hamer|stemar|busil',n):return 'cat-6' if 'stubn' in n else 'cat-4'
 if re.search(r'ugaona brusil|ceona brusil|bijaks|dremel',n):return 'cat-6'
 if re.search(r'(?:vibracion|ekscent|tracn).*brusil|heftalic|zabijac ekser',n):return 'cat-5'
 if re.search(r'zavar|varenj|lemil|zakiv|nitov|mazalic|podmaz|armatur|pneumats|moment kljuc|izvlaka|busilica.*stub|stona.*metal|testera.*metal',n):return 'cat-6'
 if re.search(r'kosilic|kosacic|kosac|trimer|duvac|lisca|motokult|kopacic|freza.*bast|aerator|prozrac|vertikulator|cepac|seckalic|seckanje|drobilic|testera.*(?:motor|benz|lanc|teleskop)|lancana testera|cistac snega|makaze.*(?:ziv|orez|trav)|prskal|atomizer|tresac|sejalic',n):return 'cat-3'
 if re.search(r'rende|glodalic|kekser|testera|cirkular|tocilo|ostrac|stacionarno',n):return 'cat-5'
 if '/motorne-masine-i-alati/' in p or '/prskalice/' in p:return 'cat-3'
 if '/merdevine-i-skele' in p or '/kolica-za-teret' in p:return 'cat-9'
 if '/alati-za-vodoinstalatere-i-keramicare/' in p or '/keramicarski-alat-i-pribor' in p:return 'cat-7'
 if '/zavarivanje/' in p:return 'cat-6'
 if '/elektromaterijal/' in p or '/grejanje-i-klimatizacija/' in p or '/rasveta/' in p:return 'cat-10'
 if '/auto-oprema/peraci' in p or '/ciscenje/' in p:return 'cat-1'
 if '/auto-dizalice' in p or '/radapcigeri' in p:return 'cat-9'
 if '/rucni-alat/kljucevi/' in p:return 'cat-6'
 return 'cat-4'

# Localize function words, preserving brand names, model codes and source specs.
phrases=[
 ('aku elektro pneumatski čekić','cordless rotary hammer','аккумуляторный перфоратор','akülü kırıcı delici','无绳电锤'),
 ('elektro-pneumatski čekić','rotary hammer','перфоратор','kırıcı delici','电锤'),
 ('elektro pneumatski čekić','rotary hammer','перфоратор','kırıcı delici','电锤'),
 ('akumulatorski udarni odvijač','cordless impact driver','аккумуляторный ударный шуруповёрт','akülü darbeli vidalama','无绳冲击起子'),
 ('bušilica-odvrtač','drill driver','дрель-шуруповёрт','matkap vidalama','电钻起子'),
 ('bušilica odvrtаč','drill driver','дрель-шуруповёрт','matkap vidalama','电钻起子'),
 ('bušilica odvrtač','drill driver','дрель-шуруповёрт','matkap vidalama','电钻起子'),
 ('ugaona brusilica','angle grinder','угловая шлифмашина','avuç taşlama','角磨机'),
 ('kružna testera','circular saw','циркулярная пила','daire testere','圆锯'),
 ('ubodna testera','jigsaw','электролобзик','dekupaj testere','曲线锯'),
 ('motorna testera','chainsaw','бензопила','motorlu testere','链锯'),
 ('lančana testera','chainsaw','цепная пила','zincirli testere','链锯'),
 ('tračna testera','band saw','ленточная пила','şerit testere','带锯'),
 ('tračna brusilica','belt sander','ленточная шлифмашина','bant zımpara','带式砂光机'),
 ('vibraciona brusilica','orbital sander','вибрационная шлифмашина','titreşimli zımpara','振动砂光机'),
 ('ekscentrična brusilica','random orbital sander','эксцентриковая шлифмашина','eksantrik zımpara','偏心砂光机'),
 ('brusilica za zidove','drywall sander','шлифмашина для стен','duvar zımpara','墙面砂光机'),
 ('vibro ploča','plate compactor','виброплита','titreşimli plaka','平板夯'),
 ('vibro nabijač','tamping rammer','вибротрамбовка','tokmak kompaktör','冲击夯'),
 ('pištolj za farbanje','paint sprayer','краскопульт','boya tabancası','喷漆机'),
 ('pištolj za vruć vazduh','heat gun','термофен','sıcak hava tabancası','热风枪'),
 ('fen za vruć vazduh','heat gun','термофен','sıcak hava tabancası','热风枪'),
 ('fen za vreli vazduh','heat gun','термофен','sıcak hava tabancası','热风枪'),
 ('pištolj za silikon','caulking gun','пистолет для герметика','silikon tabancası','密封胶枪'),
 ('za mokro/suvo usisavanje','wet/dry vacuum','для сухой и влажной уборки','ıslak kuru süpürme','干湿吸尘'),
 ('za suvo i mokro usisavanje','wet/dry vacuum','для сухой и влажной уборки','ıslak kuru süpürme','干湿吸尘'),
 ('za suvo/mokro','wet/dry','для сухой и влажной уборки','ıslak kuru','干湿两用'),
 ('mašina za dubinsko pranje','carpet extractor','моющий экстрактор','halı yıkama makinesi','抽洗清洁机'),
 ('pumpa za prljavu vodu','dirty-water pump','насос для грязной воды','kirli su pompası','污水泵'),
 ('pumpa za čistu vodu','clean-water pump','насос для чистой воды','temiz su pompası','清水泵'),
 ('pumpa za vodu','water pump','водяной насос','su pompası','水泵'),
 ('duvač lišća','leaf blower','воздуходувка','yaprak üfleme','吹叶机'),
 ('duvač/usisivač lišća','leaf blower vacuum','садовый пылесос-воздуходувка','yaprak üfleme emme','吹吸叶机'),
 ('za živu ogradu','hedge','для живой изгороди','çit','绿篱'),
 ('za orezivanje','pruning','для обрезки','budama','修枝'),
 ('za struju','power','электрогенератор','elektrik','发电'),
 ('mešalica za beton','concrete mixer','бетономешалка','beton mikseri','混凝土搅拌机'),
 ('za sečenje pločica','tile cutting','для резки плитки','fayans kesme','瓷砖切割'),
 ('za grane','branch','для веток','dal','树枝'),
 ('za pretakanje','transfer','для перекачки','aktarma','输送'),
 ('akumulatorska','cordless','аккумуляторная','akülü','无绳'),('akumulatorski','cordless','аккумуляторный','akülü','无绳'),('akumulatorsko','cordless','аккумуляторный','akülü','无绳'),('baterijska','cordless','аккумуляторная','akülü','无绳'),('baterijski','cordless','аккумуляторный','akülü','无绳'),('aku','cordless','аккумуляторный','akülü','无绳'),
 ('električni','electric','электрический','elektrikli','电动'),('električna','electric','электрическая','elektrikli','电动'),('električno','electric','электрический','elektrikli','电动'),('benzinski','petrol','бензиновый','benzinli','汽油'),('benzinska','petrol','бензиновая','benzinli','汽油'),('motorni','powered','моторный','motorlu','动力'),('motorna','powered','моторная','motorlu','动力'),
 ('kosilica','lawn mower','газонокосилка','çim biçme makinesi','割草机'),('kosačica','lawn mower','газонокосилка','çim biçme makinesi','割草机'),('trimer','trimmer','триммер','tırpan','割草修剪机'),('bušilica','drill','дрель','matkap','电钻'),('odvijač','driver','шуруповёрт','vidalama','起子'),('odvrtač','driver','шуруповёрт','vidalama','起子'),('šrafilica','driver','шуруповёрт','vidalama','起子'),('odvijači','drivers','шуруповёрты','vidalamalar','起子'),('zavrtač','driver','шуруповёрт','vidalama','起子'),
 ('brusilica','grinder','шлифмашина','taşlama','磨机'),('testera','saw','пила','testere','锯'),('glodalica','router','фрезер','freze','木工铣机'),('rende','planer','рубанок','planya','刨机'),('heftalica','stapler','степлер','zımba makinesi','钉枪'),('usisivač','vacuum cleaner','пылесос','süpürge','吸尘器'),('perač','washer','мойка','yıkama makinesi','清洗机'),('kompresor','compressor','компрессор','kompresör','空压机'),('agregat','generator','генератор','jeneratör','发电机'),('grejalica','heater','обогреватель','ısıtıcı','加热器'),('kalorifer','fan heater','тепловентилятор','fanlı ısıtıcı','暖风机'),('prskalica','sprayer','опрыскиватель','ilaçlama makinesi','喷雾器'),('atomizer','mist blower','мотоопрыскиватель','atomizör','弥雾机'),('drobilica','shredder','измельчитель','parçalayıcı','粉碎机'),('seckalica','shredder','измельчитель','parçalayıcı','粉碎机'),('cepač','splitter','колун','yarma makinesi','劈木机'),('motokultivator','cultivator','мотокультиватор','kültivatör','耕作机'),('kopačica','tiller','культиватор','çapa makinesi','松土机'),('freza','tiller','фреза','freze','耕耘机'),('aerator','aerator','аэратор','havalandırıcı','草坪打孔机'),('vertikulator','scarifier','скарификатор','çim havalandırıcı','草坪梳理机'),
 ('merdevine','ladder','лестница','merdiven','梯子'),('skela','scaffold','леса','iskele','脚手架'),('dizalica','hoist','подъёмник','vinç','起重机'),('paletar','pallet truck','рохля','transpalet','托盘搬运车'),('kolica','trolley','тележка','taşıma arabası','手推车'),('kazan','still','перегонный аппарат','damıtma kazanı','蒸馏设备'),('muljača','grape crusher','дробилка винограда','üzüm ezici','葡萄破碎机'),('presa','press','пресс','pres','压榨机'),('mašina','machine','машина','makine','机器'),('pneumatski','pneumatic','пневматический','pnömatik','气动'),('pneumatska','pneumatic','пневматическая','pnömatik','气动'),
 ('laserski daljinomer','laser distance meter','лазерный дальномер','lazer mesafe ölçer','激光测距仪'),('laserski nivelator','laser level','лазерный нивелир','lazer nivo','激光水平仪'),('laser','laser','лазер','lazer','激光'),('daljinomer','distance meter','дальномер','mesafe ölçer','测距仪'),('multimetar','multimeter','мультиметр','multimetre','万用表'),('unimer','multimeter','мультиметр','multimetre','万用表'),('moment ključ','torque wrench','динамометрический ключ','tork anahtarı','扭矩扳手'),('pištolj','gun','пистолет','tabanca','枪'),('čekić','hammer','молоток','çekiç','锤'),('makaze','shears','ножницы','makas','剪刀'),('fen','heat gun','термофен','sıcak hava tabancası','热风枪'),('tocilo','bench grinder','точило','masa taşlama','台式砂轮机'),('lemilica','soldering iron','паяльник','havya','烙铁'),
 ('ručna','handheld','ручная','el tipi','手持'),('ručni','handheld','ручной','el tipi','手持'),('stona','table','настольная','masa tipi','台式'),('podna','floor','напольная','zemin','地面'),('potapajuća','submersible','погружной','dalgıç','潜水'),('potopna','submersible','погружной','dalgıç','潜水'),('udarna','impact','ударная','darbeli','冲击'),('udarni','impact','ударный','darbeli','冲击'),('ugaona','angle','угловая','açılı','角式'),('mala','compact','компактная','kompakt','紧凑型'),('velika','large','большая','büyük','大型'),('teleskopska','telescopic','телескопическая','teleskopik','伸缩式'),('teleskopski','telescopic','телескопический','teleskopik','伸缩式'),('inverter','inverter','инверторный','inverter','逆变'),('univerzalni','universal','универсальный','üniversal','通用'),('univerzalna','universal','универсальная','üniversal','通用'),('čistač','cleaner','очиститель','temizleyici','清洁机'),('baterijom','battery','аккумулятором','batarya','电池'),('baterije','batteries','аккумуляторы','bataryalar','电池'),('punjačem','charger','зарядным устройством','şarj cihazı','充电器'),('koferom','case','кейсом','çanta','箱'),('set alata','tool set','набор инструментов','alet seti','工具套装')]
phrases.sort(key=lambda v:len(v[0]),reverse=True)
def translate_name(name,l):
 if l=='sr':return name
 # Single pass avoids translating text inserted by an earlier replacement.
 lookup={norm(p[0]):p[['en','ru','tr','zh'].index(l)+1] for p in phrases}
 pattern=re.compile(r'(?<!\w)(?:'+ '|'.join(re.escape(p[0]) for p in phrases)+r')(?!\w)',re.I)
 return pattern.sub(lambda m:lookup[norm(m[0])],name)
uses={
 'cat-1':('Oprema za čišćenje i održavanje površina.','Equipment for surface cleaning and maintenance.','Оборудование для очистки и ухода за поверхностями.','Yüzey temizliği ve bakım ekipmanı.','用于表面清洁与维护的设备。'),
 'cat-2':('Oprema za prebacivanje vode i kontrolu uslova u prostoru.','Equipment for water transfer and site conditions.','Оборудование для перекачки воды и контроля условий в помещении.','Su aktarma ve çalışma alanı koşulları için ekipman.','用于水输送和作业环境管理的设备。'),
 'cat-3':('Oprema za sezonsko održavanje travnjaka, rastinja i dvorišta.','Equipment for seasonal lawn, vegetation and garden work.','Оборудование для сезонного ухода за газоном, растениями и участком.','Mevsimlik çim, bitki ve bahçe işleri için ekipman.','用于季节性草坪、植物和庭院作业的设备。'),
 'cat-4':('Alat za bušenje, pripremu materijala i radove adaptacije.','Tools for drilling, material preparation and renovation.','Инструмент для сверления, подготовки материалов и ремонта.','Delme, malzeme hazırlığı ve tadilat için aletler.','用于钻孔、材料准备和装修作业的工具。'),
 'cat-5':('Alat za rezanje, obradu i pripremu materijala u radionici.','Tools for cutting, shaping and workshop preparation.','Инструмент для резки, обработки и подготовки материалов в мастерской.','Atölyede kesme, işleme ve malzeme hazırlığı için aletler.','用于车间切割、加工和材料准备的工具。'),
 'cat-6':('Oprema za obradu materijala, spajanje i radioničke poslove.','Equipment for material processing, joining and workshop tasks.','Оборудование для обработки материалов, соединения и работ в мастерской.','Malzeme işleme, birleştirme ve atölye işleri için ekipman.','用于材料加工、连接和车间作业的设备。'),
 'cat-7':('Alat za rad sa pločicama, cevima i materijalima za ugradnju.','Tools for tile, pipe and installation-material work.','Инструмент для работы с плиткой, трубами и монтажными материалами.','Fayans, boru ve montaj malzemeleri için aletler.','用于瓷砖、管道和安装材料作业的工具。'),
 'cat-8':('Instrument za merenje ili proveru uslova tokom radova.','An instrument for measurement or checks during project work.','Прибор для измерений и проверки условий во время работ.','Çalışma sırasında ölçüm veya kontrol için cihaz.','用于作业期间测量和检查的仪器。'),
 'cat-9':('Oprema za pristup visini, pozicioniranje ili transport tereta.','Equipment for access, positioning or moving loads.','Оборудование для доступа на высоту, позиционирования и перевозки грузов.','Yükseğe erişim, konumlandırma veya yük taşıma ekipmanı.','用于高处作业、定位或搬运负载的设备。'),
 'cat-10':('Oprema za privremeno napajanje, vazduh, osvetljenje ili grejanje.','Equipment for temporary power, air, lighting or heating.','Оборудование для временного питания, подачи воздуха, освещения или обогрева.','Geçici güç, hava, aydınlatma veya ısıtma ekipmanı.','用于临时供电、供气、照明或加热的设备。'),
 'cat-11':('Sezonska oprema za preradu plodova i pretakanje tečnosti.','Seasonal equipment for processing produce and transferring liquids.','Сезонное оборудование для переработки плодов и перекачки жидкостей.','Ürün işleme ve sıvı aktarma için mevsimlik ekipman.','用于农产品加工和液体输送的季节性设备。')}
selection={
 'sr':'Navedi posao, materijal ili površinu, potrebnu veličinu i napajanje. Model, dodatke i sadržaj kompleta potvrđujemo pre najma. Dostava je na teritoriji grada Beograda.',
 'en':'Describe the task, material or surface, required size and power supply. We confirm the model, accessories and kit before rental. Delivery is within the City of Belgrade.',
 'ru':'Укажите задачу, материал или поверхность, необходимые размеры и питание. Модель, насадки и комплект подтверждаем до аренды. Доставка в пределах города Белграда.',
 'tr':'İşi, malzemeyi veya yüzeyi, gereken ölçüyü ve güç kaynağını belirtin. Modeli, aksesuarları ve seti kiralamadan önce onaylarız. Teslimat Belgrad şehri sınırları içindedir.',
 'zh':'请说明作业、材料或表面、所需尺寸及电源。租赁前确认型号、附件和套装内容。配送范围为贝尔格莱德市。'}
solo_text={'sr':'Solo model: baterije i punjač dogovaramo posebno; cena kompletnog najma je na upit.','en':'Solo model: batteries and charger are arranged separately; ask for the complete rental price.','ru':'Модель Solo: аккумуляторы и зарядное устройство согласуются отдельно; стоимость полного комплекта по запросу.','tr':'Solo model: batarya ve şarj cihazı ayrıca belirlenir; komple kiralama fiyatı için teklif isteyin.','zh':'Solo 裸机型号：电池和充电器另行确认；完整租赁价格请咨询。'}
heads={'sr':'Najam modela','en':'Rental of','ru':'Аренда','tr':'Kiralama','zh':'租赁型号'}
locs=['sr','en','ru','tr','zh'];models=[];new_offers=[]
for x in accepted:
 ident=x.get('productId') or x['id'].removeprefix('CR-');id='crafter-'+str(ident);n=x['name'];c=category(x)
 incomplete=bool(re.search(r'\bsolo\b|bez bater|bez akumul|bez punjac|bare tool|body only',norm(n)))
 purchase=x['price'];base=x['regularPrice'] or purchase
 daily=max(500,math.floor((min(base,15000)/15+max(min(base,60000)-15000,0)/30+max(base-60000,0)/60)/100+0.5)*100)
 names={l:translate_name(n,l) for l in locs}
 descriptions={l:f"{heads[l]} {names[l]}. {uses[c][i]} {selection[l]}"+(f" {solo_text[l]}" if incomplete else '') for i,l in enumerate(locs)}
 image=x.get('imageUrl','');image=image if image.startswith('https://www.crafter.rs/media/catalog/product/') else ''
 model={'id':id,'slug':slug(n)[:130].rstrip('-')+'-cr-'+str(ident),'name':names,'description':descriptions,'categoryId':c,'price':None if incomplete else daily,'deposit':None,'quantity':None,'image':image,'published':True,'featured':False,'updatedAt':created,'catalogModel':{'source':'crafter.rs','productId':str(ident),'sku':x.get('sku') or '', 'url':x['url'],'purchasePrice':purchase,'regularPurchasePrice':x['regularPrice'],'rentalPriceBase':base,'observedAt':'2026-10-12','incompleteKit':incomplete}}
 models.append(model)
 aliases=[n,x['category']]
 for pattern,words in [(r'ugaona brusil',['fleks','ugaona brusilica']),(r'ziraf|brusilic.*zid',['žirafa','šlajferica za zidove']),(r'kosil|kosac',['kosilica','kosačica']),(r'agregat',['generator za struju']),(r'ceki[cč].*(?:rusenj|stem)|pikamer',['pikamer','štemarica']),(r'duvac',['duvač lišća']),(r'pegla.*cevi|varilica.*cevi',['pegla za cevi'])]:
  if re.search(pattern,norm(n)):aliases.extend(words)
 seo[model['slug']]={'term':'modela '+n,'aliases':list(dict.fromkeys(aliases))+(['solo alat'] if incomplete else []),'use':descriptions['sr'],'selection':f"Za model {n}: {selection['sr']}"}
 new_offers.append({'id':'crafter-sale-'+str(ident),'source':'crafter.rs','url':x['url'],'name':n,'category':x['category'],'kind':'sale','toolIds':[id],'priceText':f"{purchase:,.2f} RSD".replace(',',' ').replace('.',','),'prices':[{'label':'Prodajna cena sa PDV','amount':purchase,'currency':'RSD','unit':'sale','vat':'included'}],'priceNotes':[f"Redovna prodajna cena: {x['regularPrice']} RSD.",f"Dostupnost kod dobavljača: {x['availability'] or 'nije navedena'}.",'Prodajna cena nije dnevni najam. Naše količine se potvrđuju posebno.']+x['notes'],'depositText':'','discrepancy':'','observedAt':'2026-10-12'})
assert len({x['id'] for x in models})==len(models)
assert len({x['slug'] for x in models})==len(models)
assert all(len(x['slug'])<=160 and all(len(n)<=200 for n in x['name'].values()) for x in models)
seed['tools'].extend(models)
write('lib/catalog-crafter-import.json',{'migration':'crafter-models-2026-10-12-v1','createdAt':created,'categories':[season],'tools':models})
write('lib/seed.json',seed);write('lib/seo-catalog.json',seo)
write('lib/catalog-source-offers.json',{**offers,'offers':base_offers+new_offers})
write('research/crafter-2026-10-12/import-summary.json',{'approved':len(models),'excludedFromImport':len(source)-len(models),'totalSeedTools':len(seed['tools']),'categories':dict(Counter(x['categoryId'] for x in models)),'priced':sum(x['price'] is not None for x in models),'inquiry':sum(x['price'] is None for x in models),'images':sum(bool(x['image']) for x in models),'priceBasis':'Redovna prodajna cena kompletnog modela; solo modeli na upit. Prvih 15.000 / 15, sledećih 45.000 / 30, ostatak / 60; minimum 500, zaokruživanje na 100 RSD.','createdAt':created})
print(json.dumps(read('research/crafter-2026-10-12/import-summary.json'),ensure_ascii=False,indent=2))
subprocess.run(['node','scripts/prepare-catalog-presentation.mjs'],cwd=ROOT,check=True)

if (ROOT/'lib/catalog-reduction.json').exists():
 subprocess.run(['node','scripts/prepare-catalog-reduction.mjs'],cwd=ROOT,check=True)
