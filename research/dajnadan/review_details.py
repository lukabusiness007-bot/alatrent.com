"""Cache selected public listing descriptions temporarily for classification."""
import json,re,tempfile,time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request,urlopen
ROOT=Path(__file__).resolve().parent
OUT=Path(tempfile.mkdtemp(prefix='dajnadan-review-'))
items=json.loads((ROOT/'source-listings.json').read_text())['items']
words=['Pistolj za gipsare','Wolf Garthen','Sušilica za košuljicu','Vakum pumpa','Tenge Rent -','Glodalica','Gips rotacija','Malčer za krčenje','Najam/Iznajmljivanje Stona testera /','Najam/Iznajmljivanje Stona testera za drvo','Iznajmljivanje hoblarice','Najam/Iznajmljivanje Hidraulični','aku udarna busilica i srafilica']
selected=[i for i in items if any(w.lower() in i['title'].lower() for w in words)]
def fetch(i):
 try:
  s=urlopen(Request(i['url'],headers={'User-Agent':'Mozilla/5.0'}),timeout=30).read().decode()
  for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>',s):
   d=json.loads(m)
   if d.get('@type')=='Product':
    row={**i,'description':d.get('description',''),'image':d.get('image',[])}
    time.sleep(.2);return row
 except Exception as e:return {**i,'error':str(e)}
with ThreadPoolExecutor(max_workers=2) as pool:rows=list(pool.map(fetch,selected))
(OUT/'details.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
print(OUT)
for i in rows: print(i['title'],'\n',i.get('description',i.get('error')), '\n')
