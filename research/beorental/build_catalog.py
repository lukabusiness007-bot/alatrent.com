"""Normalize discovered equipment into a reviewable draft, preserving evidence."""
import html
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent

def plain(text):
    return ''.join(c for c in unicodedata.normalize('NFKD', text.lower()) if not unicodedata.combining(c)).replace('đ', 'dj')

# Editorial grouping, not claims about models, stock quantities or availability.
GROUPS = {
 'Čišćenje i pranje': [
  ('Perač pod pritiskom', r'pranje.pod.pritiskom'),
  ('Paročistač', r'parocistac'),
  ('Mašina za dubinsko pranje', r'masine.za.dubinsko.pranje|masina.za.dubinsko.pranje'),
  ('Industrijski usisivač', r'industrijskog.usisivaca|usisivaca.za.mokro.i.suvo'),
  ('Ciklonski separator za prašinu', r'ciklon.usisivaca|ciklon.odprasivac'),
  ('Set četki za šrafilicu', r'cetke.za.srafilicu'),
  ('Mašina za poliranje', r'masine.za.poliranje'),
  ('Motorna četka za velike površine', r'motorizovana.cetka|motorna.benzinska.cetka'),
  ('Mašina za čišćenje behatona', r'masine.za.ciscenje.behatona'),
  ('Ultrazvučna kada', r'ultrazvucne.kade'),
 ],
 'Isušivanje, vazduh i pumpe': [
  ('Odvlaživač / isušivač vazduha', r'odvlazivaca|profesionalni.isusivac|masine.za.izvlacenje.vlage'),
  ('Ozon generator', r'ozon.generatora'),
  ('Muljna / potopna pumpa', r'iznajmljivanje-pumpe-za-vodu-pumpa-za-izvlacenje-vode|pumpe.za.izbacivanje.viska.vode|pumpa.za.vodu.muljna.pumpa'),
  ('Pumpa za vodu do nultog nivoa', r'pumpa.za.vodu.za.isusivanje.prostorija.na.nulti.nivo|pumpe.za.vodu.na.nulti.nivo'),
  ('Benzinska pumpa za vodu', r'villiger.agm.benzinske.pumpe|benzinske.pumpe.zavodu'),
 ],
 'Bašta i dvorište': [
  ('Benzinska kosačica', r'benzinskih.kosilica|motorne.benzinske.kosilice|benzinske.kosilice'),
  ('Čeona grebenasta kosačica', r'ceone.grebenaste'),
  ('Benzinski trimer za travu', r'benzinskih.trimera|benzinskog.trimera.beograd'),
  ('Trimer za živu ogradu', r'trimera.za.zivu.ogradu'),
  ('Motorni bušač rupa za zemlju', r'busaca.za.rupe|motorni.busac.rupa'),
  ('Duvač / usisivač lišća', r'duvaca.*lisc|usisivaca.duvaca.za.lisce'),
  ('Seckalica za grane', r'seckalice.za.grane'),
 ],
 'Bušenje, rušenje i adaptacije': [
  ('Udarna čekić bušilica', r'iznajmljivanje-hilti-udarne|busilica-za-beton-iznajmljivanje'),
  ('Pikamer / štemerica', r'iznajmljivanje.pikamera'),
  ('Šlicerica za kanale u zidu', r'slicerice.za.secenje.zidova|slicerice.za.provlacenje'),
  ('Žirafa za brušenje zidova', r'iznajmljivanje.zirafe'),
  ('Brusilica za beton i zidove', r'brusilice.za.zidove.beton|profesionalne.brusilice.za.beton'),
  ('Mašina za krečenje', r'masine.za.krecenje'),
  ('Motorni sekač betona', r'masine.motorne.brusilice.za.secenje.betona|benzinskog.sekaca.za.beton'),
  ('Vibrator betona / vibro-igla', r'vibrator.betona'),
  ('Akumulatorska šrafilica', r'aku.srafilice|iznajmljivanje.srafilice'),
  ('Akumulatorski udarni odvijač', r'udarnog.odvijaca'),
 ],
 'Obrada drveta i parketa': [
  ('Ger testera za drvo i aluminijum', r'ger.za.drvo|ger.masine.za.drvo'),
  ('Multifunkcionalni alat / renovator', r'renovatora'),
  ('Sabljasta testera / lisičarka', r'lisicark'),
  ('Glodalica za drvo', r'frezer.glodalica.za.drvo'),
  ('Hoblerica za parket', r'hoblerice.za.parket'),
  ('Električno rende / ručna hoblerica', r'rucne.hoblerice|elektricno.rende'),
  ('Ubodna testera', r'ubodna.testera.iznajmljivanje'),
  ('Stoni cirkular', r'stacionarnog.stonog.cirkulara|stacionarne.stone.cirkularne'),
 ],
 'Metal, plastika i lemljenje': [
  ('Ger testera za metal', r'ger.poteznog.cirkulara.za.metal'),
  ('Aparat za varenje', r'aparata.za.varenje'),
  ('Ugaona brusilica', r'male.i.velike.brusilice'),
  ('Tocilo / oštrač', r'tocila.ostraca'),
  ('Indukcioni grejač za šrafove', r'indukcioni.grejac.za.srafove'),
  ('Pištolj za pop nitne', r'pistolja.za.pop.nitne'),
  ('Fen za vruć vazduh', r'pistolja.fena.za.vreli|pistolja.za.vruc.vazduh'),
  ('Lemilica', r'iznajmljivanje.lemilice'),
 ],
 'Keramika i vodovod': [
  ('Mašina za sečenje pločica', r'masina.za.secenje.keramickih|masine.za.keramiku.secenje'),
  ('Vibracioni pištolj za keramiku', r'vibracioni.pistolj.za.keramiku'),
  ('Mikser za lepak i boju', r'mikser.za.lepak'),
  ('Varilica za plastične vodovodne cevi', r'pegle.varilice.za.pvc'),
  ('Vodoinstalaterska klešta', r'kljesta.za.vodovod|klesta.za.vodovod'),
  ('Stega za cevi', r'stegu.za.cevi'),
 ],
 'Merenje i detekcija': [
  ('Laserski nivelator', r'laserskog.nivelatora'),
  ('Laserski daljinomer', r'laserskog.metra'),
  ('Endoskopska / inspekciona kamera', r'endoskop'),
  ('Termalna kamera', r'termalne.kamere'),
  ('Akustični detektor curenja vode', r'alata.za.detekciju.curenja.vode|akusticni.detektor.curenja'),
  ('Detektor metala', r'detektora.metal'),
  ('Detektor kablova i instalacija', r'detektora.kablova.u.zidu'),
 ],
 'Podizanje i transport': [
  ('Električna dizalica „vrabac“', r'dizalice.vrabac'),
  ('Hidraulična dizalica „krokodilka“', r'dizalice.krokodilke'),
  ('Teretna kolica za stepenice', r'teretnih.kolica'),
  ('Ručno vitlo', r'rucnog.vitla'),
  ('Podupirač / dizalica za gips ploče', r'podupiraca'),
 ],
 'Struja, kompresori i grejanje': [
  ('Agregat za struju', r'iznajmljivanje.agregata'),
  ('Vazdušni kompresor', r'iznajmljivanje.kompresora|vazdusnih.kompresora'),
  ('Produžni kablovi i motalice', r'produznih.kablova'),
  ('LED reflektor', r'led.reflektora'),
  ('Keramička grejalica', r'keramickih.grejalica'),
  ('Plinski top', r'grejalica.na.plin'),
 ]}

