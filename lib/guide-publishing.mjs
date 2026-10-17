const origin = 'https://alatrent.rs';

export function safeGuideHref(value) {
  if (typeof value !== 'string' || /[\s\\\u0000-\u001f]/.test(value) || /%(?:0a|0d|5c)/i.test(value)) return null;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    return url.origin === origin ? url.pathname + url.search + url.hash : url.href;
  } catch { return null; }
}

function validateText(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Guide text must be nonempty.');
  for (const match of text.matchAll(/\[[^\]\n]+\]\(([^)]+)\)/g)) {
    if (!safeGuideHref(match[1])) throw new Error('Unsafe guide link: ' + match[1]);
  }
}

// This intentionally accepts the small editorial Markdown subset used by guides.
// Content becomes plain data and is rendered as React elements, never raw HTML.
export function parseGuideMarkdown(markdown) {
  const lines = markdown.replace(/\r\n?/g, '\n').trim().split('\n');
  if (!/^# [^#]/.test(lines[0] || '')) throw new Error('A guide needs one leading H1.');
  const title = lines.shift().slice(2).trim();
  const blocks = [];
  const isList = line => /^(?:- |\d+\. )/.test(line);
  const cells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
  while (lines.length) {
    const line = lines.shift().trim();
    if (!line) continue;
    if (/^# /.test(line) || /^#{4,}|^```|^>|^!</.test(line)) throw new Error('Unsupported guide block: ' + line);
    if (/^#{2,3} /.test(line)) {
      blocks.push({ type: 'heading', level: line.startsWith('### ') ? 3 : 2, text: line.replace(/^#+ /, '') });
    } else if (line.startsWith('|')) {
      const headers = cells(line);
      if (!lines.length || !cells(lines.shift()).every(cell => /^:?-{3,}:?$/.test(cell))) throw new Error('Malformed guide table separator.');
      const rows = [];
      while (lines[0]?.trim().startsWith('|')) rows.push(cells(lines.shift()));
      if (!rows.length || rows.some(row => row.length !== headers.length)) throw new Error('Malformed guide table dimensions.');
      blocks.push({ type: 'table', headers, rows });
    } else if (isList(line)) {
      const ordered = /^\d/.test(line);
      const items = [line.replace(/^(?:- |\d+\. )/, '')];
      while (lines.length && isList(lines[0].trim()) && /^\d/.test(lines[0].trim()) === ordered) items.push(lines.shift().trim().replace(/^(?:- |\d+\. )/, ''));
      blocks.push({ type: 'list', ordered, items });
    } else {
      const paragraph = [line];
      while (lines.length && lines[0].trim() && !/^#|^\||^```|^>|^!</.test(lines[0].trim()) && !isList(lines[0].trim())) paragraph.push(lines.shift().trim());
      blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
    }
  }
  if (blocks[0]?.type !== 'paragraph') throw new Error('A guide needs an opening answer.');
  const intro = blocks.shift().text;
  const guide = { title, intro, blocks };
  validateText(title); validateText(intro);
  validateGuideBlocks(blocks);
  return guide;
}

export function validateGuideBlocks(blocks) {
  if (!Array.isArray(blocks) || !blocks.length) throw new Error('Guide body is empty.');
  for (const block of blocks) {
    if (block.type === 'paragraph') validateText(block.text);
    else if (block.type === 'heading') {
      if (![2, 3].includes(block.level)) throw new Error('Invalid guide heading.');
      validateText(block.text);
    } else if (block.type === 'list') {
      if (typeof block.ordered !== 'boolean' || !Array.isArray(block.items) || !block.items.length) throw new Error('Invalid guide list.');
      block.items.forEach(validateText);
    } else if (block.type === 'table') {
      if (!Array.isArray(block.headers) || !block.headers.length || !Array.isArray(block.rows) || !block.rows.length) throw new Error('Invalid guide table.');
      block.headers.forEach(validateText);
      for (const row of block.rows) {
        if (!Array.isArray(row) || row.length !== block.headers.length) throw new Error('Invalid table row.');
        row.forEach(validateText);
      }
    } else throw new Error('Unknown guide block.');
  }
}

export function validatePublishedGuides(entries) {
  if (!Array.isArray(entries)) throw new Error('Guide publication data must be an array.');
  const slugs = new Set();
  const published = [];
  for (const entry of entries) {
    if (entry.status !== 'published') continue;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug) || slugs.has(entry.slug)) throw new Error('Invalid or duplicate guide slug.');
    slugs.add(entry.slug);
    ['title', 'description', 'intro'].forEach(key => validateText(entry[key]));
    if (!Array.isArray(entry.toolIds) || !entry.toolIds.length || entry.toolIds.some(id => typeof id !== 'string' || !id)) throw new Error('Guide needs equipment references.');
    const first = Date.parse(entry.publishedAt), last = Date.parse(entry.updatedAt);
    if (!Number.isFinite(first) || !Number.isFinite(last) || last < first) throw new Error('Invalid publication dates.');
    validateGuideBlocks(entry.blocks);
    published.push(entry);
  }
  return published;
}
