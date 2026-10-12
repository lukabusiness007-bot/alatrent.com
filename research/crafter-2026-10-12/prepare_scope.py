import json
from pathlib import Path
from urllib.parse import urlparse
ROOT=Path(__file__).parent
cats=json.loads((ROOT/'categories-menu.json').read_text())
paths={urlparse(c['url']).path:c for c in cats}
branches=[
'/alati-i-masine/masine',
'/alati-i-masine/zavarivanje/aparati-za-zavarivanje',
'/alati-i-masine/rucni-alat/merenje-i-obelezavanje/laserska-merna-tehinika',
'/alati-i-masine/rucni-alat/merenje-i-obelezavanje/unimeri',
'/alati-i-masine/rucni-alat/setovi-alata',
'/alati-i-masine/rucni-alat/alati-za-vodoinstalatere-i-keramicare',
'/alati-i-masine/rucni-alat/klesta/klesta-za-secenje-armature',
'/alati-i-masine/rucni-alat/klesta/klesta-za-krimpovanje-i-blankiranje',
'/alati-i-masine/rucni-alat/kljucevi/specijalni-kljucevi',
'/alati-i-masine/rucni-alat/rucni-alat-ostalo/radapcigeri',
'/alati-i-masine/rucni-alat/rucni-alat-ostalo/hvataci-i-drzaci',
'/alati-i-masine/rucni-alat/stege/bravarske-stege',
'/alati-i-masine/odlaganje-i-radni-stolovi/radni-stolovi',
'/basta-i-sezona/rad-u-basti/motorne-masine-i-alati',
'/basta-i-sezona/rad-u-basti/prskalice',
'/basta-i-sezona/rad-u-basti/pumpe',
'/basta-i-sezona/sezona/vino-i-rakija/cepilice',
'/basta-i-sezona/sezona/vino-i-rakija/muljace-i-secke-za-voce',
'/basta-i-sezona/sezona/vino-i-rakija/mlinovi-i-prese',
'/basta-i-sezona/sezona/vino-i-rakija/kazani',
'/basta-i-sezona/sezona/vino-i-rakija/pumpe-za-pretakanje',
'/grejanje-i-klimatizacija/klima-uredjaji/pokretne-klime',
'/grejanje-i-klimatizacija/elektricno-grejanje/grejalice/kaloriferi-industrijski',
'/grejanje-i-klimatizacija/plinsko-i-dizel-grejanje',
'/grejanje-i-klimatizacija/ventilatori',
'/rasveta/tehnicka-rasveta/reflektori',
'/elektromaterijal/produzni-kablovi-i-prikljucni-pribor',
'/auto-oprema/akumulatori/kleme-za-akumulatore-punjaci-starteri',
'/auto-oprema/visenamenski-usisivaci-i-oprema',
'/auto-oprema/peraci-i-oprema',
'/auto-oprema/auto-elektrika-rasveta-i-alat/alat-i-pribor-za-vozila',
'/auto-oprema/auto-elektrika-rasveta-i-alat/auto-pumpe-i-meraci-pritiska-nastavci',
'/mali-kucni-aparati/ciscenje/parocistaci',
'/mali-kucni-aparati/ciscenje/usisivaci/usisivaci-na-vodu',
'/logisticka-oprema/kolica-za-teret-i-elektricne-dizalice',
'/logisticka-oprema/merdevine-i-skele',
'/gradevinski-materijali/gradevinska-oprema-i-alat',
'/gradevinski-materijali/grubi-gradevinski-materijal-drvo-i-grada/suva-gradnja/oprema-za-suvu-gradnju',
'/gradevinski-materijali/grubi-gradevinski-materijal-drvo-i-grada/proizvodi-za-zidanje/oprema-za-zidanje',
'/boje-i-lakovi/alat-i-pribor-za-boje-i-lakove/keramicarski-alat-i-pribor',
'/boje-i-lakovi/alat-i-pribor-za-boje-i-lakove/pribor-za-krecenje-i-farbanje',
]
selected=[]; audit=[]
for path,c in paths.items():
 matched=next((b for b in branches if path==b or path.startswith(b+'/')),None)
 children=any(p.startswith(path+'/') for p in paths)
 if matched and not children:
  row={**c,'path':path,'branch':matched,'hierarchy':[paths['/'+ '/'.join(path.strip('/').split('/')[:i])]['name'] for i in range(1,len(path.strip('/').split('/'))+1) if '/'+ '/'.join(path.strip('/').split('/')[:i]) in paths]}
  selected.append(row)
 status='candidate' if matched and not children else 'covered-by-subcategories' if matched else 'outside-rental-scope'
 audit.append({**c,'status':status,'reason':'Pregled proizvoda za rentu' if status=='candidate' else 'Obuhvaćeno pregledom potkategorija' if matched else 'Potrošni materijal, sitan ručni pribor, delovi, instalacioni proizvodi ili roba van opsega najma radne opreme'})
(ROOT/'scope.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2))
(ROOT/'category-scope-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2))
print('Candidate leaf categories:',len(selected))
for c in selected:print(c['name'],'|',c['path'])
print('Missing branches:',[b for b in branches if b not in paths])
