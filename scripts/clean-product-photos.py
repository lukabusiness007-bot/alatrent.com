import json,urllib.request,urllib.parse,re,html,concurrent.futures
from pathlib import Path
queries={2:'steam-cleaner',3:'carpet-extractor',5:'cyclone-dust-separator',6:'drill-brush',8:'power-sweeper',9:'pressure-washer-surface-cleaner',10:'ultrasonic-cleaner',12:'ozone-generator',16:'gas-lawn-mower',17:'sickle-bar-mower',20:'earth-auger',25:'wall-chaser',28:'airless-paint-sprayer',29:'gas-concrete-saw',37:'drum-floor-sander',45:'induction-heater',50:'tile-vibrator',52:'pipe-fusion-welder',54:'pipe-vise',59:'water-leak-detector',60:'metal-detector',62:'electric-hoist',64:'stair-climbing-cart',65:'hand-winch',66:'drywall-lift',69:'extension-cord-reel',71:'ceramic-heater',72:'propane-heater'}
cache=Path('research/product-photos')
def fetch(pair):
 i,q=pair;url='https://www.vevor.com/s/'+q;p=cache/f'vevor-{i:03}.html'
 try:
  if p.exists() and p.stat().st_size>0:s=p.read_text()
  else:s=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=40).read().decode('utf8','replace');p.write_text(s)
  matches=[];seen=set()
  for tag in re.findall(r'<img[^>]+>',s):
   attrs=dict(re.findall(r'([\w-]+)="([^"]*)"',tag));src=html.unescape(attrs.get('data-lazy') or attrs.get('src',''))
   if 'goods_img' not in src or '-m100-1.' not in src or src in seen:continue
   seen.add(src);matches.append({'source':src,'alt':html.unescape(attrs.get('alt',''))})
  return {'id':f'tool-{i:03}','query':q,'page':url,'matches':matches}
 except Exception as e:return {'id':f'tool-{i:03}','error':str(e),'matches':[]}
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:r=list(pool.map(fetch,queries.items()))
(cache/'vevor-candidates.json').write_text(json.dumps(r,ensure_ascii=False,indent=2))
for x in r:
 print(x['id'],len(x['matches']),x.get('error',''))
 for j,m in enumerate(x['matches'][:6]):print(j,urllib.parse.unquote(m['source']).split('/')[-1].split('?')[0])
