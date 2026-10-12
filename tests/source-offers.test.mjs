import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = name => JSON.parse(readFileSync(new URL(name, import.meta.url)));
const { offers } = read('../lib/catalog-source-offers.json');
const coverage = read('../research/catalog-2026-10-12/coverage.json');
const seed = read('../lib/seed.json');

test('Source capture covers all loaded profile listings and keeps only eligible equipment', () => {
  assert.equal(coverage.profileCount, 73);
  assert.equal(coverage.sourceCounts['pozajmime.rs'].captured, 73);
  assert.equal(coverage.sourceCounts['iznajmialat.rs'].captured, 47);
  assert.equal(new Set(offers.map(o => o.id)).size, offers.length);
  assert.ok(offers.every(o => o.url.startsWith('https://') && o.observedAt === '2026-10-12'));
  assert.ok(offers.every(o => o.toolIds.every(id => seed.tools.some(t => t.id === id))));
  assert.ok(offers.filter(o => o.kind === 'rental').every(o => o.toolIds.length));
  assert.ok(!offers.some(o => /bager|utovarivač|damper|tandem.*valjak|BobCat/i.test(o.name)));
  assert.ok(coverage.excluded.some(o => /bager/i.test(o.name)));
});

test('Currencies, monthly and meter rates, services and inquiry prices keep their original meaning', () => {
  assert.ok(offers.filter(o => o.source === 'iznajmialat.rs').every(o => !o.prices.length && /upit/i.test(o.priceText)));
  const props = offers.find(o => o.name === 'Podupirace');
  assert.deepEqual(props.prices.map(p => [p.amount, p.currency, p.unit]), [[1.5, 'EUR', 'month/item']]);
  const chute = offers.find(o => o.kind === 'rental' && o.name === 'Levak za sut');
  assert.equal(chute.prices[0].unit, 'day/meter');
  const sandblaster = offers.find(o => o.name === 'Peskara');
  assert.equal(sandblaster.prices[0].amount, 60);
  assert.equal(sandblaster.prices[0].currency, 'EUR');
  assert.ok(offers.filter(o => o.source === 'beodetect.com').every(o => o.kind !== 'rental' && o.prices.every(p => p.unit !== 'day')));
  assert.ok(offers.some(o => o.kind === 'sale' && o.prices[0]?.unit === 'sale'));
});

test('Gross rent, wear charges, discounts and conflicting source prices are captured separately', () => {
  const saw = offers.find(o => o.source === 'pozajmime.rs' && /Podni sekač/.test(o.name));
  assert.equal(saw.prices[0].amount, 4560);
  assert.equal(saw.prices[0].vat, 'included');
  assert.match(saw.discrepancy, /1\.560.*4\.560/);
  assert.ok(saw.priceNotes.some(note => /4\.200.*\/ mm/.test(note)));
  const generator = offers.find(o => o.source === 'pozajmime.rs' && /Agregat 40/.test(o.name));
  assert.ok(generator.prices.some(p => p.label === '7+ dana' && p.amount === 4580));
  assert.ok(generator.prices.some(p => p.label === '30+ dana' && p.amount === 4261));
  assert.ok(generator.depositText.includes('80.000'));
});
