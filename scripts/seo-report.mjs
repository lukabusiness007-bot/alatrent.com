import { readFileSync, writeFileSync } from 'node:fs';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const seed = read('../lib/seed.json');
const content = read('../lib/seo-catalog.json');
const activeTools = seed.tools.filter(tool => tool.published);
const plain = text => text.replace(/đ/g, 'dj').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const tools = activeTools.map(tool => {
  const entry = content[tool.slug];
  if (!entry) throw new Error('Missing SEO content: ' + tool.slug);
  return {
    name: tool.name.sr, path: '/sr/alat/' + tool.slug,
    categoryPath: '/sr/kategorija/' + seed.categories.find(category => category.id === tool.categoryId).slug,
    primary: `iznajmljivanje ${entry.term} Beograd`,
    secondary: [`najam ${entry.term}`, `rentiranje ${entry.term}`, `${entry.term} cena po danu`, ...entry.aliases.map(alias => alias + ' iznajmljivanje')],
    ascii: plain(`iznajmljivanje ${entry.term} Beograd`),
    intent: 'Najam konkretne vrste alata; poređenje primene, cene i uslova.',
    use: entry.use, selection: entry.selection,
  };
});
const report = {
  scope: `${activeTools.length} objavljenih artikala sa frazama prema vrsti alata i nameni; fokus na srpski jezik. Marka i model su dodatni detalji. Bez procena obima pretrage ili tvrdnji o pozicijama.`,
  deliveryArea: 'Isključivo administrativna teritorija grada Beograda, uključujući Obrenovac, Sremčicu i Železnik.',
  strategy: 'Jedan indeksabilan URL po vrsti ili konkretnom modelu i jeziku. Modeli imaju stabilan ID izvora, sopstvenu stranicu i naziv. Sinonimi, latinica bez dijakritike i ćirilica ne stvaraju nove URL-ove. Stranice paginacije imaju sopstveni canonical; filteri i sortiranje su noindex.',
  tools,
};
writeFileSync(new URL('../docs/seo-keywords.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
writeFileSync(new URL('../docs/seo-keywords.md', import.meta.url), `# Mapa ključnih fraza za katalog\n\n${report.scope}\n\n${report.deliveryArea}\n\n${report.strategy}\n\nPredlozi fraza zasnovani su na sadržaju kataloga i nameri korisnika. Obim pretrage nije meren. Ove fraze služe za mapiranje sadržaja, nisu skriveni meta keywords.\n\n| Alat | Primarna fraza | Dodatni nazivi | Stranica |\n| --- | --- | --- | --- |\n${tools.map(tool => `| ${tool.name} | ${tool.primary} | ${content[tool.path.split('/').at(-1)].aliases.join(', ')} | ${tool.path} |`).join('\n')}\n`);
console.log(`SEO mapping generated for ${tools.length} tools across ${seed.categories.length} categories.`);
