import Link from 'next/link';
import { money } from '@/lib/i18n';
import { guideHub, guideDateLabel, rentalGuides, type RentalGuide } from '@/lib/rental-guides';
import { siteOrigin } from '@/lib/site-url';
import type { PublicData } from '@/lib/types';
import { BreadcrumbSchema, JsonLd } from './Seo';
import ToolArt from './ToolArt';
import { GuideContent, GuideText } from './GuideContent';
import { brandName } from '@/lib/brand';

export function GuideCards({ compact = false, headingLevel = 3 }: { compact?: boolean; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return <div className="guide-grid">{(compact ? [...rentalGuides].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 3) : [...rentalGuides].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))).map(guide => <Link className="guide-card" key={guide.slug} href={'/sr/saveti/' + guide.slug}>
    <span className="eyebrow">Izbor i iznajmljivanje</span><Heading>{guide.title}</Heading><p>{guide.description}</p><span className="text-link">Pročitaj savet →</span>
  </Link>)}</div>;
}
export function GuidesHomeSection() {
  return <section className="section"><div className="container"><div className="section-head"><span className="eyebrow">Pre iznajmljivanja</span><h2>Koji alat da iznajmiš za svoj posao?</h2><p>Pročitaj savete za izbor žirafe za zidove, mašine za dubinsko pranje, vibro ploče i druge opreme. Proveri namenu, potrebne dodatke i obračun cene iznajmljivanja pre slanja upita.</p></div><GuideCards compact /><Link className="text-link" href="/sr/saveti">Svi saveti za izbor i iznajmljivanje alata →</Link></div></section>;
}
export function RentalGuidesPage({ data, guide }: { data: PublicData; guide?: RentalGuide }) {
  const base = siteOrigin(data.settings);
  const path = 'saveti' + (guide ? '/' + guide.slug : '');
  const tools = guide ? data.tools.filter(tool => guide.toolIds.includes(tool.id)) : [];
  return <>
    <BreadcrumbSchema settings={data.settings} locale="sr" items={[{ name: 'Početna', path: '' }, { name: 'Saveti', path: 'saveti' }, ...(guide ? [{ name: guide.title, path }] : [])]} />
    {guide && base && <JsonLd value={{ '@context': 'https://schema.org', '@type': 'Article', headline: guide.title, description: guide.description, url: base + '/sr/' + path, inLanguage: 'sr-Latn', datePublished: guide.publishedAt, dateModified: guide.updatedAt, author: { '@type': 'Organization', '@id': base + '/#organization', name: brandName(data.settings.brand) }, publisher: { '@id': base + '/#organization' }, mainEntityOfPage: base + '/sr/' + path }} />}
    <section className="section"><div className="container">
      <nav className="breadcrumbs" aria-label="Putanja"><Link href="/sr">Početna</Link><span>/</span>{guide ? <Link href="/sr/saveti">Saveti</Link> : <span>Saveti</span>}</nav>
      <div className="guide-heading"><span className="eyebrow">Izbor i iznajmljivanje alata</span><h1>{guide?.title || guideHub.title}</h1><p><GuideText text={guide?.intro || guideHub.description} /></p></div>
      {guide ? <>
        <article className="guide-body"><p className="guide-byline">Pripremio {brandName(data.settings.brand)} · Objavljeno <time dateTime={guide.publishedAt}>{guideDateLabel(guide.publishedAt)}</time>{guide.updatedAt !== guide.publishedAt && <> · Ažurirano <time dateTime={guide.updatedAt}>{guideDateLabel(guide.updatedAt)}</time></>}</p>{guide.blocks ? <GuideContent blocks={guide.blocks} /> : guide.sections?.map(section => <section key={section.heading}><h2>{section.heading}</h2><p>{section.text}</p></section>)}
          {guide.slug === 'cena-najma-alata-i-dostave' && <section><h2>Trenutne osnovne cene dostave</h2><dl className="guide-rates"><dt>Standardna dostava</dt><dd>{money(data.settings.standardDelivery, 'sr')}</dd><dt>Ekspres dostava</dt><dd>{money(data.settings.expressDelivery, 'sr')}</dd></dl><p>Opciju, adresu i termin proveravamo pri potvrdi iznajmljivanja. <Link href="/sr/dostava">Detalji dostave →</Link></p></section>}
        </article>
        {tools.length > 0 && <section className="guide-related"><h2>Oprema iz kataloga za ovaj posao</h2><p>Cene i uslove proveri na stranici alata. Dostupnost se potvrđuje za traženi termin.</p><div className="guide-grid">{tools.map(tool => <Link className="guide-card" href={'/sr/alat/' + tool.slug} key={tool.id}><ToolArt image={tool.image} name={tool.name.sr} /><h3>{tool.name.sr}</h3><p>{tool.price === null ? 'Cena na upit' : money(tool.price, 'sr') + ' / dan'}</p><span className="text-link">Proveri iznajmljivanje →</span></Link>)}</div></section>}
        <div className="seo-links"><Link href="/sr/saveti">Svi saveti</Link><Link href="/sr/katalog">Katalog alata</Link><Link href="/sr/kontakt">Pošalji upit</Link></div>
      </> : <GuideCards headingLevel={2} />}
    </div></section>
  </>;
}
