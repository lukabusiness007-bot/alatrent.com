import json,re,html,urllib.request,urllib.parse,concurrent.futures
from pathlib import Path
C=json.loads(Path('research/product-photos/candidates.json').read_text());M={x['id']:x for x in json.loads(Path('research/product-photos/more-candidates.json').read_text())};V={x['id']:x for x in json.loads(Path('research/product-photos/vevor-candidates.json').read_text())}
sources={}
def setrow(i,entry,idx=0):
 m=entry['matches'][idx];sources[f'tool-{i:03}']={'page':entry['page'],**m}
chosen={4:0,7:0,11:0,13:1,14:0,15:0,18:0,19:0,21:7,22:1,23:1,24:1,26:0,27:1,30:0,31:2,32:7,33:0,34:0,35:0,36:0,38:0,39:1,40:1,41:2,42:0,43:0,44:0,46:7,47:0,48:0,49:1,51:0,53:4,55:0,56:0,57:0,58:0,61:2,63:11,67:1,68:0,70:5}
for i,j in chosen.items():setrow(i,C[i-1],j)
setrow(1,C[8],0)
for i,j in {16:7,25:1,28:1,29:0}.items():setrow(i,M[f'tool-{i:03}'],j)
setrow(52,M['tool-072'],0)
for i,j in {5:11,9:9}.items():setrow(i,V[f'tool-{i:03}'],j)
sources['tool-010']={'page':'https://www.vevor.com/s/ultrasonic-cleaner','source':html.unescape(re.search(r'https://img.vevorstatic.com/[^" ]+ultrasonic-cleaner-m100-1.2.jpg[^" ]*',Path('/tmp/vevor-cleaner.html').read_text()).group())}
direct=json.loads(Path('research/product-photos/direct-pages.json').read_text())
for i in [2,3,6]:
 s=Path(f'research/product-photos/direct-{i}.html').read_text();src=html.unescape(re.search(r'<meta property="og:image" content="([^"]+)',s).group(1)).replace('http://','https://')
 sources[f'tool-{i:03}']={'page':direct[str(i)],'source':src}
sources['tool-037']={'page':direct['37'],'source':'https://www.laegler.com/fileadmin/_processed_/f/4/csm_HUMMEL__2020-10-14_d7f68220e4.png'}
for file in ['direct-more.json','direct-last.json','direct-final.json','direct-extra.json','direct-heater.json','direct-detector.json']:
 p=Path('research/product-photos')/file
 if p.exists():
  for e in json.loads(p.read_text()):
   if e['sources']:sources[e['id']]={'page':e['page'],'source':e['sources'][0].replace('http://','https://')}
setrow(20,M['tool-020'],0)
sources['tool-060']['source']=next(x for x in json.loads(Path('research/product-photos/direct-more.json').read_text()) if x['id']=='tool-060')['sources'][1].replace('http://','https://')
# Persist approved source choices so imports are reproducible without search responses.
Path('research/product-photos/selected.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2))
print('Selected',len(sources),'Missing',[i for i in range(1,73) if f'tool-{i:03}' not in sources])
