import json,urllib.request,re,concurrent.futures,html
from pathlib import Path
urls={12:'https://www.ozongenerator.rs/ozonizator-sa-jonizatorom-cl-c08a',17:'https://alko-garden.uk/garden-tools/lawn-care/scythe-mowers/solo-by-al-ko-premium-bm-5001-r-iv-petrol-scythe-mower-102cm-cut.html',45:'https://www.sealey.co.uk/induction-heater-1000w-vs240/',50:'https://www.svezamajstore.rs/vibracioni-vakumski-pistolj-za-plocice-20v-solo-bormann-pro-bbp3250.html',60:'https://alitako.com/products/metal-detektor-md-3010',62:'https://www.einhell.rs/en/p/2255130-tc-eh-250/',65:'https://www.einhell.rs/en/p/2260160-tc-wi-500/',71:'https://www.eurovik.rs/prosto-ptc-prenosna-grejalica-2000w'}
def f(pair):
 i,u=pair
 try:
  s=urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'}),timeout=25).read().decode();Path(f'research/product-photos/direct-{i}.html').write_text(s)
  matches=[]
  for t in re.findall(r'<meta[^>]+>',s):
   a=dict(re.findall(r'([\w:]+)=[\"\x27]([^\"\x27]+)',t))
   if a.get('property') in ['og:image','og:image:secure_url'] and a.get('content'):matches.append(html.unescape(a['content']))
  return {'id':f'tool-{i:03}','page':u,'sources':matches}
 except Exception as e:return {'id':f'tool-{i:03}','page':u,'error':str(e),'sources':[]}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as p:r=list(p.map(f,urls.items()))
Path('research/product-photos/direct-more.json').write_text(json.dumps(r,ensure_ascii=False,indent=2))
for x in r:print(x)
