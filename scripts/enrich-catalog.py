import json
from pathlib import Path
photos={p['id']:p['local'] for p in json.loads(Path('docs/product-photo-sources.json').read_text()) if 'local' in p}
assert len(photos)==72
prices=[1800,1500,2200,1500,800,500,1500,3500,3500,1800,2000,1800,1200,1500,2200,2500,3500,1800,1500,2500,1500,3500,1500,2500,2000,1800,2200,3000,4500,1800,1000,1200,2000,1000,1200,1500,4500,1200,1000,2500,2000,2500,1000,800,2500,800,700,500,2500,1000,1200,1500,500,500,1500,800,2000,3500,5000,2500,1800,2500,1500,1000,1200,2000,3500,2000,500,800,1000,2000]
assert len(prices)==72
presets={f'tool-{i+1:03}':{'price':p,'image':photos[f'tool-{i+1:03}']} for i,p in enumerate(prices)}
Path('lib/catalog-enrichment.json').write_text(json.dumps(presets,ensure_ascii=False,indent=2)+'\n')
seed=json.loads(Path('lib/seed.json').read_text())
for t in seed['tools']:t.update(presets[t['id']]);t['deposit']=0
Path('lib/seed.json').write_text(json.dumps(seed,ensure_ascii=False,indent=2)+'\n')
# Remove only obsolete catalog files produced by the earlier reference importer.
for p in Path('public/images/catalog').glob('tool-*'):
 if '/images/catalog/'+p.name not in photos.values():p.unlink()
print('Catalog ready: 72 photos, 72 prices, zero deposits.')
