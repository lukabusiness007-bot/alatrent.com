import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { safeGuideHref, parseGuideMarkdown, validatePublishedGuides, mergePublishedGuides } from '../lib/guide-publishing.mjs';

test('Editorial links cannot become script, credential-bearing, or protocol-relative URLs', () => {
  for (const href of ['javascript:alert(1)', 'data:text/html,hello', '//evil.example', 'https://user:password@evil.example', 'https://evil.example:8443/', '/\\evil.example', '/sr/%0dheader']) assert.equal(safeGuideHref(href), null, href);
  assert.equal(safeGuideHref('https://alatrent.rs/sr/saveti/izbor'), '/sr/saveti/izbor');
  assert.equal(safeGuideHref('https://www.bosch-professional.com/manual.pdf'), 'https://www.bosch-professional.com/manual.pdf');
  assert.throws(() => parseGuideMarkdown('# Izbor\n\n[Link](javascript:alert(1))\n\n## Dalje\n\nTekst.'), /Unsafe/);
});

test('Tables, checklists and source links survive staging as structured content', () => {
  const parsed = parseGuideMarkdown('# Izbor\n\nKratak odgovor.\n\n## Poređenje\n\n| Alat | Namena |\n| --- | --- |\n| A | Zid |\n\n1. Proveri materijal.\n2. Potvrdi model.\n\n## Izvori\n\n- [Uputstvo](https://example.com/manual)');
  assert.equal(parsed.title, 'Izbor');
  assert.equal(parsed.intro, 'Kratak odgovor.');
  assert.deepEqual(parsed.blocks.find(block => block.type === 'table').rows, [['A', 'Zid']]);
  assert.equal(parsed.blocks.filter(block => block.type === 'list').length, 2);
  assert.throws(() => parseGuideMarkdown('# Izbor\n\nOdgovor.\n\n| A | B |\n| --- | --- |\n| Jedno |'), /dimensions/);
  assert.throws(() => parseGuideMarkdown('# Izbor\n\nOdgovor.\n\n# Drugi naslov'), /Unsupported/);
});

test('Unpublished entries stay out of public inventory; dates and unique URLs are enforced', () => {
  const guide = { slug: 'izbor-opreme', status: 'published', title: 'Izbor', description: 'Praktičan izbor opreme.', intro: 'Počni od materijala.', toolIds: ['tool-1'], publishedAt: '2026-10-17T06:00:00Z', updatedAt: '2026-10-17T06:00:00Z', blocks: [{ type: 'paragraph', text: 'Pripremi opis posla.' }] };
  assert.deepEqual(validatePublishedGuides([{ status: 'draft', slug: 'tajni-nacrt' }, guide]), [guide]);
  assert.throws(() => validatePublishedGuides([guide, { ...guide }]), /duplicate/);
  assert.throws(() => validatePublishedGuides([{ ...guide, updatedAt: '2026-10-14T06:00:00Z' }]), /dates/);
  assert.throws(() => validatePublishedGuides([{ ...guide, blocks: [{ type: 'html', html: '<script>bad()</script>' }] }]), /Unknown/);
});

test('Staged publication references existing equipment and preserves separate article dates', () => {
  const entries = JSON.parse(readFileSync(new URL('../lib/published-rental-guides.json', import.meta.url), 'utf8'));
  const seed = JSON.parse(readFileSync(new URL('../lib/seed.json', import.meta.url), 'utf8'));
  for (const guide of validatePublishedGuides(entries)) {
    for (const id of guide.toolIds) assert.ok(seed.tools.some(tool => tool.id === id && tool.published), id);
    assert.ok(guide.blocks.some(block => block.type === 'table'), guide.slug);
    assert.ok(guide.blocks.some(block => block.type === 'list'), guide.slug);
    assert.ok(guide.blocks.some(block => block.type === 'heading' && block.text === 'Izvori'), guide.slug);
  }
});

test('Explicit legacy refresh keeps one URL and its first publication date', () => {
  const old = { slug: 'existing-guide', publishedAt: '2026-10-14T12:00:00.000Z', updatedAt: '2026-10-14T12:00:00.000Z' };
  const refresh = { ...old, title: 'Updated guide', description: 'Updated selection criteria.', intro: 'Start with the material.', toolIds: ['tool-1'], status: 'published', replacesLegacy: true, updatedAt: '2026-10-19T06:30:00Z', blocks: [{ type: 'paragraph', text: 'Check the complete kit.' }] };
  const result = mergePublishedGuides([old], [refresh]);
  assert.equal(result.length, 1);
  assert.equal(result[0].publishedAt, old.publishedAt);
  assert.equal(result[0].updatedAt, refresh.updatedAt);
  assert.throws(() => mergePublishedGuides([old], [{ ...refresh, publishedAt: refresh.updatedAt }]), /preserve/);
  assert.throws(() => mergePublishedGuides([old], [{ ...refresh, replacesLegacy: false }]), /preserve/);
  assert.throws(() => mergePublishedGuides([old], [{ ...refresh, updatedAt: old.updatedAt }]), /preserve/);
  assert.throws(() => mergePublishedGuides([old], [{ ...refresh, slug: 'unknown-guide' }]), /Unknown/);
  assert.deepEqual(mergePublishedGuides([old], [{ ...refresh, status: 'draft' }]), [old]);
});
