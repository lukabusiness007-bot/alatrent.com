import json,urllib.request,urllib.parse,concurrent.futures,hashlib
from pathlib import Path
src=json.loads(Path('research/product-photos/selected.json').read_text())
previous={x['id']:x for x in json.loads(Path('docs/product-photo-sources.json').read_text()) if 'local' in x}
out=Path('public/images/catalog');out.mkdir(exist_ok=True,parents=True)
def f(v):
 id,x=v
 try:
  old=previous.get(id)
  if old and old['source']==x['source'] and Path('public'+old['local']).exists():return old
  x['source']=urllib.parse.quote(x['source'],safe=':/?&=%#')
  response=urllib.request.urlopen(urllib.request.Request(x['source'],headers={'User-Agent':'Mozilla/5.0'}),timeout=30);b=response.read()
  ext='jpg' if b[:3]==b'\xff\xd8\xff' else 'png' if b[:8]==b'\x89PNG\r\n\x1a\n' else 'webp' if b[:4]==b'RIFF' and b[8:12]==b'WEBP' else None
  if not ext:raise ValueError('Not an image '+str(response.status))
  # Only discard previous importer output for this exact catalog item.
  for p in out.glob(id+'.*'):p.unlink()
  p=out/(id+'.'+ext);p.write_bytes(b)
  return {'id':id,**x,'local':'/images/catalog/'+p.name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
 except Exception as e:return {'id':id,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:r=list(pool.map(f,src.items()))
Path('docs/product-photo-sources.json').write_text(json.dumps(r,ensure_ascii=False,indent=2))
print('Downloaded',sum('local' in x for x in r),'of',len(r))
for x in r:
 if 'error' in x:print(x)
