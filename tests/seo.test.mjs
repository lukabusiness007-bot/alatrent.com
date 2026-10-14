import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const dir = mkdtempSync(join(tmpdir(), 'rent-seo-test-'));
const base = 'http://127.0.0.1:3014';
const origin = 'https://seo.example';
const seed = JSON.parse(readFileSync(new URL('../lib/seed.json', import.meta.url)));
const reduction = JSON.parse(readFileSync(new URL('../lib/catalog-reduction.json', import.meta.url)));
const active = seed.tools.filter(t=>t.published);
const selectedSlug = old => {const e=reduction.entries.find(e=>e.slug===old);return e?.replacementId?seed.tools.find(t=>t.id===e.replacementId).slug:old;};
const content = JSON.parse(readFileSync(new URL('../lib/seo-catalog.json', import.meta.url)));
const locales = ['sr', 'en', 'ru', 'tr', 'zh'];
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

test('Crawl every sitemap URL: 200, one H1, unique metadata, canonical, reciprocal hreflang and parseable JSON-LD', async () => {
  const { html: xml } = await get('/sitemap.xml');
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.equal(urls.length, (6 + active.length + seed.categories.length) * locales.length + 6);
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
      }
    }
  }
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
  assert.equal(paths.length, 5);
  for (const path of paths) {
    const { response, html } = await get(path);
    assert.equal(response.status, 200);
    const article = jsonLd(html).find(n => n['@type'] === 'Article');
    assert.equal(article.url, origin + path);
    assert.equal(article.inLanguage, 'sr-Latn');
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
