import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import sharp from 'sharp';

const dir = mkdtempSync(join(tmpdir(), 'rent-seo-test-'));
const base = 'http://127.0.0.1:3014';
const origin = 'https://seo.example';
const seed = JSON.parse(readFileSync(new URL('../lib/seed.json', import.meta.url)));
const reduction = JSON.parse(readFileSync(new URL('../lib/catalog-reduction.json', import.meta.url)));
const active = seed.tools.filter(t=>t.published);
const selectedSlug = old => {const e=reduction.entries.find(e=>e.slug===old);return e?.replacementId?seed.tools.find(t=>t.id===e.replacementId).slug:old;};
const content = JSON.parse(readFileSync(new URL('../lib/seo-catalog.json', import.meta.url)));
const locales = ['sr', 'en', 'ru', 'tr', 'zh'];
const publishedGuides = JSON.parse(readFileSync(new URL('../lib/published-rental-guides.json', import.meta.url))).filter(guide => guide.status === 'published');
let child, db, logs = '';
const get = async path => {
  const response = await fetch(base + path, { headers: { 'User-Agent': 'Googlebot' } });
  return { response, html: await response.text() };
};
const read = (kind, id) => JSON.parse(db.prepare('SELECT value FROM entities WHERE kind=? AND id=?').get(kind, id).value);
const write = (kind, id, value) => db.prepare('UPDATE entities SET value=? WHERE kind=? AND id=?').run(JSON.stringify(value), kind, id);
const jsonLd = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(match => {
  const data = JSON.parse(match[1]); return data['@graph'] || [data];
});
const tag = (html, name) => html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`))?.[1];
const canonical = html => html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
before(async () => {
  child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3014'], {
    env: { ...process.env, POSTGRES_URL: '', DATABASE_URL: '', POSTGRES_PRISMA_URL: '', DATA_DIR: dir, SITE_URL: origin + '/', GOOGLE_SITE_VERIFICATION: 'seo-test-verification' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', x => logs += x); child.stderr.on('data', x => logs += x);
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      if ((await get('/sr')).response.status === 200) { db = new DatabaseSync(join(dir, 'rent-tools.sqlite')); return; }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(logs);
});
after(async () => {
  db?.close();
  if (child && child.exitCode === null) { const exited = new Promise(resolve => child.once('exit', resolve)); child.kill('SIGTERM'); await exited; }
  rmSync(dir, { recursive: true, force: true });
});

test('Every seeded tool has specific search intent, useful copy and an existing category', () => {
  assert.equal(Object.keys(content).length, seed.tools.length);
  const uses = new Set();
  for (const tool of seed.tools) {
    const entry = content[tool.slug];
    assert.ok(entry?.term && entry.aliases.length > 0 && entry.use.length > 60 && entry.selection.length > 60, tool.slug);
    uses.add(entry.use);
    assert.ok(seed.categories.some(category => category.id === tool.categoryId));
  }
  assert.equal(uses.size, seed.tools.length);
});

test('Home page search appearance uses the preferred business name, concise copy and crawlable icon', async () => {
  const response = await fetch(base, { headers: { 'User-Agent': 'Googlebot' } });
  assert.equal(response.status, 200);
  assert.equal(response.url, base + '/sr');
  const html = await response.text();
  assert.match(html, /<title>Alat Rent — Iznajmljivanje alata u Beogradu<\/title>/);
  assert.equal(tag(html, 'description'), 'Iznajmite alate i mašine u Beogradu: bušilice, pikamere, žirafe i opremu za dubinsko pranje. Pogledajte dnevne cene i dogovorite dostavu.');
  assert.ok(tag(html, 'description').length <= 175);
  assert.ok(!tag(html, 'description').endsWith('…'));
  assert.match(html, /<meta property="og:site_name" content="Alat Rent"/);
  const nodes = jsonLd(html);
  assert.equal(nodes.find(n => n['@type'] === 'WebSite').name, 'Alat Rent');
  assert.equal(nodes.find(n => n['@type'] === 'WebSite').url, origin + '/');
  assert.equal(nodes.find(n => n['@type'] === 'Organization').name, 'Alat Rent');
  const iconUrl = html.match(/<link rel="icon" href="([^"]*favicon\.png)"/)?.[1];
  assert.equal(iconUrl, '/favicon.png');
  assert.equal((await fetch(base + iconUrl, { headers: { 'User-Agent': 'Googlebot-Image' } })).status, 200);
  const original = read('settings', 'main');
  try {
    write('settings', 'main', { ...original, brand: 'Poseban naziv' });
    const custom = (await get('/sr')).html;
    assert.match(custom, /<title>Poseban naziv — Iznajmljivanje alata u Beogradu<\/title>/);
    assert.equal(jsonLd(custom).find(n => n['@type'] === 'WebSite').name, 'Poseban naziv');
  } finally { write('settings', 'main', original); }
});

test('Search crawlers get raster favicons, a business logo and complete preview image metadata', async () => {
  for (const locale of locales) {
    const { html } = await get('/' + locale);
    const icons = html.match(/<link rel="(?:icon|shortcut icon|apple-touch-icon)"[^>]*>/g)?.join('\n') || '';
    assert.match(icons, /<link rel="icon" href="\/favicon\.ico(?:\?[^"]*)?"/);
    assert.match(icons, /<link rel="icon" href="\/favicon\.png"[^>]*sizes="96x96"/);
    assert.match(icons, /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png"[^>]*sizes="180x180"/);
    const business = jsonLd(html).find(node => node['@type'] === 'Organization');
    assert.equal(business.logo.url, origin + '/images/brand-logo.png');
    assert.equal(business.logo.width, 512);
    assert.equal(business.logo.height, 512);
    assert.equal(business.image, origin + '/images/equipment-hero.png');
    assert.match(html, /<meta property="og:image:width" content="1536"/);
    assert.match(html, /<meta property="og:image:height" content="1024"/);
    assert.match(html, /<meta property="og:image:type" content="image\/png"/);
    assert.equal(tag(html, 'twitter:image'), business.image);
  }
  for (const [path, size] of [['/favicon.png', 96], ['/apple-touch-icon.png', 180], ['/images/brand-logo.png', 512]]) {
    const response = await fetch(base + path, { headers: { 'User-Agent': 'Googlebot-Image' } });
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), /image\/png/);
    const info = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
    assert.equal(info.width, size);
    assert.equal(info.height, size);
  }
  const favicon = await fetch(base + '/favicon.ico');
  assert.equal(favicon.status, 200);
  assert.match(favicon.headers.get('content-type'), /image\/(?:x-icon|vnd.microsoft.icon)/);
  const ico = Buffer.from(await favicon.arrayBuffer());
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 4);
  for (let i = 0; i < 4; i++) {
    const entry = 6 + i * 16;
    const offset = ico.readUInt32LE(entry + 12);
    const length = ico.readUInt32LE(entry + 8);
    const info = await sharp(ico.subarray(offset, offset + length)).metadata();
    assert.equal(info.width, [16, 32, 48, 96][i]);
    assert.equal(info.height, info.width);
  }
  assert.match(tag((await get('/admin')).html, 'robots'), /noindex/);
  assert.match((await get('/sr/nalog')).html, /href="\/favicon\.png"/);
});

test('Crawl every sitemap URL: 200, one H1, unique metadata, canonical, reciprocal hreflang and parseable JSON-LD', async () => {
  const { html: xml } = await get('/sitemap.xml');
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.equal(urls.length, (6 + active.length + seed.categories.length) * locales.length + 6 + publishedGuides.filter(guide => !guide.replacesLegacy).length);
  assert.equal(new Set(urls).size, urls.length);
  assert.match(xml, /hreflang="x-default"/);
  assert.match(xml, /<image:loc>https:\/\/seo.example\/images\/catalog\//);
  assert.ok(!/\/uputstvo\/|\/nalog|\/najam\/|\/korpa|\/privatnost|\/admin/.test(xml));
  const titles = new Set(), descriptions = new Set();
  for (let offset = 0; offset < urls.length; offset += 5) {
    const results = await Promise.all(urls.slice(offset, offset + 5).map(async url => ({ url, ...await get(new URL(url).pathname) })));
    for (const { url, html, response } of results) {
      assert.equal(response.status, 200, url);
      assert.equal(canonical(html), url, url);
      assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, url);
      assert.ok(!tag(html, 'robots')?.includes('noindex'), url);
      assert.equal((html.match(/rel="alternate" hrefLang=/g) || []).length, url.includes('/saveti') ? 2 : 6, url);
      assert.equal(tag(html, 'google-site-verification'), 'seo-test-verification');
      const title = html.match(/<title>(.*?)<\/title>/)?.[1];
      const description = tag(html, 'description');
      assert.ok(title && description, url);
      assert.ok(!titles.has(title), `Duplicate title: ${url}: ${title}`);
      assert.ok(!descriptions.has(description), `Duplicate description: ${url}: ${description}`);
      titles.add(title); descriptions.add(description);
      const nodes = jsonLd(html);
      assert.ok(nodes.some(node => node['@type'] === 'Organization'), url);
      if (url.includes('/alat/')) {
        const service = nodes.find(node => node['@type'] === 'Service');
        assert.equal(service?.url, url);
        assert.equal(service.areaServed.name, 'Grad Beograd, Srbija');
        assert.equal(service.offers, undefined, 'Indicative rates must not be presented as confirmed offers');
        assert.equal(service.aggregateRating, undefined);
        assert.ok(nodes.some(node => node['@type'] === 'BreadcrumbList'));
        const image = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
        assert.equal(image, service.image || origin + '/images/equipment-hero.png');
        if (url.startsWith(origin + '/sr/')) {
          const slug = new URL(url).pathname.split('/').at(-1);
          assert.equal(service.name, 'Iznajmljivanje ' + content[slug].term);
          assert.ok(!/^Iznajmljivanje modela\s/.test(service.name), url);
          const tool = active.find(t => t.slug === slug);
          if (tool?.catalogModel) assert.ok(html.includes('<h2>Model iz kataloga</h2>'), url);
        }
      }
    }
  }
});

test('Confirmed business phone is consistent in contact links and structured data', async () => {
  for (const locale of locales) {
    const { html } = await get('/' + locale + '/kontakt');
    assert.ok(html.includes('062 9751270'));
    assert.ok(html.includes('href="tel:+381629751270"'));
    assert.ok(html.includes('href="https://wa.me/381629751270"'));
    assert.ok(html.includes('href="viber://chat?number=%2B381629751270"'));
    assert.equal(jsonLd(html).find(node => node['@type'] === 'Organization').telephone, '+381629751270');
    assert.ok(!html.includes('href="tel:+381601234567"'));
  }
});

test('Search phrases drive the page, FAQ and catalog while the specific model stays visible', async () => {
  const tool = active.find(t => t.id === 'crafter-755');
  const { html } = await get('/sr/alat/' + tool.slug);
  assert.match(html, /<h1>Iznajmljivanje ravne brusilice \(bijaksa\)<\/h1>/);
  assert.match(html, /<title>Iznajmljivanje ravne brusilice \(bijaksa\) — Beograd/);
  assert.ok(html.includes('Koliko košta najam ravne brusilice (bijaksa)?'));
  assert.ok(html.includes('<h2>Model iz kataloga</h2><p>Makita brusilica ravna GD0601</p>'));
  assert.ok(html.includes('Ravna brusilica, poznata i kao bijaks'));
  for (const query of ['iznajmljivanje ravne brusilice', 'najam bijaksa', 'rentiranje ravne brusilice', 'GD0601']) {
    assert.ok((await get('/sr/katalog?q=' + encodeURIComponent(query))).html.includes('href="/sr/alat/' + tool.slug + '"'), query);
  }
  const original = read('tools', tool.id);
  try {
    write('tools', tool.id, { ...original, name: { ...original.name, sr: 'Naša posebna ravna brusilica' }, description: { ...original.description, sr: 'Poseban opis koji čuvamo iz administratora.' } });
    const custom = (await get('/sr/alat/' + tool.slug)).html;
    const service = jsonLd(custom).find(node => node['@type'] === 'Service');
    assert.equal(service.name, 'Iznajmljivanje Naša posebna ravna brusilica');
    assert.equal(service.description, 'Poseban opis koji čuvamo iz administratora.');
  } finally { write('tools', tool.id, original); }
});

test('Private, filtered, empty and operational pages stay out of the index; unknown paths return 404', async () => {
  for (const path of ['/sr/nalog?claim=secret', '/en/korpa', '/sr/privatnost', '/sr/katalog?q=zirafa', '/sr/katalog?sort=price', '/sr/uputstvo/' + active[0].slug]) {
    const { html, response } = await get(path);
    assert.equal(response.status, 200, path);
    assert.match(tag(html, 'robots'), /noindex/, path);
    assert.ok(!canonical(html).includes('?'), path);
    assert.ok(!html.includes('rel="alternate" hrefLang='), path);
  }
  for (const path of ['/sr/kategorija/no-such-category', '/sr/alat/missing', '/sr/katalog/extra', '/sr/alat/' + active[0].slug + '/extra', '/xx', '/sr/najam/' + '0'.repeat(64)])
    assert.equal((await get(path)).response.status, 404, path);
  const tool = active[0]; const original = read('tools', tool.id);
  try {
    write('tools', tool.id, { ...original, published: false });
    assert.equal((await get('/sr/alat/' + tool.slug)).response.status, 404);
    assert.ok(!(await get('/sitemap.xml')).html.includes('/alat/' + tool.slug));
  } finally { write('tools', tool.id, original); }
  const category = { id: 'seo-empty', slug: 'seo-empty', name: { sr: 'Prazno', en: 'Empty', ru: 'Пусто', tr: 'Boş', zh: '空' }, published: true, icon: '0' };
  db.prepare('INSERT INTO entities(kind,id,value) VALUES(?,?,?)').run('categories', category.id, JSON.stringify(category));
  try {
    assert.match(tag((await get('/sr/kategorija/seo-empty')).html, 'robots'), /noindex/);
    assert.ok(!(await get('/sitemap.xml')).html.includes('/kategorija/seo-empty'));
  } finally { db.prepare('DELETE FROM entities WHERE kind=? AND id=?').run('categories', category.id); }
});

test('Expanded catalog paginates with crawlable links, own canonical URLs and a complete result count', async () => {
  const first = await get('/sr/katalog');
  const second = await get('/sr/katalog?page=2');
  assert.equal(first.response.status, 200);
  assert.equal(second.response.status, 200);
  assert.equal(canonical(second.html), origin + '/sr/katalog?page=2');
  assert.ok(!tag(second.html, 'robots').includes('noindex'));
  assert.match(second.html, /href="\/sr\/katalog\?page=3"/);
  const list = jsonLd(first.html).find(n => n['@type'] === 'CollectionPage').mainEntity;
  assert.equal(list.numberOfItems, 24);
  assert.equal(list.itemListElement.length, 24);
  assert.equal((await get('/sr/katalog?page=999999')).response.status, 404);
  const filtered = await get('/sr/katalog?q=Bosch&page=1');
  assert.equal(filtered.response.status, 200);
  assert.match(tag(filtered.html, 'robots'), /noindex/);
  assert.equal(canonical(filtered.html), origin + '/sr/katalog');
  assert.ok(filtered.html.includes('q=Bosch'));
});

test('Rental content, Cyrillic and common aliases resolve to the right tool', async () => {
  for (const [query, slug] of [['жирафа', 'zirafa-za-brusenje-zidova'], ['stemarica', 'pikamer-stemerica'], ['fleks', 'ugaona-brusilica'], ['pegla za cevi', 'varilica-za-plasticne-vodovodne-cevi']]) {
    const { html } = await get('/sr/katalog?q=' + encodeURIComponent(query));
    assert.ok(html.includes('href="/sr/alat/' + selectedSlug(slug) + '"'), query);
  }
  const { html } = await get('/sr/alat/zirafa-za-brusenje-zidova');
  assert.ok(html.includes('Opiši sloj koji brusiš, površinu i visinu plafona.'));
  assert.ok(html.includes('href="/sr/saveti/zirafa-i-usisivac-za-zidove"'));
  assert.ok(html.includes('Obrenovac, Sremčicu i Železnik'));
  assert.ok(!html.includes('Beogradu i okolini'));
});

test('Custom descriptions survive enrichment; JSON-LD escapes admin-provided markup', async () => {
  const original = read('tools', active[0].id);
  const custom = 'Poseban opis </script><script>alert(1)</script> iz administratora.';
  try {
    write('tools', original.id, { ...original, description: { ...original.description, sr: custom } });
    const { html } = await get('/sr/alat/' + original.slug);
    assert.equal(jsonLd(html).find(node => node['@type'] === 'Service').description, custom);
    assert.ok(!html.includes('</script><script>alert(1)</script>'));
  } finally { write('tools', original.id, original); }
});

test('Missing or invalid public origins keep previews noindex; configured business contact is emitted without fabricated data', async () => {
  const original = read('settings', 'main');
  try {
    for (const siteUrl of ['http://example.com', 'https://localhost', 'not-a-url', 'https://example.com/extra', 'https://user:pass@example.com']) {
      write('settings', 'main', { ...original, siteUrl });
      assert.match(tag((await get('/sr')).html, 'robots'), /noindex/);
      assert.ok(!(await get('/sitemap.xml')).html.includes('<loc>'));
      assert.match((await get('/robots.txt')).html, /Disallow: \/\s/);
    }
    write('settings', 'main', { ...original, siteUrl: origin + '/', address: 'Test adresa 10', phone: '+381600000000' });
    const { html } = await get('/sr/kontakt');
    assert.equal(canonical(html), origin + '/sr/kontakt');
    const business = jsonLd(html).find(node => node['@type'] === 'LocalBusiness');
    assert.equal(business.address.streetAddress, 'Test adresa 10');
    assert.equal(business.telephone, '+381600000000');
    assert.equal(business.geo, undefined);
    const robots = (await get('/robots.txt')).html;
    assert.match(robots, /Sitemap: https:\/\/seo.example\/sitemap.xml/);
    assert.ok(!robots.includes('/nalog'), 'Crawlers need access to read noindex');
  } finally { write('settings', 'main', original); }
});


test('Guides publish only real Serbian pages and link to published equipment with current prices', async () => {
  const { html: hub } = await get('/sr/saveti');
  const paths = [...new Set([...hub.matchAll(/href="(\/sr\/saveti\/[^"?]+)"/g)].map(m => m[1]))];
  const legacySlugs = ['vibro-ploca-ili-vibro-zaba', 'kako-izabrati-merdevine', 'zirafa-i-usisivac-za-zidove', 'dubinsko-pranje-namestaja-izbor-masine', 'cena-najma-alata-i-dostave'];
  assert.deepEqual([...paths].sort(), [...new Set([...legacySlugs, ...publishedGuides.map(guide => guide.slug)])].map(slug => '/sr/saveti/' + slug).sort());
  for (const path of paths) {
    const { response, html } = await get(path);
    assert.equal(response.status, 200);
    const article = jsonLd(html).find(n => n['@type'] === 'Article');
    assert.equal(article.url, origin + path);
    assert.equal(article.inLanguage, 'sr-Latn');
    const expected = publishedGuides.find(guide => path === '/sr/saveti/' + guide.slug);
    assert.equal(article.datePublished, expected?.publishedAt || '2026-10-14T12:00:00.000Z');
    assert.equal(article.dateModified, expected?.updatedAt || '2026-10-14T12:00:00.000Z');
    assert.equal(canonical(html), origin + path);
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
    if (expected) {
      assert.match(html, /<table>/);
      assert.match(html, /<th scope="col">/);
      assert.match(html, /<li>/);
      assert.match(html, /<h2>Izvori<\/h2>/);
      assert.ok(!html.includes('](https://'), 'Markdown links must render as actual links');
      assert.ok(!tag(html, 'robots')?.includes('noindex'));
      const sitemap = (await get('/sitemap.xml')).html;
      const node = sitemap.split('<url>').find(node => node.includes('<loc>' + origin + path + '</loc>'));
      assert.ok(node?.includes('<lastmod>' + expected.updatedAt + '</lastmod>'));
    }
    const links = [...new Set([...html.matchAll(/href="(\/sr\/alat\/[^"?]+)"/g)].map(m => m[1]))];
    assert.ok(links.length > 0, path);
    for (const link of links) assert.equal((await get(link)).response.status, 200, link);
    assert.equal((await get(path.replace('/sr/', '/en/'))).response.status, 404);
  }
  assert.equal((await get('/sr/saveti/nepoznato')).response.status, 404);
  const original = read('settings', 'main');
  try {
    write('settings', 'main', { ...original, standardDelivery: 1234, expressDelivery: 3456 });
    const html = (await get('/sr/saveti/cena-najma-alata-i-dostave')).html;
    assert.match(html, /1[.\s]234/);
    assert.match(html, /3[.\s]456/);
  } finally { write('settings', 'main', original); }
});

test('Priority content preserves a custom model name and custom description', async () => {
  const original = read('tools', 'crafter-20586');
  const name = 'Naše posebne merdevine';
  const description = 'Tačan opis koji je vlasnik uneo u administratoru.';
  try {
    write('tools', original.id, { ...original, name: { ...original.name, sr: name }, description: { ...original.description, sr: description } });
    const html = (await get('/sr/alat/' + original.slug)).html;
    assert.ok(html.includes(name));
    assert.equal(jsonLd(html).find(n => n['@type'] === 'Service').description, description);
  } finally { write('tools', original.id, original); }
});
