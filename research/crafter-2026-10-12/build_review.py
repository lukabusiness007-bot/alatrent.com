"""Build a review-only catalog. Does not import into the application or its database."""
from pathlib import Path
from collections import defaultdict,Counter
from urllib.parse import urlparse,parse_qs
import json,re,hashlib,unicodedata,html
ROOT=Path(__file__).parent

def norm(s):
 return ''.join(c for c in unicodedata.normalize('NFKD',s.lower().replace('đ','dj')) if not unicodedata.combining(c))
def match(pattern,text):return re.search(pattern,text) is not None
crawl=json.loads((ROOT/'crawl.json').read_text())
cats={c['url']:c for c in json.loads((ROOT/'categories-menu.json').read_text())}
cats.update({c['url']:c for c in crawl['categories']})
rows={}
for page in crawl['pages']:
 for x in page['products']:
  key=x.get('productId') or x.get('sku') or x['url']
  if key not in rows:rows[key]={**x,'id':'CR-'+str(key),'categories':[],'observations':[]}
  row=rows[key]
  cat=page['categoryUrl']
  if cat not in row['categories']:row['categories'].append(cat)
  row['observations'].append({'page':page['url'],'observedAt':page['observedAt'],'price':x['price'],'availability':x['availability']})
  if page['observedAt']>=row.get('observedAt',''):
   row.update(x);row['observedAt']=page['observedAt']