def main():
    source = json.loads((ROOT / 'source-pages.json').read_text())
    pages = [p for p in source['pages'] if p.get('status') == 200]
    items = []
    for category, rules in GROUPS.items():
        for name, pattern in rules:
            evidence = []
            for p in pages:
                if re.search(pattern, plain(p['url'] + ' ' + p['title'])):
                    evidence.append({'type': 'page', 'url': p['url'], 'title': p['title']})
            images = [i for i in source['homepage_image_evidence'] if re.search(pattern, plain(i['alt']))]
            if not evidence and images:
                evidence.append({'type': 'homepage_image_label', 'url': source['source'],
                                 'image_url_reference_only': images[0]['url'], 'label': images[0]['alt'][:240]})
            if not evidence:
                print('NO EVIDENCE:', name)
                continue
            items.append({'id': f'tool-{len(items)+1:03}', 'name': name, 'category': category,
                          'status': 'draft_needs_inventory_details', 'models': None, 'quantity': None,
                          'rental_price_rsd': None, 'deposit_rsd': None, 'availability': None,
                          'evidence': evidence})
    data = {'source': source['source'], 'retrieved_at': source['retrieved_at'],
            'market': 'Beograd i okolina', 'business_model': 'Iznajmljivanje sopstvene opreme; bez marketplace funkcija.',
            'note': 'Normalizovani tipovi opreme, ne pojedinačni modeli ili fizički primerci. Korisnik je naveo da ima iste alate. Cene, količine, modeli i dostupnost nisu potvrđeni. Nazivi sa slika imaju slabiji dokaz od zasebne stranice. Fotografije nisu preuzete za upotrebu na novom sajtu.',
            'items': items}
    (ROOT / 'catalog-draft.json').write_text(json.dumps(data, ensure_ascii=False, indent=2))
    esc = html.escape
    body = ''
    for cat in GROUPS:
        subset = [i for i in items if i['category'] == cat]
        body += f'<section><h2>{esc(cat)} <small>{len(subset)}</small></h2><div class="grid">'
        for i in subset:
            refs = ''.join(f'<a href="{esc(e["url"], quote=True)}" target="_blank" rel="noopener">Izvor {n+1}</a> ' for n,e in enumerate(i['evidence']))
            weak = i['evidence'][0]['type'] != 'page'
            body += f'<article data-search="{esc(plain(cat+" "+i["name"]), quote=True)}"><h3>{esc(i["name"])}</h3><p class="badge {"weak" if weak else ""}">{"Naziv uz sliku — proveriti" if weak else "Zasebna stranica izvora"}</p><p>{refs}</p><small>Model, količina, cena i depozit: nisu uneti</small></article>'
        body += '</div></section>'
    html_doc = '''<!doctype html><html lang="sr-Latn"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Radni katalog alata — Beograd</title><style>
*{box-sizing:border-box}body{font:16px/1.55 system-ui,sans-serif;background:#f4f5f2;color:#1c2823;margin:0}main{max-width:1200px;margin:auto;padding:36px 24px}header{background:#193e30;color:white;padding:30px;border-radius:18px}h1{font-size:36px;line-height:1.15;margin:8px 0 16px}header p{max-width:850px}h2{margin-top:36px;font-size:23px}h2 small{color:#60776a;font-size:16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}article{background:white;border:1px solid #dce3dd;border-radius:12px;padding:20px}h3{font-size:18px;line-height:1.35;margin:0 0 10px}.badge{font-size:12px;color:#276245;background:#e8f4e9;display:inline-block;padding:4px 8px;border-radius:5px}.weak{color:#805a12;background:#fff2d5}a{color:#21634d;margin-right:8px}small{color:#637069}input{font:inherit;width:100%;padding:14px;border:1px solid #a8b9ad;border-radius:10px;margin-top:24px}footer{margin:35px 0;color:#53645b}[hidden]{display:none!important}
</style><main><header><div>ISTRAŽIVANJE PONUDE · 10.10.2026.</div><h1>Radni katalog alata</h1><p>COUNT tipova opreme · CATEGORY_COUNT radnih kategorija · Beograd i okolina</p><p>Osnova za sajt za iznajmljivanje sopstvene opreme. Izvor: Beorental. Ponovljene stranice su objedinjene po tipu alata. Ovo nije evidencija modela, fizičkih primeraka ni trenutne dostupnosti.</p></header><input id="search" aria-label="Pretraži radni katalog" placeholder="Pretraži alat ili kategoriju…"><p>Cene i depoziti ostaju prazni do unosa tvojih uslova. Žuto su označene stavke pronađene preko naziva uz slike, bez potvrđene zasebne stranice.</p>BODY<footer>Fotografije nisu kopirane za novi sajt. Usluge, oglasi, medicinski aparati i shop artikli van alata nisu uključeni. Obuhvat: početna stranica i povezane javne stranice alata; nije garantovan kompletan popis sajta. JSON podaci: <a href="catalog-draft.json">katalog</a> · <a href="source-pages.json">izvori</a></footer></main><script>const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'dj');document.querySelector('#search').addEventListener('input',e=>{let q=norm(e.target.value);document.querySelectorAll('article').forEach(a=>a.hidden=!a.dataset.search.includes(q));document.querySelectorAll('section').forEach(s=>s.hidden=![...s.querySelectorAll('article')].some(a=>!a.hidden));});</script></html>'''
    (ROOT / 'catalog-review.html').write_text(html_doc.replace('CATEGORY_COUNT', str(len(GROUPS))).replace('COUNT', str(len(items))).replace('BODY', body))
    counts = Counter(i['category'] for i in items)
    print(json.dumps({'items': len(items), 'categories': counts, 'image_only': sum(i['evidence'][0]['type'] != 'page' for i in items), 'failed_pages': [p for p in source['pages'] if 'error' in p]}, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    main()
