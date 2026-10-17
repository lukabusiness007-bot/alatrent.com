import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseGuideMarkdown, validatePublishedGuides } from '../lib/guide-publishing.mjs';

const [directory, releaseAt] = process.argv.slice(2);
if (!directory || !releaseAt || !Number.isFinite(Date.parse(releaseAt))) throw new Error('Usage: node scripts/stage-guide-publication.mjs PACKAGE_DIRECTORY RELEASE_ISO_TIME');
const read = name => JSON.parse(readFileSync(resolve(directory, name), 'utf8'));
const brief = read('brief.json'), review = read('review.json'), research = read('research.json');
if (brief.id !== review.id || brief.id !== research.id || review.status !== 'ready_to_publish' || review.internalReview.score < 90 || review.internalReview.hardFailures.length) throw new Error('Guide must pass the recorded publication review.');
if (review.publicationReadiness?.unresolvedCriticalQuestions?.length !== 0) throw new Error('Resolve critical publication questions first.');
if (brief.action !== 'new') throw new Error('Refreshes require an explicit diff against the existing guide, not a new URL.');
const markdown = readFileSync(resolve(directory, 'article.md'), 'utf8');
const parsed = parseGuideMarkdown(markdown);
if (parsed.title !== brief.title || brief.canonicalTarget !== '/sr/saveti/' + brief.slug) throw new Error('Title and canonical must match the brief.');
const seed = JSON.parse(readFileSync(new URL('../lib/seed.json', import.meta.url), 'utf8'));
for (const id of brief.toolIds) if (!seed.tools.some(tool => tool.id === id && tool.published)) throw new Error('Equipment reference is not published: ' + id);
for (const source of research.sources) if (source.access_status !== 'opened' || !markdown.includes(source.url)) throw new Error('Source evidence/citation missing: ' + source.id);
const file = new URL('../lib/published-rental-guides.json', import.meta.url);
const entries = JSON.parse(readFileSync(file, 'utf8'));
const existing = entries.find(entry => entry.slug === brief.slug);
const entry = { id: brief.id, slug: brief.slug, title: brief.title, description: brief.description, intro: parsed.intro, blocks: parsed.blocks, toolIds: brief.toolIds, status: 'published', publishedAt: existing?.publishedAt || releaseAt, updatedAt: releaseAt };
// A resumed run stages the same content without falsely advancing its dates.
if (existing && JSON.stringify({ ...existing, updatedAt: releaseAt }) === JSON.stringify(entry)) {
  console.log('Already staged without changes: ' + brief.slug);
} else {
  if (existing) throw new Error('Published guide changed: prepare an explicit refresh and preserve its publication date.');
  entries.push(entry);
  validatePublishedGuides(entries);
  const tmp = new URL('../lib/published-rental-guides.json.tmp', import.meta.url);
  writeFileSync(tmp, JSON.stringify(entries, null, 2) + '\n');
  JSON.parse(readFileSync(tmp, 'utf8'));
  renameSync(tmp, file);
  console.log('Staged for deployment, not yet verified live: ' + brief.slug);
}
