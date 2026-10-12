"""Read public tool categories with pagination; save factual titles and URLs only."""
import json
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, parse_qs
from urllib.request import Request, urlopen

BASE = 'https://dajnadan.rs/'
ROOT = Path(__file__).resolve().parent
CATEGORIES = ('gradevinski-alat', 'bastenski-alat', 'oprema-za-ciscenje', 'gradevinska-oprema')

class Catalog(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.pages, self.items = set(), []
        self.href, self.heading, self.buffer = '', False, []
        self.feed(html)
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'a':
            self.href = a.get('href', '')
            p = urlsplit(self.href)
            if p.path == '/oglasi' and parse_qs(p.query).get('category', [''])[0] in CATEGORIES:
                self.pages.add(urljoin(BASE, self.href))
        if tag == 'h3' and 'OglasCard_title' in a.get('class', ''):
            self.heading, self.buffer = True, []
    def handle_data(self, data):
        if self.heading: self.buffer.append(data)
    def handle_endtag(self, tag):
        if tag == 'h3' and self.heading:
            self.items.append({'title': ' '.join(''.join(self.buffer).split()), 'url': urljoin(BASE, self.href)})
            self.heading = False
        if tag == 'a': self.href = ''

def fetch(url):
    for attempt in range(3):
        try:
            with urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30) as response:
                page = Catalog(response.read().decode('utf-8'))
            time.sleep(.2)
            return {'url': url, 'items': page.items, 'pages': sorted(page.pages)}
        except Exception:
            if attempt == 2: raise
            time.sleep(1 + attempt)

def main():
    pending = {BASE + 'oglasi?category=' + c for c in CATEGORIES}
    seen, pages, items = set(), [], {}
    while pending:
        batch = sorted(pending - seen)
        if not batch: break
        if len(seen) + len(batch) > 40: raise RuntimeError('Unexpected pagination size')
        with ThreadPoolExecutor(max_workers=2) as pool: results = list(pool.map(fetch, batch))
        seen.update(batch)
        for row in results:
            category = parse_qs(urlsplit(row['url']).query)['category'][0]
            pages.append({'url': row['url'], 'count': len(row['items'])})
            for item in row['items']:
                if not urlsplit(item['url']).path.startswith('/iznajmi/'): raise ValueError('Unexpected listing URL')
                items[item['url']] = {**item, 'category': category}
        pending = {p for row in results for p in row['pages']} - seen
        print(f'{len(pages)} category pages; {len(items)} unique listings; {len(pending)} remaining pages', flush=True)
    report = {'source': BASE, 'retrieved_at': datetime.now(timezone.utc).isoformat(),
              'scope': list(CATEGORIES), 'pages': sorted(pages, key=lambda p: p['url']),
              'remaining_pages': sorted(pending), 'items': sorted(items.values(), key=lambda i: (i['category'], i['title']))}
    (ROOT / 'source-listings.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print('Saved', len(items), 'listing titles and references')

if __name__ == '__main__': main()
