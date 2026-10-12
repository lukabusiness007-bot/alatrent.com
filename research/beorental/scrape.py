"""Read public tool catalog pages; retain factual titles and source references only."""
import json
import re
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
BASE = 'https://beorental.com/'

def canonical(url):
    p = urlsplit(urljoin(BASE, url))
    return urlunsplit((p.scheme, p.netloc.replace('www.', ''), p.path.rstrip('/'), '', ''))

class Page(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.links, self.images, self.headings = set(), [], []
        self.active = None
        self.buffer = []
        self.title = ''
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'a' and a.get('href'):
            u = canonical(a['href'])
            if urlsplit(u).netloc == 'beorental.com':
                self.links.add(u)
        if tag == 'img' and a.get('alt'):
            self.images.append({'alt': a['alt'], 'url': urljoin(BASE, a.get('src', ''))})
        if tag in ('h1', 'title'):
            self.active, self.buffer = tag, []

    def handle_data(self, data):
        if self.active:
            self.buffer.append(data)

    def handle_endtag(self, tag):
        if tag == self.active:
            value = ' '.join(' '.join(self.buffer).split())
            if tag == 'title':
                self.title = value.split(' - BEORENTAL')[0]
            else:
                self.headings.append(value)
            self.active = None

def fetch(url):
    try:
        req = Request(url, headers={'User-Agent': 'CatalogResearch/1.0'})
        with urlopen(req, timeout=25) as response:
            body = response.read().decode('utf-8', errors='replace')
            page = Page(body)
            result = {'url': url, 'resolved_url': canonical(response.url), 'status': response.status,
                      'title': page.title, 'headings': page.headings}
        time.sleep(.2)
        return result, page
    except Exception as exc:
        return {'url': url, 'error': str(exc)}, None

def tool_url(url):
    return '/iznajmljivanje-alata/' in urlsplit(url).path

def main():
    home = Page((ROOT / 'home-source.html').read_text())
    links = {u for u in home.links if tool_url(u)}
    seen, rows = set(), []
    # Two discovery passes: category links and directly related tool pages.
    for _ in range(2):
        pending = sorted(links - seen)
        with ThreadPoolExecutor(max_workers=2) as pool:
            for row, page in pool.map(fetch, pending):
                seen.add(row['url'])
                rows.append(row)
                if page:
                    links.update(u for u in page.links if tool_url(u))
        print(f'Fetched {len(rows)} pages; discovered {len(links)} tool/category URLs', flush=True)
    result = {'source': BASE, 'retrieved_at': datetime.now(timezone.utc).isoformat(),
              'scope': 'Homepage and two passes of linked public tool/category pages. Not a verified physical stock count.',
              'pages': sorted(rows, key=lambda r: r['url']),
              'remaining_urls': sorted(links-seen),
              'homepage_image_evidence': home.images}
    (ROOT / 'source-pages.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
    for i, r in enumerate(result['pages']):
        print(i, r.get('title', r.get('error')), r['url'])

if __name__ == '__main__':
    main()
