# -*- coding: utf-8 -*-
import json,urllib.request,urllib.parse,re,html,concurrent.futures
from pathlib import Path
queries='perač|paročistač|ekstraktor|industrijski usisivač|ciklon|četke za čišćenje|polirka|motorna četka|čistač|ultrazvučn|odvlaživač|ozon|potapajuća pumpa|potapajuća pumpa|motorna pumpa|benzinska kosačica|strižna kosačica|motorni trimer|trimer za živu ogradu|bušač rupa|duvač|seckalica|bušilica za beton|čekić za rušenje|glodalica za žlebove|brusilica za zid|brusilica za beton|pištolj za farbanje|sekač betona|vibrator za beton|DDF|udarni odvijač|potezna testera|multifunkcionalni alat|sabljasta testera|glodalica|brusilica za parket|rende|ubodna testera|stona testera|testera za metal|aparat za zavarivanje|ugaona brusilica|stona brusilica|indukcioni|zakiv|fen|lemilica|rezač pločica|vibracion|mešač|varenje cevi|papagaj|stege za cevi|laser|daljinomer|inspekcijska kamera|termovizijska|curenja|detektor metala|detektor|dizalica|hidraulična|kolica|vitlo|podizač|agregat|kompresor|kabl|reflektor|grejalica|gasni'.split('|')
assert len(queries)==72
cache=Path('research/product-photos');cache.mkdir(exist_ok=True,parents=True)
def fetch(pair):
 i,q=pair;url='https://www.alatshop.rs/opsta_pretraga?'+urllib.parse.urlencode({'tekst':q})
 try:
  p=cache/f'tool-{i+1:03}.html'
  if p.exists():s=p.read_text()
  else:s=urllib.request.urlopen(url,timeout=25).read().decode('utf8','replace');p.write_text(s)
  matches=[]
  for tag in re.findall(r'<img[^>]*class="as-product-image"[^>]*>',s):
   attrs=dict(re.findall(r'(\w+)="([^"]*)"',tag));matches.append({'source':urllib.parse.urljoin(url,html.unescape(attrs['src'])),'alt':html.unescape(attrs['alt'])})
  return {'id':f'tool-{i+1:03}','query':q,'page':url,'matches':matches}
 except Exception as e:return {'id':f'tool-{i+1:03}','query':q,'error':str(e),'matches':[]}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:r=list(pool.map(fetch,enumerate(queries)))
Path('research/product-photos/candidates.json').write_text(json.dumps(r,ensure_ascii=False,indent=2))
for x in r:print(x['id'],x['query'],len(x['matches']), ' | '.join(i['alt'] for i in x['matches'][:3]))
