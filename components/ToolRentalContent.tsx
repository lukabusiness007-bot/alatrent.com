import Link from 'next/link';
import { copy, href } from '@/lib/i18n';
import { rentalQuestions } from '@/lib/seo-content';
import { rentalGuides } from '@/lib/rental-guides';
import type { Locale, Tool } from '@/lib/types';

export function ToolRentalContent({ tool, locale }: { tool: Tool; locale: Locale }) {
  const t = copy[locale];
  const guides = rentalGuides.filter(guide => guide.toolIds.includes(tool.id));
  return <section className="section seo-content"><div className="container faq-layout">
    <div className="section-head">
      <span className="eyebrow">{t.area}</span>
      <h2>{locale === 'sr' ? 'Šta treba znati pre najma?' : t.faqTitle}</h2>
      {locale === 'sr' && guides.map(guide => <p key={guide.slug}><Link href={'/sr/saveti/' + guide.slug}>{guide.title} →</Link></p>)}
      <div className="seo-links">
        <Link href={href(locale, 'dostava')}>{t.delivery}</Link>
        <Link href={href(locale, 'kako-funkcionise')}>{t.how}</Link>
        <Link href={href(locale, 'kontakt')}>{t.contact}</Link>
      </div>
    </div>
    <div>{rentalQuestions(tool, locale).map(item => <details className="rental-faq" key={item.question}>
      <summary>{item.question}<span>+</span></summary><p>{item.answer}</p>
    </details>)}</div>
  </div></section>;
}
