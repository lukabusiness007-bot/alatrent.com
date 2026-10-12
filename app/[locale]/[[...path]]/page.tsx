import { notFound } from 'next/navigation';
import Link from 'next/link';
import { copy, href, isLocale } from '@/lib/i18n';
import { publicData, all } from '@/lib/db';
import { config, options } from '@/lib/commerce/data';
import { hashToken } from '@/lib/auth';
import { publicOrder } from '@/lib/commerce/orders';
import type { Bundle, Order } from '@/lib/commerce/types';
import { ct } from '@/lib/commerce/copy';
import { rt } from '@/lib/commerce/referral-copy';
import CartPage from '@/components/commerce/CartPage';
import Account from '@/components/commerce/Account';
import Club from '@/components/commerce/Club';
import Bundles from '@/components/commerce/Bundles';
import OrderDetails from '@/components/commerce/OrderDetails';
import { seo } from '@/lib/seo';
import { pageCopy } from '@/lib/seo-pages';
import { toolHeading, toolDescription, categoryHeading, categoryDescription } from '@/lib/seo-content';
import { BreadcrumbSchema, ToolSchema } from '@/components/Seo';
import { ToolRentalContent } from '@/components/ToolRentalContent';
import { today } from '@/lib/validation';
import { Home, Catalog, Steps, Delivery, Faq, Cta, ToolCard } from '@/components/Store';
import ToolArt from '@/components/ToolArt';
import RentalForm from '@/components/RentalForm';
import {
  ArrowRight,
  Check,
  ChevronDown,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Truck,
} from '@/components/Icons';
type Props = {
  params: Promise<{ locale: string; path?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export async function generateMetadata({ params, searchParams }: Props) {
  const { locale, path = [] } = await params;
  if (!isLocale(locale)) return {};
  const t = copy[locale];
  const data = publicData();
  const key = path[0] || '';
  const tool = ['alat', 'uputstvo'].includes(key) && path.length === 2 ? data.tools.find(t => t.slug === path[1]) : undefined;
  const category = key === 'kategorija' && path.length === 2 ? data.categories.find(c => c.slug === path[1]) : undefined;
  const pages = pageCopy(locale);
  if (key === 'najam') return { title: ct(locale, 'track'), robots: { index: false, follow: false }, referrer: 'no-referrer' as const };
  const query = await searchParams;
  const valid = !path.length || (path.length === 1 && key in pages) || !!tool || !!category;
  if (!valid) return { title: t.notFound, robots: { index: false, follow: true } };
  const instructions = key === 'uputstvo';
  // Operational instructions are not localized and may only contain a placeholder. Keep them out of Search.
  const noindex = ['korpa', 'nalog', 'privatnost'].includes(key) || instructions || !!query.q || !!query.sort
    || (!!category && !data.tools.some(t => t.categoryId === category.id));
  const title = tool
    ? instructions ? `${ct(locale, 'instructions')}: ${tool.name[locale]}` : `${toolHeading(tool, locale)} — ${locale === 'sr' ? 'Beograd' : t.area}`
    : category ? `${categoryHeading(category, locale)} — ${locale === 'sr' ? 'Beograd' : t.area}` : pages[key].title;
  const description = tool
    ? locale === 'sr'
      ? `${toolHeading(tool, locale)} u Beogradu, bez depozita. ${tool.price === null ? 'Zatraži cenu' : 'Pogledaj dnevnu cenu'}, proveri namenu i pošalji upit za termin i dostavu.`
      : `${tool.name[locale]} — ${t.categorySeo}. ${t.depositNote} ${t.requestHint}`
    : category ? `${category.name[locale]} — ${t.categorySeo}. ${categoryDescription(category, locale)}` : pages[key].description;
  return seo(locale, path.join('/'), title, description, noindex,
    tool?.image ? { url: tool.image, alt: tool.name[locale] } : undefined);

}
export default async function Page({ params, searchParams }: Props) {
  const { locale, path = [] } = await params;
  if (!isLocale(locale)) notFound();
  const data = publicData(),
    t = copy[locale];
  const key = path[0] || '';
  const q = await searchParams;
  if (path.length > 2) notFound();
  const cfg = config();
  if (path.length === 1 && key === 'korpa') return <CartPage locale={locale} data={data} today={today()} referralProgram={{...cfg.referralProgram,memberIds:[]}} creditLimit={cfg.creditLimitPercent} recommendations={Object.fromEntries(data.tools.map(t => [t.id, options(t.id).relatedIds]))} />;
  if (path.length === 1 && key === 'klub') return <Club locale={locale} threshold={cfg.clubThreshold} percent={cfg.clubPercent} referralProgram={{...cfg.referralProgram,memberIds:[]}} />;
  if (path.length === 1 && key === 'nalog') return <Account key={q.mode === 'register' ? 'register' : 'login'} initialMode={q.mode === 'register' ? 'register' : 'login'} claimToken={typeof q.claim === 'string' && q.claim.length === 64 ? q.claim : undefined} locale={locale} reviewUrl={cfg.reviewUrl} />;
  if (path.length === 1 && key === 'paketi') return <Bundles locale={locale} tools={data.tools} bundles={all<Bundle>('bundles').filter(b => b.published && b.toolIds.every(id => data.tools.some(t => t.id === id)))} />;
  if (key === 'najam' && path.length === 2) {
    const order = path[1]?.length === 64 ? all<Order>('orders').find(o => o.accessHash === hashToken(path[1])) : undefined;
    if (!order) notFound();
    return <section className="container commerce-page"><OrderDetails initial={publicOrder(order)} token={path[1]} locale={locale} reviewUrl={cfg.reviewUrl} /></section>;
  }
  if (!key) return <Home locale={locale} data={data} />;
  if (key === 'katalog' || key === 'kategorija') {
    const category =
      key === 'kategorija' ? data.categories.find((c) => c.slug === path[1]) : undefined;
    if ((key === 'kategorija' && !category) || (key === 'katalog' && path.length !== 1)) notFound();
    return (
      <Catalog
        locale={locale}
        data={data}
        category={category}
        q={typeof q.q === 'string' ? q.q.slice(0, 150) : ''}
        sort={typeof q.sort === 'string' ? q.sort : 'name'}
      />
    );
  }
  if (key === 'uputstvo' && path.length === 2) {
    const tool = data.tools.find(t => t.slug === path[1]);
    if (!tool) notFound();
    const guide = options(tool.id);
    return <section className="container commerce-page"><div className="commerce-heading"><span className="eyebrow">{ct(locale,'instructions')}</span><h1>{tool.name[locale]}</h1><p>{guide.model}</p></div><article className="commerce-card"><p className="instruction-text">{guide.instructions || ct(locale,'noInstructions')}</p><div className="button-row">{guide.manualUrl && <a className="button button-plain" href={guide.manualUrl} target="_blank" rel="noreferrer">{ct(locale,'manual')} ↗</a>}{guide.videoUrl && <a className="button button-plain" href={guide.videoUrl} target="_blank" rel="noreferrer">{ct(locale,'video')} ↗</a>}</div></article><Link className="text-link" href={href(locale,'alat/'+tool.slug)}>{tool.name[locale]} →</Link></section>;
  }
  if (key === 'alat') {
    const tool = data.tools.find((t) => t.slug === path[1]);
    if (!tool) notFound();
    const category = data.categories.find((c) => c.id === tool.categoryId);
    return (
      <>
        <ToolSchema tool={tool} data={data} locale={locale} />
        <BreadcrumbSchema settings={data.settings} locale={locale} items={[
          { name: t.home, path: '' },
          { name: t.catalog, path: 'katalog' },
          ...(category ? [{ name: category.name[locale], path: 'kategorija/' + category.slug }] : []),
          { name: tool.name[locale], path: 'alat/' + tool.slug },
        ]} />
        <div className="container product-page">
          <nav className="breadcrumbs" aria-label={t.navigation}>
            <Link href={href(locale)}>{t.home}</Link>
            <span>/</span>
            <Link href={href(locale, 'kategorija/' + category?.slug)}>
              {category?.name[locale]}
            </Link>
          </nav>
          <div className="product-grid">
            <div className="product-info">
              <span className="eyebrow">{category?.name[locale]}</span>
              <h1>{toolHeading(tool, locale)}</h1>
              <div className="product-picture">
                <ToolArt
                  category={category?.icon}
                  image={tool.image}
                  name={tool.name[locale]}
                  large
                />
              </div>
              {tool.image.startsWith("/images/catalog/") ? <p className="image-caption">{t.photoNote}</p> : !tool.image && <p className="image-caption">{t.illustration}</p>}
              <div className="product-copy">
                <h2>{t.aboutTool}</h2>
                <p>{toolDescription(tool, locale)}</p>
                <h2>{t.specs}</h2>
                <ul className="check-list">
                  <li>
                    <Check size={18} />
                    {t.availability}
                  </li>
                  <li>
                    <Check size={18} />
                    {t.priceDisclaimer}
                  </li>
                  <li>
                    <Truck size={18} />
                    {t.area} · {t.delivery}
                  </li>
                  <li>
                    <ShieldCheck size={18} />
                    {t.depositNote}
                  </li>
                </ul>
              </div>
            </div>
            <RentalForm tool={tool} locale={locale} settings={data.settings} today={today()} rule={options(tool.id).rule || cfg.categories[tool.categoryId] || cfg.rule} />
          </div>
        </div>
        <ToolRentalContent tool={tool} locale={locale} />
        {(['relatedIds', 'alternativeIds'] as const).map(kind => {
          const tools = data.tools.filter(t => options(tool.id)[kind].includes(t.id));
          return tools.length ? <section className="section service-section" key={kind}><div className="container"><h2>{ct(locale, kind === 'relatedIds' ? 'more' : 'alternatives')}</h2><div className="tool-grid">{tools.map(t => <ToolCard key={t.id} tool={t} category={data.categories.find(c => c.id === t.categoryId)} locale={locale} />)}</div></div></section> : null;
        })}
        {data.tools.some((x) => x.categoryId === tool.categoryId && x.id !== tool.id) && (
          <section className="section service-section">
            <div className="container">
              <h2 className="related-title">{t.related}</h2>
              <div className="tool-grid">
                {data.tools
                  .filter((x) => x.categoryId === tool.categoryId && x.id !== tool.id)
                  .slice(0, 4)
                  .map((x) => (
                    <ToolCard key={x.id} tool={x} category={category} locale={locale} />
                  ))}
              </div>
            </div>
          </section>
        )}
      </>
    );
  }
  if (path.length !== 1) notFound();
  if (key === 'kako-funkcionise')
    return (
      <>
        <Steps locale={locale} primary />
        <Delivery locale={locale} settings={data.settings} />
        <Faq locale={locale} />
        <Cta locale={locale} />
      </>
    );
  if (key === 'dostava')
    return (
      <>
        <Delivery locale={locale} settings={data.settings} primary />
        <Faq locale={locale} />
        <Cta locale={locale} />
      </>
    );
  if (key === 'kontakt')
    return (
      <>
        <section className="section contact-section">
          <div className="container contact-grid">
            <div>
              <span className="eyebrow">{t.area}</span>
              <h1>{t.contactTitle}</h1>
              <p>{t.contactText}</p>
              <Link className="button button-lime" href={href(locale, 'katalog')}>
                {t.browse}
                <ArrowRight size={19} />
              </Link>
            </div>
            <div className="contact-card">
              <MapPin size={30} />
              <h2>{t.area}</h2>
              <p>{data.settings.address || t.locationPending}</p>
              {data.settings.phone && (
                <a href={'tel:' + data.settings.phone.replace(/[^+\d]/g, '')}>
                  <Phone size={19} />
                  {data.settings.phone}
                </a>
              )}
              {data.settings.email && (
                <a href={'mailto:' + data.settings.email}>
                  <Mail size={19} />
                  {data.settings.email}
                </a>
              )}
              <Link href={href(locale, 'dostava')}>
                <Truck size={19} />
                {t.delivery}
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>
        <Faq locale={locale} />
      </>
    );
  if (key === 'privatnost')
    return (
      <section className="section">
        <div className="container prose-page">
          <span className="eyebrow">{t.privacy}</span>
          <h1>{t.privacyTitle}</h1>
          <p>{t.privacyText}</p>
          <p>{rt(locale,'storage')}</p>
          {data.settings.email && (
            <a className="text-link" href={'mailto:' + data.settings.email}>
              {data.settings.email}
            </a>
          )}
        </div>
      </section>
    );
  notFound();
}