# Main machine categories are classified by product name too, because the source
# sometimes puts a device in a broader or unrelated category.
def classify(x):
 n=norm(x['name']); price=x['price'] or 0
 paths=[urlparse(u).path for u in x['categories']]
 leaf='/'.join(paths)
 def has(s):return any(s in p for p in paths)
 def result(s,r):return s,r
 # Product-level exclusions also apply to items listed only on parent pages.
 if match(r'mlaznic|patron[aeiu]|set nozeva|kos za|combisistem|vodj?ic.*tester|stativ za grejal|stalak giraffa',n) and not match(r'perac|pistolj|pumpa',n):return result('excluded','Potrošni materijal, rezervni deo ili dodatak za mašinu.')
 if has('/grejalice') and not has('/kaloriferi-industrijski'):
  if match(r'kotao|nazidn|kupatil|susa[cč]|susilic|peskir|viseca|stativ|stalak',n):return result('excluded','Grejno telo za stalnu ugradnju, kućni uređaj ili dodatak.')
  if match(r'industrij|\b(?:3|5|6|9|12|15|18|20|22|30)\s*kw|\b(?:3000|5000|6000|9000|12000|15000)\s*w',n):return result('included','Jači prenosni kalorifer/grejalica za privremeno grejanje radnog prostora.')
  if match(r'spolj|infracrven|halogen',n) and price>=10000:return result('review','Grejanje privremenog prostora: potvrditi prenosivost, nosače i tražnju.')
  return result('excluded','Mala kućna grejalica, van predloga zasebne rente radne opreme.')
 if match(r'filtersk.*vrec|papirn.*filter|filter.*vrec|hepa filter|kes[aeu] za usisivac|set.*visenamenskog pribora|pneumatsko crevo|noz.*kosilic|tocak.*kosilic|glava.*trimer|kljuc.*svecic|turpij|sablon.*ostr|trokraki noz|veznik|distancer|klin za|mrez.*ograda',n):return result('excluded','Potrošni materijal, rezervni deo ili sitan pribor.')
 # Clear standalone supplies, replacement parts and packaging.
 if match(r'\b(baterij[aeu]|akumulator|punjac|starter[ -]?kit|starter kit|power.x.change.*starter|punioc)\b',n) and not match(r'\b(busic|busil|odvrt|srafil|tester|brusil|pump|masin|kosilic|trimer|prskal|kompresor|set alata|alat u setu|fen|heftal|mixer|mesac|vibrator)',n):
  if has('/kleme-za-akumulatore-punjaci-starteri') and match(r'punjac|starter|booster',n):return result('review','Automobilski punjač/starter: proveriti kapacitet i opravdanost zasebnog najma.')
  return result('excluded','Baterija ili punjač; nabavna oprema uz aku mašinu, nije zaseban alat za rentu.')
 if has('/baterije-i-punjaci-za-akumulatorski-alat') and not match(r'\b(busil|tester|brusil|set alata)',n):return result('excluded','Baterija/punjač ili komplet baterija, bez radne mašine.')
 if match(r'\b(kes[aeu]|kesa|vrec[aeiu]|filter|filtersk|hepa|ekseri|municija|bitova|bitovi|burgija|burgij[aeu]|dijamantska.*ploca|rezna.*ploca|brusna.*ploca|list(?:ovi)? testere|kotacic|kota[čc]ic|spojk|spojnic|konektor|sijalic|sijalc|utikac|podsklop|podsklopovi|u[lt]je|oplatol|sidrena|anker|visilica|distancer|banda[zž]|folija|lepak|uniflott|ispunjivac|revizioni otvor|cip|cep cepko|noz za|nozevi za|glava za|glava trimera|rezervni|tocak za|lanac za|lanac testere|traka za|sajla za|ploca za|rem(en)? za|postolje za rucnu pumpu|crevo|crijevo)\b',n):
  if not match(r'\b(set rucnog alata|set alata|garnitura.*alata|masina|busilica|kompresor|usisivac|zabijac|izvlaka[cč]|izvla[kč]a[cč])\b',n):return result('excluded','Potrošni materijal, rezervni deo ili dodatak, bez samostalne radne funkcije.')
 if has('/delovi-i-ulja-za-motorne-masine-i-alate') and not match(r'\b(ostrac|masina|pumpa|brusilica|tester.*elektric|kosilica.*(?:w|kw))',n):return result('excluded','Rezervni deo/potrošni materijal iz kategorije delova motornih mašina.')
 if has('/oprema-za-pumpe-za-vodu') or has('/oprema-za-visenamenske-usisivace') or has('/oprema-za-perace-pod-pritiskom'):
  if not match(r'\b(usisivac|perac|pumpa)\b',n) or match(r'filter|garnitura|regulator|sklopka|presostat|korpa|nastavak|mlaznic|cev|cetk|kesa|crevo',n):return result('excluded','Pribor ili instalacioni deo uz mašinu.')
 if has('/okov-za-gradevinski-materijal') or has('/oprema-za-suvu-gradnju') or has('/oprema-za-zidanje'):
  if not match(r'podizac|dizalica|podupirac|masina|laser|mesalic|vibro',n):return result('excluded','Građevinski materijal, okov ili sitan pribor.')
 if has('/pribor-za-pneumatske-masine') and not match(r'\b(kompresor|busilica|odvijac|brusilica|heftalica|pistolj.*(?:farban|peskar|udar))\b',n):return result('excluded','Crevo, pripremna grupa, spojka ili sitan pribor kompresora.')
 if has('/elektromaterijal/'):
  if has('/motalice') and not match(r'prazna|kabal.box|\b10\s*m\b',n):return result('included','Kablovska motalica za radnu opremu i gradilište.')
  return result('excluded','Sitan električni/instalacioni pribor; ne uvodi se kao zaseban najam.')
 if has('/rasveta/'):
  if match(r'stalak|stativ|prenos|radn|punjiv|aku|gradjev|gradevin',n):return result('included','Prenosna radna rasveta.')
  return result('excluded','Reflektor za fiksnu ugradnju ili dekorativna rasveta.')
 if match(r'\b(bluetooth zvucnik|radio|zvucnik|kucne ljubimce|magnetni hvatac|kontrolno ogledalo|magnetna posuda|teleskopski magnetni|lampa.*usb|mini radna lampa|led svetiljka|led lampa 30)',n):return result('excluded','Sitan uređaj/pribor ili proizvod van radnog asortimana za rentu.')
 if match(r'\b(lanac|lanci|vodilica|sipka|makita papirna|traka|disk|cetka|dodatak|adapter|produzetak|nastavak|stezna glava|drzac|nosac|teflon)\b',n) and not match(r'vakuum|vakum|podizac|podupirac|masina|busilica|brusilica|tester|pumpa|varilica|pegla',n):return result('excluded','Dodatak/pribor uz alat, bez samostalne namene za najam.')
 if has('/ventilatori'):
  if match(r'plafonski|nazidni|zidni|usb|rucni|mini',n):return result('excluded','Fiksno ugrađen ventilator ili mali kućni uređaj.')
  if match(r'podni|air pro|brezza|55\s*l|260\s*w|rasprsivac|rasprisivac|rasprsivacem|rasprisivacem',n):return result('review','Prenosna ventilacija/rashlađivanje: potvrditi potrebu za najmom i kapacitet.')
  if match(r'einhell.*aku.*ventilator',n):return result('included','Aku ventilator za radni prostor.')
  return result('excluded','Standardni kućni ventilator, van predloga najma radne opreme.')
 if has('/plinsko-i-dizel-grejanje') or has('/kaloriferi-industrijski') or has('/pokretne-klime'):return result('included','Prenosno grejanje/hlađenje za privremene potrebe.')
 if has('/pumpe'):
  if match(r'tajmer|regulator|presostat|posuda|postolje|fontan|bunarska crna|rucna bunarska|pog(o|a)n na busilici',n):return result('excluded','Instalaciona/pomoćna oprema ili mali dodatak za pumpanje.')
  if match(r'dubinsk|bunarsk|monoblok|hidropak|hidrofor|visestepena|za povecanje pritiska|periferna',n):return result('review','Pumpa za instalaciju/bunar: proveriti uslove privremene montaže i primenu za rentu.')
  return result('included','Radna pumpa za odvodnjavanje, pretakanje ili navodnjavanje.')
 if has('/prskalice'):
  if match(r'aku|baterij|motor|benz|atomizer|\bsr\s*\d|fap16',n):return result('included','Motorna/aku prskalica ili atomizer.')
  if match(r'ledjn|ledn|12\s*l|16\s*l|20\s*l|sg 51',n):return result('review','Veća ručna leđna prskalica; proveriti ekonomiku i način čišćenja.')
  return result('excluded','Mala ručna prskalica, nije opravdan zaseban najam.')
 if has('/sezona/vino-i-rakija'):
  if match(r'cep cepko|cep\b|rucni.*zatvarac',n):return result('excluded','Potrošni čep ili sitan pribor.')
  if match(r'kazan|muljac|mlin|presa|pumpa',n):return result('included','Sezonska radna mašina za preradu/pretakanje.')
  return result('review','Sezonska oprema: potvrditi smisao zasebnog najma.')
 if has('/rucni-alat/'):
  if match(r'laser|daljinomer|detektor|merac vlage|termometar|termo.higrometar|amper|multimetar|tester napona',n):return result('included','Merni instrument za radove i dijagnostiku.')
  if match(r'stativ',n):return result('excluded','Stativ se razmatra uz merni instrument, nije zaseban alat.')
  if match(r'moment kljuc|nareznic|pertlov|savijanje cevi|vakuum|vakum|podizac|podupirac|spiral.*otpus|cistac cevi|pegla|varilica|ropump|reza[cč].*ploc|sekac.*velikog formata|masina za secenje|masina.*ploc|izvlaka[cč]|izvla[kč]a[cč]|radapciger|se[cč]enje armature',n):return result('included','Specijalizovan kompletan alat za povremene radove.')
  if has('/masine-za-secenje-plocica'):return result('included','Kompletna mašina/ručni rezač pločica.')
  if has('/bravarske-stege') and price>=5000:return result('review','Radionička stega: proveriti montažu i tražnju za najmom.')
  if ('setovi-alata' in leaf and match(r'set.*alat|garnitur.*alat|alat.*kofer|alat cr u torbici|set.*nasad|kljucevi nasadni.*kutij|set.*kljuc',n) and price>=10000):return result('review','Veći komplet ručnog alata; potvrditi ekonomiku i kontrolu kompletnosti.')
  return result('excluded','Sitan ručni alat ili mali set/pribor; izostavljen po zahtevu.')
 if has('/auto-oprema/'):
  if match(r'dizalica|podupirac|kompresor|refraktometar|izvlaka[cč]|ruski kljuc|punjac|starter|booster|perac|usisivac|masina',n):
   if match(r'\bcc ac\b|refraktometar',n):return result('review','Kompaktan auto uređaj; potvrditi opravdanost najma.')
   return result('included','Radna oprema za vozila, čišćenje ili podizanje.')
  return result('excluded','Sitan auto alat/pribor.')
 if has('/logisticka-oprema/'):
  if match(r'merdevin|skel|dizalic|paletar|kolica|podupirac',n):return result('included','Pristup visini, podizanje ili transport tereta.')
  return result('excluded','Dodatak ili sitan pribor logističke opreme.')
 if has('/gradevinska-oprema-i-alat'):
  if match(r'vibro|mesalic|motorna kolica|gradevinska.*kolica|poljoprivredna.*kolica|muta.*kolica',n):return result('included','Građevinska radna mašina ili transportna oprema.')
  if match(r'nogari',n):return result('review','Radni nogari; potvrditi paket ili zaseban najam.')
  return result('excluded','Građevinski pribor/potrošni materijal.')
 if match(r'stalak za rezanje drva',n):return result('review','Radni stalak: razmotriti kao komplet uz testeru.')
 if has('/radni-stolovi'):return result('review','Radni sto: proveriti sklopivost, transport i namenu najma.')
 if has('/boje-i-lakovi/'):
  if match(r'masina|pistolj.*farban|sekac.*velikog formata|vakum|vakuum|podizac',n):return result('included','Kompletan alat za obradu površina.')
  return result('excluded','Sitan molerski/keramičarski pribor.')
 if match(r'lemilic',n) and price<3000:return result('excluded','Mala lemilica; nije predlog za zaseban najam.')
 if match(r'usisivac.*(?:stapni|rucni|dcl180|easy vac)|gas 18v.*\b1\b',n):return result('review','Kompaktan usisivač; proveriti kapacitet i radnu namenu.')
 return result('included','Kompletan radni alat/mašina za povremeni najam.')

