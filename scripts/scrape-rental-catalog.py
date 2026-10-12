#!/usr/bin/env python3
"""Capture public rental offers, pagination, prices and source evidence.

Requires beautifulsoup4. First save the rendered PozajmiMe profile's articles as
output/catalog-scrape/pozajmime-listings.json (the profile is client-rendered).
Raw pages are cached under output/; reviewed results belong in research/.
This script never modifies inventory or turns service/sale prices into rentals.
"""
import concurrent.futures
import hashlib
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import urljoin
from bs4 import BeautifulSoup

CACHE = Path('output/catalog-scrape/pages')
CACHE.mkdir(parents=True, exist_ok=True)
PAGES, ERRORS = {}, []


def fetch(url):
    file = CACHE / (hashlib.sha256(url.encode()).hexdigest() + '.html')
    if not file.exists():
        result = subprocess.run(['curl', '-sSL', '--retry', '2', '--max-time', '40',
            '-A', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            '-w', '\n%{http_code}', url], capture_output=True)
        body, _, status = result.stdout.rpartition(b'\n')
        if result.returncode or status != b'200':
            raise RuntimeError(f'{url}: HTTP {status.decode()} / curl {result.returncode}')
        file.write_bytes(body)
    soup = BeautifulSoup(file.read_bytes(), 'html.parser')
    PAGES[url] = {'url': url, 'title': soup.title.get_text(' ', strip=True) if soup.title else '',
                  'sha256': hashlib.sha256(file.read_bytes()).hexdigest()}
    return soup


def batch(urls):
    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        jobs = {pool.submit(fetch, url): url for url in urls}
        for job in concurrent.futures.as_completed(jobs):
            url = jobs[job]
            try:
                results[url] = job.result()
            except Exception as e:
                ERRORS.append(str(e))
    return results


def price_lines(text):
    return [line.strip() for line in text.splitlines() if re.search(
        r'\d.*(?:RSD|EUR|eur|€|din\b)|(?:cena|depozit|najam|PDV|popust|po dogovoru|upit)', line, re.I)]


offers = []
# Crawl the complete catalog and all category pagination until no new list pages remain.
base = 'https://iznajmialat.rs'
queue = {base + '/index.php/katalog/vidi-sve'}
visited, cards = set(), {}
while queue:
    current = batch(sorted(queue - visited))
    visited.update(queue)
    queue = set()
    for url, soup in current.items():
        for a in soup.select('a[href]'):
            link = urljoin(base, a['href'])
            if re.search(r'/katalog/[^/?]+/\d', link):
                if a.select_one('.el-title'):
                    cards[link] = {'name': a.select_one('.el-title').get_text(' ', strip=True),
                        'summary': a.get_text(' ', strip=True), 'category': link.split('/')[5]}
            elif '/katalog/' in link and link not in visited:
                queue.add(link)
for url, soup in sorted(batch(sorted(cards)).items()):
    card = cards[url]
    body = soup.select_one('[itemprop="articleBody"]') or soup.select_one('article') or soup.select_one('main')
    text = body.get_text('\n', strip=True) if body else ''
    offers.append({'source': 'iznajmialat.rs', 'url': url, **card, 'detail': text,
        'priceEvidence': price_lines(text), 'priceStatus': 'inquiry' if 'Upit' in card['summary'] else 'published'})

# All ten rental categories, including individually excluded items for the audit.
base = 'https://rentmasina.rs/'
root = fetch(base + 'rucni-alat/')
cats = {urljoin(base, a['href']) for a in root.select('a[href]') if a.get_text(' ', strip=True) in
    ['Radovi na tlu', 'Bušenje i rušenje betona', 'Vibro mašine', 'Agregati i kompresori',
     'Rad na visini', 'Čišćenje', 'Ostalo', 'Baštenski program', 'Ručni alat', 'Potrošni materijal i sigurnosna  oprema']}
