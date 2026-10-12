# -*- coding: utf-8 -*-
"""Import catalog photographs from the user-supplied reference; keep provenance."""
import json,sys,re,urllib.request,urllib.parse,concurrent.futures
from pathlib import Path
sys.path.insert(0,str(Path('research/beorental').resolve()))
from build_catalog import GROUPS,plain
source=json.loads(Path('research/beorental/source-pages.json').read_text())
patterns=dict(rule for group in GROUPS.values() for rule in group)
patterns.update({'Udarna čekić bušilica':r'hilti.ud arne|hilti.udarne','Hoblerica za parket':r'hoblerice.beograd','Tocilo / oštrač':r'tocila.tocilo','Mašina za sečenje pločica':r'masine.za.secenje.keramickih'})
items=json.loads(Path('research/beorental/catalog-draft.json').read_text())['items']
out=Path('public/images/catalog');out.mkdir(parents=True,exist_ok=True)
def fetch(item):
 candidates=[x for x in source['homepage_image_evidence'] if '/Iznajmljivanje_Alata/' in x['url'] and re.search(patterns[item['name']],plain(x['alt']+' '+urllib.parse.unquote(x['url'])))]
 if not candidates:return {'id':item['id'],'error':'No matching photo','name':item['name']}
 candidate=candidates[0]; url=candidate['url'];ext=Path(urllib.parse.unquote(urllib.parse.urlsplit(url).path)).suffix.lower()
 if ext not in ['.jpg','.jpeg','.png','.webp']:return {'id':item['id'],'error':'Unknown format'}
 target=out/(item['id']+ext)
 try:
  if not target.exists():
   req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
   with urllib.request.urlopen(req,timeout=35) as response:
    if not response.headers.get('content-type','').startswith('image/'):raise ValueError('Not an image')
    target.write_bytes(response.read())
  return {'id':item['id'],'name':item['name'],'image':'/'+str(target.relative_to('public')),'source':url,'sourcePage':'https://beorental.com/','alt':candidate['alt'],'bytes':target.stat().st_size}
 except Exception as e:return {'id':item['id'],'name':item['name'],'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(fetch,items))
Path('docs/product-photo-sources.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print(json.dumps({'downloaded':sum('image'in r for r in results),'errors':[r for r in results if 'error'in r]},ensure_ascii=False))