products=[]
for x in rows.values():
 x['categories'].sort(key=lambda u:(-urlparse(u).path.count('/'),u))
 x['sourceCategories']=[{'name':cats.get(u,{}).get('name',u),'url':u} for u in x['categories']]
 x['category']=x['sourceCategories'][0]['name']
 x['categoryUrl']=x['categories'][0]
 x['status'],x['reason']=classify(x)
 x['notes']=[]
 if match(r'\bsolo\b',norm(x['name'])):x['notes'].append('Solo: baterije/punjač nisu potvrđeni u pakovanju; nisu uključeni u obračun kompletnog seta.')
 if x['price'] is None or x['price']<100:x['notes'].append('Prodajna cena nedostaje ili je neuobičajeno niska: obavezna provera.')
 prices={o['price'] for o in x['observations'] if o['price'] is not None}
 if len(prices)>1:x['notes'].append('Različite cene na izvorima; prikazana poslednja zabeležena cena.')
 if x['status']!='excluded' and (x['price'] is None or x['price']<100):x['status']='review'
 products.append(x)
products.sort(key=lambda x:(norm(x['category']),norm(x['name']),x['id']))
(ROOT/'products-review.json').write_text(json.dumps({'source':'https://www.crafter.rs/','observedDate':'2026-10-12','imported':False,'products':products},ensure_ascii=False,indent=2))

# Verify every source category against its own displayed total.
coverage=[]
for cat in crawl['categories']:
 pages=[p for p in crawl['pages'] if p['categoryUrl']==cat['url']]
 seen_ids={x.get('productId') or x['url'] for p in pages for x in p['products']}
 expected=None
 for p in pages:
  m=re.search(r'od\s+(\d+)',p['amount']) or re.search(r'(\d+)\s+Rezultat',p['amount'],re.I)
  if m:expected=int(m[1]);break
 if expected is None and pages and all(p['empty'] for p in pages):expected=0
 coverage.append({**cat,'expectedProducts':expected,'capturedProducts':len(seen_ids),'pages':len(pages),'complete':expected==len(seen_ids) if expected is not None else False})
(ROOT/'coverage.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2))
summary={'source':'https://www.crafter.rs/','observedDate':'2026-10-12','imported':False,'products':len(products),'statusCounts':dict(Counter(x['status'] for x in products)),'categoriesCrawled':len(coverage),'pages':len(crawl['pages']),'coverageGaps':[{k:c[k] for k in ['name','url','expectedProducts','capturedProducts']} for c in coverage if not c['complete']]}
(ROOT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
print(json.dumps(summary,ensure_ascii=False,indent=2))
