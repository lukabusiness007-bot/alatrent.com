import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderEmail } from '../lib/email/templates.ts';

const dir = resolve('output/email-preview');
await mkdir(dir, { recursive: true });
for (const kind of ['contact-received', 'club-welcome', 'rental-received']) {
  const rendered = renderEmail({ kind, locale: 'sr', name: 'Marko', reference: 'CT-DEMO-2026', discount: 5, threshold: 3 });
  await writeFile(resolve(dir, kind + '.html'), rendered.html);
  await writeFile(resolve(dir, kind + '.txt'), rendered.text);
}
await writeFile(resolve(dir, 'index.html'), `<!doctype html><html lang="sr-Latn"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Alat Rent · Pregled automatskih mejlova</title><style>body{margin:0;padding:24px;background:#111412;color:#f6f7f3;font-family:Arial,sans-serif}h1{font-size:24px;margin:0 0 8px}p{color:#7bc8c5}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}iframe{width:100%;height:1050px;border:0;border-radius:12px;background:#f6f7f3}h2{font-size:16px;color:#d8ff3e}@media(max-width:1000px){main{grid-template-columns:1fr}}</style><h1>Alat Rent · Automatski mejlovi</h1><p>Potvrda upita, dobrodošlica u klub i prijem zahteva za najam.</p><main>${[['contact-received','Kontakt forma'],['club-welcome','Klub majstora'],['rental-received','Zahtev za najam']].map(([id,title])=>`<section><h2>${title}</h2><iframe title="${title}" src="${id}.html"></iframe></section>`).join('')}</main></html>`);
console.log(dir);
