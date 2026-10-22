'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { Bundle } from '@/lib/commerce/types';
import type { Tool, Locale } from '@/lib/types';
import { ct } from '@/lib/commerce/copy';
import { kitDetails } from '@/lib/commerce/kits';
import { formatToolAmount } from '@/lib/catalog-pricing.mjs';
import { useCart } from './CartProvider';
import { ArrowRight, PackagePlus, ShoppingBag, SlidersHorizontal } from 'lucide-react';
import ToolArt from '../ToolArt';
export default function Bundles({ bundles, tools, locale }: { bundles: Bundle[]; tools: Tool[]; locale: Locale }) {
  const cart = useCart();
  const [group, setGroup] = useState('Sve');
  const sr = locale === 'sr';
  const groups = ['Sve', ...new Set(bundles.map(b => kitDetails(b.id).group))];
  const groupNames: Record<string, string> = { Sve: 'All jobs', Renoviranje: 'Renovation', 'Drvo i montaža': 'Wood & assembly', Dvorište: 'Garden', Čišćenje: 'Cleaning', 'Instalacije i metal': 'Plumbing & metal', 'Ostali poslovi': 'Other jobs' };
  const shown = bundles.filter(b => group === 'Sve' || kitDetails(b.id).group === group);
  return <section className="container commerce-page">
    <div className="kits-heading">
      <div><span className="eyebrow">{sr ? 'Jedan posao. Ceo komplet.' : 'One project. The whole kit.'}</span><h1>{ct(locale, 'packages')}</h1><p>{sr ? 'Izaberi posao koji planiraš. Dodaj komplet alata, pa u korpi prilagodi količine i termine.' : 'Choose your project, add a kit, then adjust quantities and dates in your cart.'}</p></div>
      <div className="kits-count"><strong>{bundles.length}</strong><span>{sr ? 'kompleta za tvoj posao' : 'kits for your project'}</span></div>
    </div>
    <div className="kit-filters" aria-label={sr ? 'Vrsta posla' : 'Project type'}>{groups.map(g => <button type="button" key={g} className={g === group ? 'active' : ''} aria-pressed={g === group} onClick={() => setGroup(g)}>{sr ? g === 'Sve' ? 'Svi poslovi' : g : groupNames[g]}</button>)}</div>
    <div className="kit-results"><span>{shown.length} {sr ? 'paketa' : 'kits'}</span><span><SlidersHorizontal size={15} />{sr ? 'Svaki komplet možeš prilagoditi' : 'Every kit is adjustable'}</span></div>
    <div className="bundle-grid">
      {!bundles.length && <p>{ct(locale, 'noPackages')}</p>}
      {shown.map(b => {
        const selected = b.toolIds.map(id => tools.find(t => t.id === id)).filter((t): t is Tool => !!t);
        const euro = selected.every(t => t.priceEur != null);
        const total = selected.every(t => t.price !== null) ? selected.reduce((n, t) => n + (euro ? t.priceEur! : t.price!), 0) : null;
        const details = kitDetails(b.id);
        return <article className="commerce-card bundle-card job-kit" key={b.id}>
          <div className="kit-art">{selected.slice(0, 3).map(t => <ToolArt key={t.id} image={t.image} name={t.name[locale]} />)}<span className="kit-badge">{b.discount}% {sr ? 'paket popust' : 'kit discount'}</span></div>
          <div className="kit-content"><span className="kit-category">{sr ? details.group : groupNames[details.group]}</span><h2>{b.name}</h2><p>{b.description}</p>
          <ul>{selected.map(t => <li key={t.id}><Link href={`/${locale}/alat/${t.slug}`}>{t.name[locale]} ↗</Link></li>)}</ul>
          {!!details.supplies.length && <details className="kit-supplies"><summary><ShoppingBag size={16} />{sr ? 'Šta još pripremiti za posao' : 'What else to prepare'}</summary><ul>{details.supplies.map(s => <li key={s}>{s}</li>)}</ul><p>{sr ? 'Lista za planiranje; nije uključena u cenu ni u korpu. Dostupnost, kompatibilnost i cenu materijala proveri sa nama.' : 'Planning list only; not included in the price or cart. Ask us about availability, compatibility and supply pricing.'}</p></details>}
          <div className="kit-price">{total === null ? <strong>{sr ? 'Cena na upit' : 'Price on request'}</strong> : <><span>{sr ? 'Redovna cena kompleta / dan' : 'Standard kit price / day'}</span><div><strong>{formatToolAmount({ price: total, priceEur: euro ? total : null }, total, locale)}</strong></div></>}<small>{sr ? 'Popust, konačna cena i dostupnost u korpi.' : 'Discount, final pricing and availability in the cart.'}</small></div>
          <button className="button button-lime" onClick={() => cart.add(b.toolIds.map(toolId => ({ toolId, quantity: 1, start: cart.items[0]?.start || '', end: cart.items[0]?.end || '' })))}><PackagePlus size={18} />{sr ? 'Dodaj ceo komplet' : 'Add the whole kit'}</button>
          </div>
        </article>;
      })}
    </div>
    <div className="kit-footer"><div><h2>{sr ? 'Nisi siguran šta ti treba?' : 'Not sure what you need?'}</h2><p>{sr ? 'Opiši podlogu, površinu i posao. Pomoći ćemo ti da izabereš alat i proveriš potrebne dodatke.' : 'Tell us about the material, area and project. We can help choose tools and check the accessories.'}</p><p className="small-muted">{ct(locale, 'clubRule')}</p></div><Link className="button button-dark" href={`/${locale}/kontakt`}>{sr ? 'Sastavimo tvoj komplet' : 'Build your kit'}<ArrowRight size={18} /></Link></div>
  </section>;
}