# Public WordPress inventory also exposes equipment pages omitted from the menu.
wp_pages = json.loads(Path('output/catalog-scrape/rentmasina-pages.json').read_text())
cats.update(p['link'] for p in wp_pages if p['id'] in [2435, 2356, 2291, 2222, 1750, 1407, 1345, 928, 836])
for url, soup in sorted(batch(sorted(cats)).items()):
    for card in soup.select('.elementor-widget-wrap'):
        prices = card.select('.elementor-button-text')
        if not prices or not any(re.search('Cena|cen[a-z]*', p.get_text(), re.I) for p in prices):
            continue
        headings = card.select('h2.elementor-heading-title')
        if not headings:
            continue
        text = card.get_text('\n', strip=True)
        offers.append({'source': 'rentmasina.rs', 'url': url, 'name': headings[0].get_text(' ', strip=True),
            'category': url.rstrip('/').split('/')[-1], 'detail': text, 'priceEvidence': price_lines(text),
            'priceStatus': 'published' if re.search(r'\d.*€', text) else 'inquiry'})
for page in wp_pages:
    if page['id'] not in [2435, 2356, 2291, 1750, 1407, 1345, 928, 836]:
        continue
    body = BeautifulSoup(page['content']['rendered'], 'html.parser')
    title = body.select_one('h1, h2, h3')
    offers.append({'source': 'rentmasina.rs', 'url': page['link'],
        'name': title.get_text(' ', strip=True) if title else page['title']['rendered'],
        'category': 'sale', 'detail': body.get_text('\n', strip=True),
        'priceEvidence': price_lines(body.get_text('\n', strip=True)), 'priceStatus': 'published'})

# Verify every profile listing against its public detail page, including tier prices.
profile = json.loads(Path('output/catalog-scrape/pozajmime-listings.json').read_text())
details = batch([row['url'] for row in profile['listings']])
for row in profile['listings']:
    soup = details.get(row['url'])
    text = soup.select_one('main').get_text('\n', strip=True) if soup and soup.select_one('main') else row['text']
    offers.append({'source': 'pozajmime.rs', 'url': row['url'], 'name': row['name'], 'category': 'Tenge Rent',
        'description': row['description'], 'detail': text, 'cardText': row['text'], 'priceEvidence': price_lines(text),
        'priceStatus': 'published'})

# The explicit article and full service price list; only the provider's own column.
base = 'https://beodetect.com'
article_url = base + '/detekcija/detekcija-curenja-vode-beograd-profesionalno-otkrivanje-curenja-vode'
pricing_url = base + '/kontakt/cenovnik'
pricing = fetch(pricing_url)
for table in pricing.select('table'):
    for tr in table.select('tbody tr'):
        cells = tr.select('td')
        if len(cells) < 2:
            continue
        offers.append({'source': 'beodetect.com', 'url': pricing_url, 'name': cells[0].get_text(' ', strip=True),
            'category': 'service', 'detail': tr.get_text('\n', strip=True),
            'priceEvidence': [cells[1].get_text(' ', strip=True)], 'euComparison': cells[2].get_text(' ', strip=True) if len(cells)>2 else '',
            'priceStatus': 'published' if re.search(r'\d', cells[1].get_text()) else 'inquiry'})
article = fetch(article_url)
body = article.select_one('[itemprop="articleBody"]')
article_text = body.get_text('\n', strip=True) if body else ''
equipment_pages = []
nav = article.select_one('nav')
equipment_urls = {urljoin(base, a['href']) for a in nav.select('a[href]')
    if a['href'].startswith(('/merenje/', '/snimanje/'))}
for url, soup in sorted(batch(sorted(equipment_urls)).items()):
    body = soup.select_one('[itemprop="articleBody"]') or soup.select_one('main')
    text = body.get_text('\n', strip=True) if body else ''
    equipment_pages.append({'url': url, 'title': PAGES[url]['title'], 'text': text,
        'priceEvidence': price_lines(text)})
Path('output/catalog-scrape/scraped-offers.json').write_text(json.dumps({
    'observedAt': '2026-10-12', 'profileCount': len(profile['listings']),
    'pages': sorted(PAGES.values(), key=lambda p:p['url']), 'errors': ERRORS, 'offers': offers,
    'beodetectArticle': {'url': article_url, 'priceEvidence': price_lines(article_text)},
    'equipmentPages': equipment_pages,
}, ensure_ascii=False, indent=2) + '\n')
from collections import Counter
print(json.dumps({'offers': dict(Counter(o['source'] for o in offers)), 'pages': len(PAGES), 'errors': ERRORS}, ensure_ascii=False))
